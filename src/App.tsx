import { useState } from "react";
import { BreaMark } from "./components/BreaMark";
import { DiscoveryContext } from "./components/DiscoveryContext";
import { EmptyState } from "./components/EmptyState";
import { PersonCard } from "./components/PersonCard";
import { SearchForm } from "./components/SearchForm";
import { SunsetRadar } from "./components/SunsetRadar";
import { searchNearbyPeople, sendConnectionRequest } from "./lib/api";
import { hasInsforgeConfig } from "./lib/insforge";
import type { ConnectionUiState, PersonMatch, SearchStatus } from "./types";

const DEFAULT_RADIUS_KM = 10;

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function App() {
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
    <div id="top" className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-hairline-soft bg-canvas/95 backdrop-blur">
        <nav className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-4 sm:px-8" aria-label="Primary navigation">
          <BreaMark />
          <a
            href="#people-search"
            className="hidden text-sm font-medium text-slate transition hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:block"
          >
            Find people nearby
          </a>
        </nav>
      </header>

      <main>
        <section className="hero-sunset overflow-hidden" aria-labelledby="page-title">
          <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="max-w-2xl">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-tint">Nearby, but relevant</p>
              <h1 id="page-title" className="mt-4 font-editorial text-[clamp(3rem,7vw,5.25rem)] font-normal leading-[1.03] tracking-[-0.025em] text-ink">
                The right people might be closer than you think.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-ink-tint sm:text-lg">
                Describe who you want to meet. Brea turns your intent into a shortlist of relevant people inside a practical radius—and tells you why each person fits.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#people-search"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-medium text-white transition hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Start a nearby search
                  <span aria-hidden="true">↓</span>
                </a>
                <p className="text-xs leading-5 text-ink-tint">No sign-in or live GPS in this MVP.</p>
              </div>
            </div>
            <SunsetRadar />
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16">
          <div id="people-search" className="grid scroll-mt-24 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-xl border border-beige bg-cream p-5 sm:p-8" aria-labelledby="search-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-primary-deep">People discovery</p>
                  <h2 id="search-title" className="mt-2 font-editorial text-3xl font-normal tracking-[-0.02em] text-ink sm:text-4xl">
                    Who are you hoping to find?
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
                    Search by role, skill, interest, or availability. Relevance comes first; distance breaks the tie.
                  </p>
                </div>
                <span className="hidden rounded-full bg-canvas px-3 py-1 text-xs font-medium text-steel sm:block">Up to 12</span>
              </div>

              {!hasInsforgeConfig && (
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-beige bg-canvas px-4 py-3 text-sm text-slate" role="status">
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 fill-none stroke-primary">
                    <circle cx="10" cy="10" r="8" strokeWidth="1.5" />
                    <path d="M10 6.2v4.5M10 14h.01" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <p><strong className="font-medium text-ink">Backend setup pending.</strong> Add the Preview InsForge URL and anon key to run live searches.</p>
                </div>
              )}

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

            <DiscoveryContext radiusKm={radiusKm} />
          </div>

          <section className="mt-12" aria-live="polite" aria-busy={isLoading}>
            {isLoading && (
              <div className="grid gap-5 md:grid-cols-2" aria-label="Searching for nearby people">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="animate-pulse rounded-xl border border-hairline-soft bg-canvas p-6 shadow-subtle">
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
                <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-[#fff0ed] text-signal" aria-hidden="true">!</div>
                <h2 className="mt-4 font-editorial text-3xl font-normal text-ink">We could not complete that search</h2>
                <p role="alert" className="mx-auto mt-2 max-w-xl text-sm leading-6 text-steel">{searchError}</p>
                <button
                  type="button"
                  onClick={() => void runSearch(submittedQuery, radiusKm)}
                  className="mt-5 rounded-lg border border-hairline-strong bg-canvas px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Retry search
                </button>
              </div>
            )}

            {searchStatus === "empty" && <EmptyState radiusKm={radiusKm} onBroaden={broadenSearch} />}

            {searchStatus === "results" && (
              <>
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-primary-deep">Your shortlist</p>
                    <h2 className="mt-1 font-editorial text-3xl font-normal text-ink sm:text-4xl">People near your demo location</h2>
                    <p className="mt-2 text-sm text-steel">{results.length} {results.length === 1 ? "match" : "matches"} for “{submittedQuery}”</p>
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
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <div className="sunset-stripe h-8" aria-hidden="true" />
      <footer className="bg-cream px-4 py-8 text-xs text-steel sm:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-editorial text-xl text-ink">Brea</span>
            <span>© 2026 · Find relevant people nearby.</span>
          </div>
          <p className="max-w-xl leading-5 sm:text-right">MVP nearby results use a server-managed demo profile. This page does not collect live GPS or account data.</p>
        </div>
      </footer>
    </div>
  );
}
