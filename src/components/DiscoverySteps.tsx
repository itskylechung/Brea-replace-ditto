const discoverySteps = [
  ["01", "Describe who you need"],
  ["02", "Review nearby matches"],
  ["03", "Send a connection request"],
] as const;

export function DiscoverySteps() {
  return (
    <aside className="rounded-xl border border-beige bg-cream p-6" aria-labelledby="discovery-steps-title">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-primary-deep">From intent to introduction</p>
      <h2 id="discovery-steps-title" className="mt-2 font-editorial text-2xl font-normal text-ink">What happens next</h2>
      <ol className="mt-5 space-y-4">
        {discoverySteps.map(([number, label]) => (
          <li key={number} className="flex items-center gap-3 text-sm text-slate">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-xs font-semibold text-primary-deep">
              {number}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </aside>
  );
}
