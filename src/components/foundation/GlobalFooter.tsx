import type { SectorConfig } from "@/lib/types";
import { Icon, LogoMark } from "@/components/digione/icons";
import { DigiContainer } from "@/components/digione/primitives";

type FooterTone = "dark" | "light";

const TONES: Record<
  FooterTone,
  {
    shell: string;
    brand: string;
    tld: string;
    blurb: string;
    infra: string;
    title: string;
    link: string;
    legal: string;
    top: string;
  }
> = {
  dark: {
    shell: "border-white/10 bg-graphite",
    brand: "text-white",
    tld: "text-electric",
    blurb: "text-white/50",
    infra: "text-white/35",
    title: "text-white/40",
    link: "text-white/65 hover:text-white",
    legal: "text-white/35",
    top: "border-white/15 text-white hover:bg-white/10",
  },
  light: {
    shell: "border-line bg-white",
    brand: "text-graphite",
    tld: "text-royal",
    blurb: "text-stone",
    infra: "text-mute",
    title: "text-mute",
    link: "text-stone hover:text-graphite",
    legal: "text-mute",
    top: "border-line text-graphite hover:bg-mist",
  },
};

/**
 * GlobalFooter — institutional, minimal. Brand + config-driven
 * link columns + legal strip. Tone-aware for dark / light shells.
 */
export function GlobalFooter({ config, tone = "dark" }: { config: SectorConfig; tone?: FooterTone }) {
  const { footer } = config;
  const t = TONES[tone];

  return (
    <footer className={`border-t ${t.shell}`}>
      <DigiContainer className="py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <a href="/" className="inline-flex min-h-11 items-center gap-2.5" aria-label={`${config.wordmark} — home`}>
              <LogoMark className="h-8 w-8" />
              <span className={`text-[15.5px] font-semibold tracking-[-0.02em] ${t.brand}`}>
                {config.sectorName}
                <span className={t.tld}>{config.sectorTld}</span>
              </span>
            </a>
            <p className={`mt-5 max-w-[360px] text-[13px] leading-relaxed ${t.blurb}`}>{footer.blurb}</p>
            <p className={`mt-6 font-sans text-[11px] font-medium uppercase tracking-wider ${t.infra}`}>{footer.infrastructure}</p>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            {footer.columns.map((col) => (
              <div key={col.title}>
                <h3 className={`eyebrow ${t.title}`}>{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className={`inline-block py-0.5 text-[13px] transition-colors duration-300 ${t.link}`}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Legal strip */}
        <div className={`mt-14 flex flex-wrap items-center justify-between gap-5 border-t pt-7 ${tone === "dark" ? "border-white/10" : "border-line"}`}>
          <p className={`font-sans text-[11px] font-medium uppercase tracking-wider ${t.legal}`}>
            © {new Date().getFullYear()} {config.wordmark} — {footer.legalLine}
          </p>
          <a href="#page-content" aria-label="Back to page content" className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-300 ${t.top}`}>
            <Icon name="arrowUp" className="h-4 w-4" />
          </a>
        </div>
      </DigiContainer>
    </footer>
  );
}
