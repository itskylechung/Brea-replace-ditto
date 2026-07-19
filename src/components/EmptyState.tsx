interface EmptyStateProps {
  radiusKm: number;
  onBroaden: () => void;
}

export function EmptyState({ radiusKm, onBroaden }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-beige bg-cream-light px-6 py-12 text-center sm:px-10">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-cream-deeper text-primary" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current">
          <circle cx="10.5" cy="10.5" r="6.5" strokeWidth="1.7" />
          <path d="m15.5 15.5 4 4" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="mt-5 font-editorial text-3xl font-normal tracking-[-0.02em] text-ink">No close matches this time</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-steel">
        We did not find a strong match within {radiusKm} km. Try a broader skill, interest, or search area.
      </p>
      <button
        type="button"
        onClick={onBroaden}
        className="mt-6 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Broaden to 25 km
      </button>
    </div>
  );
}
