import type { FormEvent } from "react";

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
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8" noValidate>
      <label htmlFor="people-query" className="text-sm font-semibold text-ink">
        Who would you like to meet?
      </label>
      <div
        className={`mt-2 rounded-[1.6rem] border bg-paper p-2 shadow-card transition focus-within:border-forest focus-within:ring-4 focus-within:ring-forest/10 ${
          validationError ? "border-coral" : "border-ink/10"
        }`}
      >
        <textarea
          id="people-query"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Try: A product designer who loves the outdoors…"
          rows={2}
          maxLength={200}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? "query-error" : "query-hint"}
          className="min-h-20 w-full resize-none rounded-[1.15rem] bg-transparent px-4 py-3 text-[1.05rem] leading-relaxed text-ink outline-none placeholder:text-moss/60"
        />
        <div className="flex flex-col gap-3 border-t border-ink/10 px-2 pb-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 px-2 text-sm text-moss">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" strokeWidth="1.8" />
              <circle cx="12" cy="10" r="2.5" strokeWidth="1.8" />
            </svg>
            <span>
              Searching within <strong className="text-ink">{radiusKm} km</strong>
            </span>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.1rem] bg-coral px-6 font-semibold text-white shadow-button transition hover:-translate-y-0.5 hover:bg-[#df674a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-wait disabled:opacity-65 disabled:hover:translate-y-0"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Looking nearby…
              </>
            ) : (
              <>
                Find my people
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p id={validationError ? "query-error" : "query-hint"} className={`text-sm ${validationError ? "font-medium text-[#bc492f]" : "text-moss"}`}>
          {validationError ?? "Describe a skill, interest, or activity in your own words."}
        </p>
        <span className="hidden text-xs text-moss/70 sm:block">{query.length}/200</span>
      </div>

      <div className="mt-6 grid gap-5 border-t border-ink/10 pt-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-moss">
            <label htmlFor="radius">Search radius</label>
            <span>{radiusKm} km</span>
          </div>
          <input
            id="radius"
            type="range"
            min="1"
            max="50"
            step="1"
            value={radiusKm}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            className="radius-slider w-full"
          />
          <div className="mt-1 flex justify-between text-[0.7rem] text-moss/70">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-[32rem] lg:justify-end">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onQueryChange(example)}
              className="rounded-full border border-ink/10 bg-paper/70 px-3.5 py-2 text-left text-xs font-medium text-moss transition hover:border-forest/30 hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
