import type { SectorCity } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import { DigiIconContainer } from "@/components/digione/primitives";

/**
 * CityCard — architectural registry card for a Sector City.
 * Pure presentation: selection state is controlled by the parent.
 */
export function CityCard({
  city,
  selected = false,
  onSelect,
  href,
}: {
  city: SectorCity;
  selected?: boolean;
  onSelect?: (id: string) => void;
  href?: string;
}) {
  const className = `group flex h-full w-full flex-col rounded-card-lg border bg-white p-6 text-left transition-all duration-400 ease-digi hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(17,17,19,0.08)] ${
    selected ? "border-royal/60 bg-soft/60" : "border-line hover:border-royal/35"
  }`;
  const content = (
    <>
      <div className="flex w-full items-start justify-between">
        <DigiIconContainer icon={city.icon} mode={selected ? "royal" : "subtle"} size={40} />
        <span className="font-sans text-[11px] font-semibold tracking-wider text-mute">{city.code}</span>
      </div>
      <p className="mt-6 text-[16.5px] font-semibold uppercase tracking-[-0.02em] text-graphite">{city.domain}</p>
      <p className="text-body mt-2 flex-1 text-stone">{city.description}</p>
      <div className="mt-6 flex w-full items-center justify-between border-t border-linesoft pt-4">
        <span className="eyebrow rounded-full bg-mist px-2.5 py-1.5 text-[9.5px] text-stone">{city.category}</span>
        <span className="eyebrow flex items-center gap-1.5 text-royal">
          Explore
          <Icon name="arrowRight" className="h-3.5 w-3.5 transition-transform duration-300 ease-digi group-hover:translate-x-1" />
        </span>
      </div>
    </>
  );

  if (href) {
    return <a href={href} className={className}>{content}</a>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(city.id)}
      aria-expanded={selected}
      aria-controls="city-detail"
      className={className}
    >
      {content}
    </button>
  );
}
