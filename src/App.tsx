import { useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { BreaMark } from "./components/BreaMark";
import { EmptyState } from "./components/EmptyState";
import { PersonCard } from "./components/PersonCard";
import { ProfileSetup } from "./components/ProfileSetup";
import { SearchForm } from "./components/SearchForm";
import { SignInScreen } from "./components/SignInScreen";
import {
  ensureCurrentProfile,
  searchNearbyPeople,
  sendConnectionRequest,
  updateCurrentProfile,
} from "./lib/api";
import type {
  BreaProfile,
  ConnectionUiState,
  PersonMatch,
  ProfileUpdateInput,
  SearchStatus,
} from "./types";

const DEFAULT_RADIUS_KM = 10;

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function App() {
  const auth = useAuth();
  const [profile, setProfile] = useState<BreaProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!auth.user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    void ensureCurrentProfile(auth.user)
      .then((nextProfile) => {
        if (!cancelled) setProfile(nextProfile);
      })
      .catch((error: unknown) => {
        if (!cancelled) setProfileError(readableError(error, "We could not load your profile."));
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.user]);

  if (auth.isLoading || profileLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream text-forest" role="status">
        <div className="text-center"><BreaMark /><p className="mt-5 text-sm text-moss">Preparing your private profile…</p></div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <SignInScreen
        linkedinEnabled={auth.linkedinEnabled}
        backendError={auth.error}
        onSignIn={auth.signInWithLinkedIn}
      />
    );
  }

  if (profileError || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-5 text-center text-ink">
        <div className="max-w-lg rounded-[2rem] bg-paper/70 p-8 shadow-card">
          <BreaMark />
          <h1 className="mt-7 text-2xl font-bold">Your profile could not be prepared</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#a44734]">{profileError ?? "No profile was returned."}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white">Retry</button>
            <button type="button" onClick={() => void auth.signOut()} className="rounded-full border border-forest/20 px-5 py-2.5 text-sm font-bold text-forest">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile.onboardingCompleted) {
    async function saveProfile(input: ProfileUpdateInput) {
      if (!auth.user) return;
      setProfile(await updateCurrentProfile(auth.user.id, input));
    }
    return <ProfileSetup profile={profile} onSave={saveProfile} onSignOut={auth.signOut} />;
  }

  return <DiscoveryApp profile={profile} onSignOut={auth.signOut} />;
}

