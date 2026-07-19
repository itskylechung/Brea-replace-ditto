export function BreaMark() {
  return (
    <a href="#top" className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" aria-label="Brea home">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8 fill-none text-primary">
        <path d="M8.5 4.5v14.25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="16.5" cy="18.5" r="8" stroke="currentColor" strokeWidth="3" />
      </svg>
      <span className="text-[1.4rem] font-semibold tracking-[-0.05em] text-ink">brea</span>
    </a>
  );
}
