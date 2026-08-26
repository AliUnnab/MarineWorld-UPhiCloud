import React from "react";
import type { SectorConfig } from "@/lib/types";
import { Icon, LogoMark } from "@/components/digione/icons";
import { DigiContainer } from "@/components/digione/primitives";
import { BookOpen, ArrowRight } from "lucide-react";

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
    tld: "text-white",
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
    tld: "text-graphite",
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
 * link columns + legal strip + Getting Started Corporate Guidance Section.
 */
export function GlobalFooter({ config, tone = "dark" }: { config: SectorConfig; tone?: FooterTone }) {
  const { footer } = config;
  const t = TONES[tone];

  return (
    <footer className={`border-t ${t.shell}`}>
      <DigiContainer className="py-16">
        
        {/* BUSINESS SETUP GUIDE / GETTING STARTED FOOTER SECTION */}
        <div className={`mb-12 p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans ${
          tone === "dark" ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-royal text-white shadow-sm shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${tone === "dark" ? "text-white" : "text-graphite"}`}>
                  BUSINESS SETUP GUIDE
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-royal text-white rounded">
                  Platform Guide
                </span>
              </div>
              <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${tone === "dark" ? "text-white/70" : "text-stone"}`}>
                Learn how to establish your company presence, connect your business knowledge, publish your products and services, and start receiving business opportunities.
              </p>
            </div>
          </div>

          <a
            href="/getting-started"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white text-royal hover:bg-slate-100 transition shadow-sm flex items-center gap-2 shrink-0 border border-slate-200"
          >
            <span className="font-extrabold text-royal">GETTING STARTED GUIDE →</span>
          </a>
        </div>

        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <a href="/" className={`inline-flex min-h-11 items-center gap-2.5 ${t.brand}`} aria-label={`${config.wordmark} — home`}>
              <LogoMark className={`h-6 w-2 ${t.brand}`} />
              <span className={`text-[15.5px] font-bold tracking-[-0.02em] ${t.brand}`}>
                {config.sectorName}{config.sectorTld}
              </span>
            </a>
            <p className={`mt-5 max-w-[360px] text-[13px] leading-relaxed ${t.blurb}`}>{footer.blurb}</p>
            <div className="mt-5">
              <a
                href="https://uphi.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex flex-wrap items-center gap-1.5 font-sans text-[11px] tracking-wide transition-colors ${tone === "dark" ? "text-white/60 hover:text-white" : "text-stone hover:text-graphite"}`}
              >
                <span className="font-bold">UPhi.Cloud</span>
                <span>— AI-Native Industry & Enterprise Platform</span>
              </a>
            </div>
            <p className={`mt-4 font-sans text-[11px] font-medium uppercase tracking-wider ${t.infra}`}>{footer.infrastructure}</p>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5 lg:col-span-8">
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
                  {(col.title === "Business" || col.title === "Resources") && (
                    <li>
                      <a
                        href="/getting-started"
                        className="inline-block py-0.5 text-[13px] font-bold text-sky-300 hover:text-white transition-colors"
                      >
                        Getting Started Guide
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Legal strip */}
        <div className={`mt-14 flex flex-wrap items-center justify-between gap-5 border-t pt-7 ${tone === "dark" ? "border-white/10" : "border-line"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 font-sans text-[11px] font-medium">
            <p className={`uppercase tracking-wider ${t.legal}`}>
              {footer.legalLine}
            </p>
            <a
              href="https://uphi.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 transition-colors ${tone === "dark" ? "text-white/70 hover:text-white" : "text-stone hover:text-graphite"}`}
            >
              <span className="font-bold">UPhi.Cloud</span>
              <span>— AI-Native Industry & Enterprise Platform</span>
            </a>
          </div>
          <a href="#page-content" aria-label="Back to page content" className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-300 ${t.top}`}>
            <Icon name="arrowUp" className="h-4 w-4" />
          </a>
        </div>
      </DigiContainer>
    </footer>
  );
}