function DiscoveryApp({ profile, onSignOut }: { profile: BreaProfile; onSignOut: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<PersonMatch[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionUiState>>({});

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    if (validationError) setValidationError(null);
  }

  async function runSearch(searchQuery = query, searchRadius = radiusKm) {
    const normalizedQuery = searchQuery.trim();
    if (normalizedQuery.length < 2) {
      setValidationError("Add at least two characters so we know who to look for.");
      return;
    }

    setValidationError(null);
    setSearchError(null);
    setSearchStatus("loading");
    setSubmittedQuery(normalizedQuery);

    try {
      const response = await searchNearbyPeople({
        query: normalizedQuery,
        radiusKm: searchRadius,
        limit: 12,
      });

      setResults(response.results);
      setConnectionStates((current) => {
        const next: Record<string, ConnectionUiState> = {};
        for (const person of response.results) {
          const previous = current[person.id];
          next[person.id] =
            person.connectionStatus === "pending" || previous?.status === "pending"
              ? { status: "pending", created: false }
              : { status: "none" };
        }
        return next;
      });
      setSearchStatus(response.results.length > 0 ? "results" : "empty");
    } catch (error) {
      setResults([]);
      setSearchError(readableError(error, "We could not search nearby right now. Please try again."));
      setSearchStatus("error");
    }
  }

  async function connectWith(person: PersonMatch) {
    if (!submittedQuery) return;
    setConnectionStates((current) => ({
      ...current,
      [person.id]: { status: "submitting" },
    }));

    try {
      const response = await sendConnectionRequest({
        recipientId: person.id,
        sourceQuery: submittedQuery,
      });
      setConnectionStates((current) => ({
        ...current,
        [person.id]: { status: "pending", created: response.created },
      }));
    } catch (error) {
      setConnectionStates((current) => ({
        ...current,
        [person.id]: {
          status: "error",
          message: readableError(error, "Request not sent."),
        },
      }));
    }
  }

  function broadenSearch() {
    const nextRadius = Math.max(radiusKm, 25);
    setRadiusKm(nextRadius);
    void runSearch(submittedQuery || query, nextRadius);
  }

  const isLoading = searchStatus === "loading";

  return (
    <div className="min-h-screen overflow-hidden bg-cream text-ink">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <BreaMark />
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" /> : null}
          <span className="hidden text-sm font-bold text-forest sm:inline">{profile.name}</span>
          <button type="button" onClick={() => void onSignOut()} className="rounded-full border border-forest/15 bg-paper/60 px-3 py-1.5 text-xs font-bold text-forest hover:bg-paper">
            Sign out
          </button>
        </div>
      </header>

      <main className="relative z-[1] mx-auto w-full max-w-7xl px-5 pb-16 pt-7 sm:px-8 lg:px-10 lg:pt-14">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.55fr)] lg:items-center lg:gap-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-forest/10 bg-paper/55 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-moss">
              <span className="h-2 w-2 rounded-full bg-coral" />
              Nearby · Relevant · Human
            </div>
            <h1 className="max-w-4xl text-[clamp(3rem,8vw,6.7rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-ink">
              Find your
              <span className="relative ml-[0.16em] inline-block text-coral">
                people
                <svg aria-hidden="true" viewBox="0 0 250 22" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-4 w-full fill-none stroke-sun">
                  <path d="M3 14C56 4 147 3 247 10" strokeWidth="7" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              close to home.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-moss sm:text-lg">
              Tell Brea who you want to meet. We will surface suitable people nearby and explain what makes each connection worth exploring.
            </p>
          </div>

          <aside className="relative hidden rounded-[2rem] border border-paper/50 bg-forest p-7 text-paper shadow-card lg:block">
            <span className="absolute right-6 top-5 text-5xl leading-none text-sun/80" aria-hidden="true">“</span>
            <p className="max-w-xs pt-7 text-xl font-medium leading-snug tracking-[-0.025em]">
              The right collaborator might be three blocks away.
            </p>
            <div className="mt-8 flex items-center gap-3 border-t border-paper/15 pt-5 text-sm text-paper/65">
              <div className="flex -space-x-2" aria-hidden="true">
                <span className="h-8 w-8 rounded-full border-2 border-forest bg-[#d89865]" />
                <span className="h-8 w-8 rounded-full border-2 border-forest bg-[#86a987]" />
                <span className="h-8 w-8 rounded-full border-2 border-forest bg-[#e8bd5b]" />
              </div>
              Search by intent, not by scrolling.
            </div>
          </aside>
        </section>

        <section className="mt-10 rounded-[2rem] border border-paper/70 bg-paper/55 p-4 backdrop-blur-sm sm:p-7 lg:mt-14 lg:p-8" aria-labelledby="search-title">
          <h2 id="search-title" className="sr-only">Search for people nearby</h2>
          <SearchForm
            query={query}
            radiusKm={radiusKm}
            isLoading={isLoading}
            validationError={validationError}
            onQueryChange={updateQuery}
            onRadiusChange={setRadiusKm}
            onSubmit={() => void runSearch()}
          />
        </section>

        <section className="mt-12" aria-live="polite" aria-busy={isLoading}>
          {isLoading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Searching for nearby people">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-[25rem] animate-pulse rounded-[1.7rem] border border-ink/5 bg-paper/60 p-6">
                  <div className="flex gap-4"><div className="h-14 w-14 rounded-2xl bg-ink/10" /><div className="flex-1"><div className="h-4 w-2/3 rounded bg-ink/10" /><div className="mt-3 h-3 w-full rounded bg-ink/5" /></div></div>
                  <div className="mt-6 h-24 rounded-2xl bg-ink/5" />
                </div>
              ))}
            </div>
          )}

          {searchStatus === "error" && searchError && (
            <div className="rounded-[1.8rem] border border-[#c95b43]/20 bg-[#fff3ee] px-6 py-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl text-coral" aria-hidden="true">!</div>
              <h2 className="mt-4 text-xl font-bold text-ink">We could not complete that search</h2>
              <p role="alert" className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#875345]">{searchError}</p>
              <button
                type="button"
                onClick={() => void runSearch(submittedQuery, radiusKm)}
                className="mt-6 rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              >
                Retry search
              </button>
            </div>
          )}

          {searchStatus === "empty" && <EmptyState radiusKm={radiusKm} onBroaden={broadenSearch} />}

          {searchStatus === "results" && (
            <>
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">Nearby matches</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-ink sm:text-3xl">
                    {results.length} {results.length === 1 ? "person" : "people"} worth meeting
                  </h2>
                </div>
                <p className="text-sm text-moss">Ranked for “{submittedQuery}” · within {radiusKm} km</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    connectionState={connectionStates[person.id] ?? { status: "none" }}
                    onConnect={(selectedPerson) => void connectWith(selectedPerson)}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="mt-20 grid gap-8 border-t border-ink/10 py-10 sm:grid-cols-3" aria-label="How Brea works">
          {[
            ["01", "Say what you need", "Describe a skill, interest, or activity in everyday language."],
            ["02", "Stay meaningfully local", "Set a real distance so every result is genuinely nearby."],
            ["03", "Start with context", "See why someone fits, then send one lightweight request."],
          ].map(([number, title, description]) => (
            <div key={number} className="flex gap-4">
              <span className="pt-0.5 text-xs font-black tracking-widest text-coral">{number}</span>
              <div><h2 className="font-bold text-ink">{title}</h2><p className="mt-1 text-sm leading-relaxed text-moss">{description}</p></div>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-[1] border-t border-ink/10 px-5 py-7 text-sm text-moss sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Brea · Built for meaningful proximity.</p>
          <p className="max-w-xl text-xs leading-relaxed sm:text-right">Your exact location is private. Other members see only your chosen profile details and approximate distance.</p>
        </div>
      </footer>
    </div>
  );
}
