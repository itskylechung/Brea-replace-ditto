import type { CSSProperties, FormEvent } from "react";

const examples = [
  "A product designer who enjoys hiking",
  "Someone who can help me practice Japanese",
  "A developer available for coffee",
] as const;

interface SearchFormProps {
  query: string;
  radiusKm: number;
  isLoading: boolean;
  validationError: string | null;
  onQueryChange: (query: string) => void;
  onRadiusChange: (radiusKm: number) => void;
  onSubmit: () => void;
}

export function SearchForm({
  query,
  radiusKm,
  isLoading,
  validationError,
  onQueryChange,
  onRadiusChange,
  onSubmit,
}: SearchFormProps) {
  const radiusProgress = `${((radiusKm - 1) / 49) * 100}%`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5" noValidate>
      <label htmlFor="people-query" className="block text-sm font-medium text-ink">
        Describe who you want to meet
      </label>
      <div
        className={`mt-2 flex items-start gap-3 rounded-lg border bg-canvas px-4 py-3 transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
          validationError ? "border-signal" : "border-hairline-strong"
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-1 h-5 w-5 shrink-0 fill-none stroke-steel">
          <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
          <path d="m16.2 16.2 4 4" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <textarea
          id="people-query"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Product designer who enjoys hiking"
          rows={2}
          maxLength={200}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? "query-error" : "query-hint"}
          className="min-h-12 w-full resize-none bg-transparent text-base leading-6 text-ink outline-none placeholder:text-stone"
        />
      </div>

      <div className="mt-1.5 flex min-h-5 items-start justify-between gap-4">
        <p
          id={validationError ? "query-error" : "query-hint"}
          className={`text-xs leading-5 ${validationError ? "font-medium text-signal" : "text-steel"}`}
        >
          {validationError ?? "Search by skill, interest, role, or availability."}
        </p>
        <span className="shrink-0 text-xs text-stone">{query.length}/200</span>
      </div>

      <div className="mt-5 rounded-lg border border-beige bg-cream-light px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="radius" className="flex items-center gap-2 text-sm font-medium text-ink">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-primary">
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" strokeWidth="1.8" />
              <circle cx="12" cy="10" r="2.5" strokeWidth="1.8" />
            </svg>
            Search radius
          </label>
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
            {radiusKm} km
          </span>
        </div>
        <input
          id="radius"
          type="range"
          min="1"
          max="50"
          step="1"
          value={radiusKm}
          aria-valuetext={`${radiusKm} kilometers`}
          onChange={(event) => onRadiusChange(Number(event.target.value))}
          style={{ "--range-progress": radiusProgress } as CSSProperties}
          className="radius-slider mt-4 w-full"
        />
        <div className="mt-1.5 flex justify-between text-[0.7rem] text-steel">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5 border-t border-beige pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-steel">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onQueryChange(example)}
                className="rounded-full bg-cream-deeper px-3 py-1.5 text-left text-xs font-semibold text-ink transition hover:bg-sunshine-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-ink transition hover:bg-primary-deep hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:bg-hairline disabled:text-muted"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Searching…
            </>
          ) : (
            <>
              Find my people
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
