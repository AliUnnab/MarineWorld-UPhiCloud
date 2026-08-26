import React from "react";
import type { SectorConfig } from "@/lib/types";
import { LogoMark } from "@/components/digione/icons";
import { DigiContainer } from "@/components/digione/primitives";
import { BookOpen } from "lucide-react";

export function Footer({ config }: { config: SectorConfig }) {
  const { footer } = config;

  return (
    <footer className="border-t border-line bg-graphite text-white pt-16 pb-12 font-sans">
      <DigiContainer>
        {/* BUSINESS SETUP GUIDE / GETTING STARTED FOOTER SECTION */}
        <div className="mb-12 p-5 rounded-2xl border border-white/15 bg-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-royal text-white shadow-sm shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  BUSINESS SETUP GUIDE
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-royal text-white rounded">
                  Platform Guide
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1 max-w-2xl leading-relaxed">
                Learn how to establish your company presence, connect your business knowledge, publish your products and services, and start receiving business opportunities.
              </p>
            </div>
          </div>

          <a
            href="/getting-started"
            className="px-5 py-2.5 rounded-xl bg-white text-royal hover:bg-slate-100 font-bold text-xs transition shadow-sm flex items-center gap-2 shrink-0 border border-slate-200"
          >
            <span className="font-extrabold text-royal">GETTING STARTED GUIDE →</span>
          </a>
        </div>

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
              <p className="text-electric font-semibold uppercase tracking-wider text-[10px]">Infrastructure & AI Platform</p>
              <a
                href="https://uphi.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 font-bold text-white hover:text-royal transition"
              >
                <span>UPhi.Cloud</span>
                <span className="text-white/60 font-normal text-[11.5px]">— AI-Native Industry & Enterprise Platform</span>
              </a>
            </div>
          </div>

          {/* Nav Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
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
                  {(col.title === "Business" || col.title === "Resources") && (
                    <li>
                      <a
                        href="/getting-started"
                        className="text-[13.5px] text-sky-300 font-bold hover:text-white transition-colors"
                      >
                        Getting Started Guide
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8 font-sans text-[11px] text-white/40">
          <p>{footer.legalLine}</p>
          <a
            href="https://uphi.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
          >
            <span className="font-bold text-white">UPhi.Cloud</span>
            <span>— AI-Native Industry & Enterprise Platform</span>
          </a>
        </div>
      </DigiContainer>
    </footer>
  );
}

