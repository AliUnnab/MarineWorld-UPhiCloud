/**
 * FilterBar — reusable segmented filter control.
 * Generic over the option value type so callers keep typed state.
 */
export function FilterBar<T extends string>({
  options,
  value,
  onChange,
  label = "Filter",
  className = "",
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[11.5px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 ease-digi ${
              active
                ? "border-graphite bg-graphite text-white"
                : "border-line bg-white text-stone hover:border-mute/60 hover:text-graphite"
            }`}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={`font-mono text-[10px] tracking-normal ${active ? "text-white/60" : "text-mute"}`}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
