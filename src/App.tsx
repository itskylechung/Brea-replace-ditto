import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { BreaMark } from "./components/BreaMark";
import { ConnectionRequests } from "./components/ConnectionRequests";
import { DiscoverySteps } from "./components/DiscoverySteps";
import { EmptyState } from "./components/EmptyState";
import { PersonCard } from "./components/PersonCard";
import { ProfileSetup } from "./components/ProfileSetup";
import { SearchForm } from "./components/SearchForm";
import { SignInScreen } from "./components/SignInScreen";
import { SunsetRadar } from "./components/SunsetRadar";
import {
  blockProfile,
  ConnectionRequestError,
  ensureCurrentProfile,
  profileToUpdateInput,
  reportProfile,
  searchNearbyPeople,
  sendConnectionRequest,
  trackProductEvent,
  updateCurrentProfile,
} from "./lib/api";
import type {
  BreaProfile,
  ConnectionUiState,
  PersonMatch,
  ProfileUpdateInput,
  ReportReason,
  SearchStatus,
} from "./types";

const DEFAULT_RADIUS_KM = 10;
const SIGN_IN_TRACKED_KEY = "brea:sign-in-tracked";

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function friendlyMessage(message: string | null): string | null {
  if (message && message.includes("timed out")) {
    return "The backend took too long to respond. Please retry.";
  }
  return message;
}

// The connection-request function returns 409s that a retry can never clear.
// Map each to the card state that tells the user what to do instead; unknown
// failures keep the existing retryable error treatment.
function connectionErrorState(error: unknown): ConnectionUiState {
  const code = error instanceof ConnectionRequestError ? error.code : undefined;
  switch (code) {
    case "INCOMING_REQUEST_EXISTS":
      return { status: "incoming" };
    case "ALREADY_CONNECTED":
      return { status: "accepted" };
    case "RECIPIENT_UNAVAILABLE":
      return { status: "unavailable" };
    default:
      return { status: "error", message: readableError(error, "Request not sent.") };
  }
}

type ProfileStatus = "idle" | "loading" | "ready" | "error";

function trackOnce(eventName: "sign_in_completed") {
  try {
    if (window.sessionStorage.getItem(SIGN_IN_TRACKED_KEY)) return;
    window.sessionStorage.setItem(SIGN_IN_TRACKED_KEY, "1");
  } catch {
    return;
  }
  void trackProductEvent(eventName).catch(() => undefined);
}

export function App() {
  const auth = useAuth();
  const [profile, setProfile] = useState<BreaProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [slowConnection, setSlowConnection] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!auth.user) return;

    const userId = auth.user.id;
    void ensureCurrentProfile(auth.user)
      .then((nextProfile) => {
        if (cancelled) return;
        // A profile whose owner differs from the signed-in user means the
        // session and profile calls disagree; surface it as an error instead
        // of leaving the app pending forever.
        if (nextProfile.userId !== userId) {
          setProfileError("We could not load your profile.");
          return;
        }
        setProfileError(null);
        setProfile(nextProfile);
        trackOnce("sign_in_completed");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setProfileError(readableError(error, "We could not load your profile."));
      });
    return () => {
      cancelled = true;
    };
  }, [auth.user]);

  const profileStatus: ProfileStatus = !auth.user
    ? "idle"
    : profileError
      ? "error"
      : profile && profile.userId === auth.user.id
        ? "ready"
        : "loading";

  const isPreparing = auth.isLoading || profileStatus === "loading";

  useEffect(() => {
    if (!isPreparing) return;
    const timer = window.setTimeout(() => setSlowConnection(true), 5_000);
    return () => {
      window.clearTimeout(timer);
      setSlowConnection(false);
    };
  }, [isPreparing]);

  if (isPreparing) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream text-ink" role="status">
        <div className="text-center">
          <BreaMark />
          <p className="mt-5 text-sm text-steel">Preparing your private profile…</p>
          {slowConnection && (
            <div className="mt-5">
              <p className="text-sm text-steel">
                Still connecting — the backend is responding slowly…
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-charcoal"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <SignInScreen
        linkedinEnabled={auth.linkedinEnabled}
        configFailed={auth.configFailed}
        backendError={friendlyMessage(auth.error)}
        onSignIn={auth.signInWithLinkedIn}
        onRetry={auth.refresh}
      />
    );
  }

  if (profileStatus === "error" || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-5 text-center text-ink">
        <div className="max-w-lg rounded-xl border border-hairline-soft bg-canvas p-8 shadow-card">
          <BreaMark />
          <h1 className="mt-7 font-editorial text-3xl">Your profile could not be prepared</h1>
          <p className="mt-3 text-sm leading-6 text-signal">
            {friendlyMessage(profileError) ?? "No profile was returned."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="rounded-lg border border-hairline-strong px-5 py-2.5 text-sm font-medium text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile.onboardingCompleted) {
    async function saveProfile(input: ProfileUpdateInput) {
      if (!auth.user) return;
      setProfile(await updateCurrentProfile(auth.user.id, input));
      void trackProductEvent("profile_completed").catch(() => undefined);
    }

    return <ProfileSetup profile={profile} email={auth.user.email} onSave={saveProfile} onSignOut={auth.signOut} />;
  }

  async function saveEditedProfile(input: ProfileUpdateInput) {
    if (!auth.user) return;
    setProfile(await updateCurrentProfile(auth.user.id, input));
    void trackProductEvent("profile_updated").catch(() => undefined);
  }

  async function saveLocation(latitude: number, longitude: number) {
    if (!auth.user || !profile) return;
    const next = await updateCurrentProfile(
      auth.user.id,
      profileToUpdateInput(profile, { latitude, longitude }),
    );
    setProfile(next);
  }

  return (
    <DiscoveryApp
      profile={profile}
      email={auth.user.email}
      onSaveProfile={saveEditedProfile}
      onSaveLocation={saveLocation}
      onSignOut={auth.signOut}
    />
  );
}

