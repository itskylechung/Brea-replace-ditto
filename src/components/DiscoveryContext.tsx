interface DiscoveryContextProps {
  radiusKm: number;
}

const discoverySteps = [
  ["01", "Describe who you need"],
  ["02", "Review nearby matches"],
  ["03", "Send a connection request"],
] as const;

export function DiscoveryContext({ radiusKm }: DiscoveryContextProps) {
  return (
    <aside className="space-y-4" aria-label="MVP discovery context">
      <section className="rounded-xl bg-surface-code p-6 text-white shadow-mockup">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" strokeWidth="1.8" />
              <circle cx="12" cy="10" r="2.5" strokeWidth="1.8" />
            </svg>
          </div>
          <div>
            <h2 className="font-medium">Your discovery context</h2>
            <p className="text-xs text-on-dark-muted">How this MVP determines nearby</p>
          </div>
        </div>

        <dl className="mt-5 divide-y divide-white/10 border-y border-white/10">
          <div className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="text-on-dark-muted">Location source</dt>
            <dd className="text-right font-medium">Demo profile</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="text-on-dark-muted">Search radius</dt>
            <dd className="text-right font-medium">{radiusKm} km</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="text-on-dark-muted">Visitor identity</dt>
            <dd className="text-right font-medium">Shared demo</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs leading-5 text-on-dark-muted">
          No sign-in or live GPS is used. All visitors search from the same server-managed profile during the MVP.
        </p>
      </section>

      <section className="rounded-xl border border-beige bg-cream p-6">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-primary-deep">From intent to introduction</p>
        <h2 className="mt-2 font-editorial text-2xl font-normal text-ink">What happens next</h2>
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
      </section>
    </aside>
  );
}
