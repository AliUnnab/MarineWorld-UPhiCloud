/**
 * LoadingState — restrained, accessible placeholder.
 * Respects prefers-reduced-motion via the global token rules.
 */
export function LoadingState({ label = "Loading registry data" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card-lg border border-line bg-white px-6 py-16" role="status" aria-live="polite">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-royal opacity-40" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-royal" />
      </span>
      <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-mute">{label}</p>
    </div>
  );
}
