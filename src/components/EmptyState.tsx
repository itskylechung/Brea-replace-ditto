interface EmptyStateProps {
  radiusKm: number;
  onBroaden: () => void;
}

export function EmptyState({ radiusKm, onBroaden }: EmptyStateProps) {
  return (
    <div className="rounded-[1.8rem] border border-dashed border-forest/25 bg-paper/70 px-6 py-14 text-center sm:px-10">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cream text-2xl" aria-hidden="true">
        ◌
      </div>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-ink">No close matches this time</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-moss">
        We did not find a strong match within {radiusKm} km. Try a broader skill, interest, or search area.
      </p>
      <button
        type="button"
        onClick={onBroaden}
        className="mt-6 rounded-full border border-forest/20 px-5 py-2.5 text-sm font-bold text-forest transition hover:bg-forest hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      >
        Broaden to 25 km
      </button>
    </div>
  );
}
