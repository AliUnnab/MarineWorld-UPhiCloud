import type { SectorConfig } from "@/lib/types";
import { LogoMark } from "@/components/digione/icons";
import { DigiContainer } from "@/components/digione/primitives";

export function Footer({ config }: { config: SectorConfig }) {
  const { footer } = config;

  return (
    <footer className="border-t border-line bg-graphite text-white pt-16 pb-12">
      <DigiContainer>
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand & Blurb Column */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <LogoMark className="h-9 w-9" />
              <span className="font-sans text-[15px] font-bold tracking-tight text-white">
                {config.sectorName}.City
              </span>
            </div>

            <p className="mt-4 text-[13.5px] leading-relaxed text-white/60 max-w-sm">
              {footer.blurb}
            </p>

            <div className="mt-6 rounded-card-sm border border-white/10 bg-white/5 p-4 text-[12px] font-sans text-white/80">
              <p className="text-electric font-semibold uppercase tracking-wider text-[10px]">Infrastructure Protocol</p>
              <p className="mt-1">{footer.infrastructure}</p>
            </div>
          </div>

          {/* Nav Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footer.columns.map((col) => (
              <div key={col.title}>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[13.5px] text-white/75 hover:text-white transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8 font-sans text-[11px] text-white/40">
          <p>{footer.legalLine}</p>
          <div className="flex items-center gap-4 font-semibold uppercase tracking-wider text-[10px]">
            <span>IMO / IACS CLASS COMPLIANT</span>
            <span>·</span>
            <span>ISO 27001 VERIFIED</span>
          </div>
        </div>
      </DigiContainer>
    </footer>
  );
}
