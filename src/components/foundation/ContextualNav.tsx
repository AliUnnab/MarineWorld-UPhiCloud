import type { NavigationItem } from "@/lib/types";
import { DigiContainer } from "@/components/digione/primitives";

/**
 * ContextualNav — local navigation for an implemented entity surface.
 * It complements the GlobalHeader; it never replaces it.
 */
export function ContextualNav({
  label,
  items,
}: {
  label: string;
  items: NavigationItem[];
}) {
  return (
    <nav aria-label={label} className="border-y border-line bg-canvas">
      <DigiContainer>
        <div className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-1 py-2">
          <span className="eyebrow mr-1 text-mute">{label}</span>
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="min-h-10 py-2 text-[12px] font-medium text-stone transition-colors duration-200 hover:text-graphite"
            >
              {item.label}
            </a>
          ))}
        </div>
      </DigiContainer>
    </nav>
  );
}