type DiscoveryView = "discover" | "requests";

function DiscoveryApp({
  profile,
  email,
  onSaveProfile,
  onSaveLocation,
  onSignOut,
}: {
  profile: BreaProfile;
  email: string;
  onSaveProfile: (input: ProfileUpdateInput) => Promise<void>;
  onSaveLocation: (latitude: number, longitude: number) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [view, setView] = useState<DiscoveryView>("discover");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [query, setQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<PersonMatch[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionUiState>>({});
  const [pendingSearch, setPendingSearch] = useState<{ query: string; radiusKm: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const resultsSectionRef = useRef<HTMLElement>(null);

  // Coordinates are deferred from onboarding, so a profile can reach discovery
  // without them. Searching is gated locally until they are set — the
  // people-search function otherwise 409s with PROFILE_SETUP_REQUIRED.
  const needsLocation = profile.latitude === null || profile.longitude === null;

  function revealSearchOutcome() {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.requestAnimationFrame(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior, block: "start" });
    });
  }

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

    // Without a stored origin, hold the search and prompt for location first.
    // Once saved, locateForPendingSearch runs the pending search automatically.
    if (needsLocation) {
      setPendingSearch({ query: normalizedQuery, radiusKm: searchRadius });
      setLocateError(null);
      revealSearchOutcome();
      return;
    }

    await executeSearch(normalizedQuery, searchRadius);
  }

  async function executeSearch(normalizedQuery: string, searchRadius: number) {
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
          if (person.connectionStatus === "accepted") {
            next[person.id] = { status: "accepted" };
          } else if (person.connectionStatus === "incoming_pending") {
            next[person.id] = { status: "incoming" };
          } else if (person.connectionStatus === "outgoing_pending" || previous?.status === "pending") {
            next[person.id] = { status: "pending", created: false };
          } else {
            next[person.id] = { status: "none" };
          }
        }
        return next;
      });
      setSearchStatus(response.results.length > 0 ? "results" : "empty");
      revealSearchOutcome();
    } catch (error) {
      setResults([]);
      setSearchError(readableError(error, "We could not search nearby right now. Please try again."));
      setSearchStatus("error");
      revealSearchOutcome();
    }
  }

  function locateForPendingSearch() {
    const target = pendingSearch;
    if (!target) return;
    setLocateError(null);
    if (!navigator.geolocation) {
      setLocateError("We could not read your location. Check your browser permission and try again.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void (async () => {
          try {
            await onSaveLocation(coords.latitude, coords.longitude);
            setPendingSearch(null);
            setIsLocating(false);
            await executeSearch(target.query, target.radiusKm);
          } catch (error) {
            setLocateError(readableError(error, "We could not save your location. Please try again."));
            setIsLocating(false);
          }
        })();
      },
      () => {
        setLocateError("We could not read your location. Check your browser permission and try again.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
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
        [person.id]: response.status === "accepted"
          ? { status: "accepted" }
          : { status: "pending", created: response.created },
      }));
    } catch (error) {
      setConnectionStates((current) => ({
        ...current,
        [person.id]: connectionErrorState(error),
      }));
    }
  }

  function broadenSearch() {
    const nextRadius = Math.max(radiusKm, 25);
    setRadiusKm(nextRadius);
    void runSearch(submittedQuery || query, nextRadius);
  }

  async function hidePerson(person: PersonMatch) {
    await blockProfile(person.id);
    setResults((current) => current.filter((candidate) => candidate.id !== person.id));
  }

  async function reportPerson(person: PersonMatch, reason: ReportReason, details: string) {
    await reportProfile({ profileId: person.id, reason, details: details || undefined });
  }

  function selectExample(example: string) {
    updateQuery(example);
    void runSearch(example);
  }

  const isLoading = searchStatus === "loading";

  if (isEditingProfile) {
    return (
      <ProfileSetup
        profile={profile}
        email={email}
        mode="editing"
        onCancel={() => setIsEditingProfile(false)}
        onSave={async (input) => {
          await onSaveProfile(input);
          setIsEditingProfile(false);
        }}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <div id="top" className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-hairline-soft bg-canvas/95 backdrop-blur">
        <nav
          className="mx-auto flex min-h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-8"
          aria-label="Primary navigation"
        >
          <BreaMark />
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setView("discover")}
              aria-current={view === "discover" ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                view === "discover" ? "bg-cream-light text-ink" : "text-steel hover:text-ink"
              }`}
            >
              Discover
            </button>
            <button
              type="button"
              onClick={() => setView("requests")}
              aria-current={view === "requests" ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                view === "requests" ? "bg-cream-light text-ink" : "text-steel hover:text-ink"
              }`}
            >
              Requests
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-cream-light"
              aria-label="Edit your profile and privacy"
            >
              {profile.avatarUrl && (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full object-cover"
                />
              )}
              <span className="hidden text-sm font-medium text-slate sm:inline">{profile.name}</span>
            </button>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="rounded-lg border border-hairline-strong bg-canvas px-3 py-2 text-xs font-medium text-ink transition hover:border-ink"
            >
              Sign out
            </button>
          </div>
        </nav>
      </header>

      <main>
        {view === "requests" ? (
          <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16">
            <ConnectionRequests />
          </div>
        ) : (
          <>
        <section className="hero-sunset overflow-hidden" aria-labelledby="page-title">
          <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="max-w-2xl">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-tint">
                Nearby, but relevant
              </p>
              <h1
                id="page-title"
                className="mt-4 font-editorial text-[clamp(3rem,7vw,5.25rem)] font-normal leading-[1.03] tracking-[-0.025em] text-ink"
              >
                The right people might be closer than you think.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-ink-tint sm:text-lg">
                Describe who you want to meet. Brea turns your intent into a shortlist of relevant
                people inside a practical radius—and tells you why each person fits.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#people-search"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-medium text-white transition hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Start a nearby search
                  <span aria-hidden="true">↓</span>
                </a>
                <p className="text-xs leading-5 text-ink-tint">Your exact location stays private.</p>
              </div>
            </div>
            <SunsetRadar />
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16">
          <div
            id="people-search"
            className="grid scroll-mt-24 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <section
              className="rounded-xl border border-beige bg-cream p-5 sm:p-8"
              aria-labelledby="search-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-primary-deep">
                    People discovery
                  </p>
                  <h2
                    id="search-title"
                    className="mt-2 font-editorial text-3xl font-normal tracking-[-0.02em] text-ink sm:text-4xl"
                  >
                    Who are you hoping to find?
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
                    Search by role, skill, interest, or availability. Relevance comes first;
                    distance breaks the tie.
                  </p>
                </div>
                <span className="hidden rounded-full bg-canvas px-3 py-1 text-xs font-medium text-steel sm:block">
                  Up to 12
                </span>
              </div>

              <SearchForm
                query={query}
                radiusKm={radiusKm}
                isLoading={isLoading}
                validationError={validationError}
                onQueryChange={updateQuery}
                onRadiusChange={setRadiusKm}
                onSubmit={() => void runSearch()}
                onExampleSelect={selectExample}
              />
            </section>

            <DiscoverySteps />
          </div>

          <section
            id="search-results"
            ref={resultsSectionRef}
            className="mt-12 scroll-mt-24"
            aria-live="polite"
            aria-busy={isLoading}
          >
            {pendingSearch && (
              <div className="rounded-xl border border-beige bg-cream-light px-6 py-12 text-center">
                <h2 className="font-editorial text-3xl font-normal tracking-[-0.02em] text-ink">
                  Add your location to search nearby
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-steel">
                  Brea uses your exact location only to calculate distance. Other members only ever see
                  an approximate distance — never where you are.
                </p>
                <button
                  type="button"
                  onClick={locateForPendingSearch}
                  disabled={isLocating}
                  className="mt-6 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                >
                  {isLocating ? "Locating…" : "Use current location"}
                </button>
                {locateError && (
                  <p role="alert" className="mx-auto mt-4 max-w-lg text-sm leading-6 text-signal">
                    {locateError}
                  </p>
                )}
              </div>
            )}

            {isLoading && (
              <div className="grid gap-5 md:grid-cols-2" aria-label="Searching for nearby people">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-xl border border-hairline-soft bg-canvas p-6 shadow-subtle"
                  >
                    <div className="flex gap-4">
                      <div className="h-16 w-16 shrink-0 rounded-full bg-cream-deeper" />
                      <div className="flex-1">
                        <div className="h-4 w-32 rounded bg-hairline" />
                        <div className="mt-3 h-3 w-2/3 rounded bg-hairline-soft" />
                      </div>
                    </div>
                    <div className="mt-5 h-20 rounded-lg bg-cream-light" />
                    <div className="mt-5 h-10 rounded-lg bg-hairline-soft" />
                  </div>
                ))}
              </div>
            )}

            {searchStatus === "error" && searchError && (
              <div className="rounded-xl border border-hairline-soft bg-canvas px-6 py-12 text-center shadow-subtle">
                <div
                  className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-[#fff0ed] text-signal"
                  aria-hidden="true"
                >
                  !
                </div>
                <h2 className="mt-4 font-editorial text-3xl font-normal text-ink">
                  We could not complete that search
                </h2>
                <p role="alert" className="mx-auto mt-2 max-w-xl text-sm leading-6 text-steel">
                  {searchError}
                </p>
                <button
                  type="button"
                  onClick={() => void runSearch(submittedQuery, radiusKm)}
                  className="mt-5 rounded-lg border border-hairline-strong bg-canvas px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Retry search
                </button>
              </div>
            )}

            {searchStatus === "empty" && (
              <EmptyState radiusKm={radiusKm} onBroaden={broadenSearch} />
            )}

            {searchStatus === "results" && (
              <>
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-primary-deep">
                      Your shortlist
                    </p>
                    <h2 className="mt-1 font-editorial text-3xl font-normal text-ink sm:text-4xl">
                      People near your location
                    </h2>
                    <p className="mt-2 text-sm text-steel">
                      {results.length} {results.length === 1 ? "match" : "matches"} for “
                      {submittedQuery}”
                    </p>
                  </div>
                  <p className="text-sm text-steel">Within {radiusKm} km · Most relevant first</p>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  {results.map((person) => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      connectionState={connectionStates[person.id] ?? { status: "none" }}
                      onConnect={(selectedPerson) => void connectWith(selectedPerson)}
                      onHide={hidePerson}
                      onReport={reportPerson}
                      onViewRequests={() => setView("requests")}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
          </>
        )}
      </main>

      <div className="sunset-stripe h-8" aria-hidden="true" />
      <footer className="bg-cream px-4 py-8 text-xs text-steel sm:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-editorial text-xl text-ink">Brea</span>
            <span>© 2026 · Find relevant people nearby.</span>
          </div>
          <p className="max-w-xl leading-5 sm:text-right">
            Your exact location is private. Other members see only your chosen profile details and
            approximate distance.
          </p>
        </div>
      </footer>
    </div>
  );
}
