export function BreaMark() {
  return (
    <div className="flex items-center gap-3" aria-label="Brea home">
      <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-forest text-paper shadow-sm">
        <svg aria-hidden="true" viewBox="0 0 28 28" className="h-6 w-6 fill-none">
          <path
            d="M7 20.5V10.25C7 7.9 8.9 6 11.25 6h2.5C16.1 6 18 7.9 18 10.25v.25M7 15h9.25A4.75 4.75 0 0 1 21 19.75v0A4.25 4.25 0 0 1 16.75 24H11.5A4.5 4.5 0 0 1 7 19.5"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <circle cx="20.5" cy="7.5" r="2.5" fill="#f4c85d" />
        </svg>
      </span>
      <span className="text-[1.65rem] font-semibold tracking-[-0.055em] text-ink">brea</span>
    </div>
  );
}
