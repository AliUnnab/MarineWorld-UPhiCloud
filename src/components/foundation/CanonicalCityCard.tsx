import type { SectorCity } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import {
  DigiButton,
  DigiIconContainer,
} from "@/components/digione/primitives";
import { SaveEntityButton } from "@/components/foundation/SaveEntityButton";

/**
 * CanonicalSectorCityCard — Authoritative MarineWorld Sector City Card.
 * Adheres strictly to the single canonical Sector City design system.
 */
export function CanonicalSectorCityCard({ city }: { city: SectorCity }) {
  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-card-md border border-line bg-white p-7 transition-all duration-300 hover:border-royal/40 hover:shadow-md">
      <div>
        <div className="flex items-center justify-between">
          <DigiIconContainer icon={city.icon} mode="royal" size={42} />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-royal">
              {city.code}
            </span>
            <SaveEntityButton
              type="city"
              id={city.slug || city.id}
              variant="icon"
              size="sm"
            />
          </div>
        </div>

        <h3 className="mt-4 text-[17px] sm:text-[18px] font-bold text-graphite tracking-tight leading-snug break-words uppercase">
          {city.domain}
        </h3>
        <p className="eyebrow mt-1 text-mute">{city.category}</p>
        <p className="mt-4 text-[13.5px] leading-relaxed text-stone">{city.description}</p>

        {city.scope && city.scope.length > 0 && (
          <div className="mt-6 border-t border-line pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Operational Scope</p>
            <ul className="mt-2 space-y-1.5">
              {city.scope.slice(0, 3).map((s) => (
                <li key={s} className="flex items-center gap-2 text-[12.5px] text-graphite">
                  <Icon name="check" className="h-3 w-3 text-royal shrink-0" strokeWidth={2.2} />
                  <span className="truncate">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-3 border-t border-line pt-5">
        <DigiButton href={`/cities/${city.slug}`} size="sm" className="w-full" icon="arrowRight">
          ENTER CITY
        </DigiButton>
        <DigiButton href={`/enter/${city.slug}`} variant="secondary" size="sm" icon="key">
          Portal
        </DigiButton>
      </div>
    </div>
  );
}
