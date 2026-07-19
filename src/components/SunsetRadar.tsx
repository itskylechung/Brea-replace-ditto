export function SunsetRadar() {
  return (
    <div className="relative mx-auto min-h-[320px] w-full max-w-[520px] overflow-hidden rounded-xl bg-surface-code text-white shadow-mockup sm:min-h-[390px]" aria-hidden="true">
      <svg viewBox="0 0 520 390" className="absolute inset-0 h-full w-full text-white/10">
        <path className="topography-line" d="M-20 76c76-72 143-42 188 4s109 45 154-7 121-54 219 7" />
        <path className="topography-line" d="M-28 112c75-68 148-44 193 2s105 48 154-1 126-59 230 3" />
        <path className="topography-line" d="M-36 150c82-67 154-45 201 1s104 49 156 3 129-60 239 6" />
        <path className="topography-line" d="M-44 191c88-69 160-47 210 0s105 50 160 6 132-62 245 9" />
        <path className="topography-line" d="M-46 235c94-72 167-49 217-1s107 52 164 9 137-63 252 14" />
        <path className="topography-line" d="M-48 282c99-75 175-52 226-3s109 55 168 13 141-64 260 20" />
      </svg>

      <div className="absolute left-5 top-5 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/60">
        <span className="h-2 w-2 rounded-full bg-primary" />
        Nearby discovery
      </div>

      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 sm:h-72 sm:w-72" />
      <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sunshine-500/40 sm:h-44 sm:w-44" />
      <div className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-xs font-semibold shadow-[0_0_0_10px_rgba(250,82,15,0.15)]">
        YOU
      </div>

      <span className="absolute left-[24%] top-[33%] h-5 w-5 rounded-full border-4 border-surface-code bg-sunshine-500 shadow-[0_0_0_1px_rgba(255,184,62,0.6)]" />
      <span className="absolute right-[23%] top-[27%] h-4 w-4 rounded-full border-[3px] border-surface-code bg-yellow shadow-[0_0_0_1px_rgba(255,217,0,0.6)]" />
      <span className="absolute bottom-[27%] left-[30%] h-4 w-4 rounded-full border-[3px] border-surface-code bg-primary shadow-[0_0_0_1px_rgba(250,82,15,0.7)]" />
      <span className="absolute bottom-[22%] right-[20%] h-5 w-5 rounded-full border-4 border-surface-code bg-sunshine-700 shadow-[0_0_0_1px_rgba(255,161,16,0.6)]" />

      <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
        <p className="font-editorial text-2xl leading-tight">Relevant, not merely close.</p>
        <p className="mt-1 text-xs leading-5 text-white/55">Intent shapes the shortlist. Distance keeps it practical.</p>
      </div>
    </div>
  );
}
