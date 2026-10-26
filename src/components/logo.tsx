export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <span
        className="grid place-items-center rounded-lg bg-brand text-white"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 13 12 6l8 7" />
          <circle cx="12" cy="15.5" r="1" fill="currentColor" />
        </svg>
      </span>
      Stayly
    </span>
  );
}
