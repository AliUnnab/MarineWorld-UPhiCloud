import { Icon } from "@/components/digione/icons";
import { DigiContainer } from "@/components/digione/primitives";

/** A non-linked crumb preserves hierarchy when no public route exists yet. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Breadcrumbs — contextual trail from MarineWorld root to current entity.
 * Uses react-router Link where available, falls back to anchor.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-line bg-white py-3.5"
    >
      <DigiContainer>
        <ol className="flex flex-wrap items-center gap-1 text-[11.5px] font-medium tracking-[0.04em]">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={`${item.label}-${item.href ?? i}`} className="flex items-center gap-1.5">
                {i > 0 ? (
                  <Icon name="chevronDown" className="h-3 w-3 -rotate-90 text-mute" />
                ) : null}
                {isLast ? (
                  <span className="text-graphite" aria-current="page">{item.label}</span>
                ) : !item.href ? (
                  <span className="text-stone">{item.label}</span>
                ) : (
                  <a
                    href={item.href}
                    className="py-1 text-stone transition-colors duration-200 hover:text-graphite"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </DigiContainer>
    </nav>
  );
}
