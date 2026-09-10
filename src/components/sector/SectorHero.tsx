import type { SectorConfig } from "@/lib/types";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  DigiTicker,
  Reveal,
} from "@/components/digione/primitives";

/** Electric underline stroke for the hero accent phrase. */
function AccentUnderline() {
  return (
    <svg
      viewBox="0 0 220 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute -bottom-1.5 left-0 h-2 w-full md:-bottom-2.5"
    >
      <path d="M2 6C60 2.5 160 2.5 218 5.5" stroke="var(--color-electric)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function SectorHero({ config }: { config: SectorConfig }) {
  const { hero } = config;
  const accentIndex = hero.statement.indexOf(hero.accentPhrase);
  const before = accentIndex >= 0 ? hero.statement.slice(0, accentIndex) : hero.statement;
  const accent = accentIndex >= 0 ? hero.statement.slice(accentIndex, accentIndex + hero.accentPhrase.length) : "";
  const after =
    accentIndex >= 0 ? hero.statement.slice(accentIndex + hero.accentPhrase.length) : "";

  return (
    <section id="top" className="relative overflow-hidden pt-12 md:pt-16">
      {/* Ambient architectural background */}
      <div
        aria-hidden="true"
        className="bg-blueprint absolute inset-0 [mask-image:linear-gradient(to_bottom,black_0%,black_52%,transparent_96%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -top-48 right-[-12%] h-[560px] w-[560px] rounded-full bg-soft blur-3xl"
      />

      <DigiContainer className="relative">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* ---- Narrative column ---- */}
          <div className="lg:col-span-6">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2.5">
                <DigiBadge variant="soft" dot>
                  {hero.eyebrow}
                </DigiBadge>
              </div>

              <h1 className="text-display mt-4 max-w-[540px] text-graphite uppercase tracking-tight font-extrabold leading-[1.08]">
                {before}
                {accent ? (
                  <span className="relative inline-block whitespace-nowrap">
                    {accent}
                    <AccentUnderline />
                  </span>
                ) : null}
                {after}
              </h1>

              {hero.substatement ? (
                <div className="mt-2.5 text-xs sm:text-sm md:text-[14px] font-bold uppercase tracking-wider text-royal">
                  {hero.substatement}
                </div>
              ) : null}

              <p className="text-lead mt-3.5 max-w-[560px] text-stone font-normal leading-relaxed">
                {hero.support}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <DigiButton href="/company/onboarding" icon="arrowRight" id="btn-hero-create-company">
                  CREATE YOUR AI-NATIVE COMPANY
                </DigiButton>
                <DigiButton href="#explorer" variant="secondary" icon="arrowRight" id="btn-hero-explore">
                  EXPLORE MARINEWORLD
                </DigiButton>
              </div>
            </Reveal>
          </div>

          {/* ---- Visual column: physical industry + digital infrastructure ---- */}
          <div className="lg:col-span-6">
            <Reveal delay={120}>
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 translate-x-3 translate-y-3 rounded-card-lg border border-line"
                />
                <figure className="relative overflow-hidden rounded-card-lg border border-line bg-white shadow-[0_24px_64px_rgba(17,17,19,0.08)]">
                  <div className="aspect-[6/5] overflow-hidden sm:aspect-[5/4] bg-slate-900">
                    <img
                      src="https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1600&q=80"
                      alt="Luxury mega yacht cruising on deep ocean waters across the marine ecosystem"
                      className="kenburns h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      fetchPriority="high"
                    />
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-graphite/60 to-transparent"
                  />

                  {/* Registry overlay meta */}
                  <figcaption className="absolute left-4 top-4 flex items-center gap-2.5 rounded-full bg-graphite/70 px-4 py-2.5 text-white backdrop-blur-sm">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute h-full w-full rounded-full bg-electric breathe" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-electric" />
                    </span>
                    <span className="font-sans text-[11px] font-medium tracking-wide">
                      {hero.visualMeta.coords} — {hero.visualMeta.label}
                    </span>
                  </figcaption>

                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="rounded-card-sm border border-white/20 bg-graphite/60 px-4 py-3 text-white backdrop-blur-sm">
                      <p className="eyebrow text-white/90">Physical Industry</p>
                      <p className="font-sans text-[10.5px] font-medium tracking-wider text-white/60 uppercase">
                        LAYER 01 — ASSETS & OPERATIONS
                      </p>
                    </div>
                    <div className="rounded-card-sm border border-white/20 bg-royal/85 px-4 py-3 text-white backdrop-blur-sm">
                      <p className="eyebrow text-white">Digital Infrastructure</p>
                      <p className="font-sans text-[10.5px] font-medium tracking-wider text-white/70 uppercase">
                        LAYER 02 — REGISTRY & AI
                      </p>
                    </div>
                  </div>
                </figure>

                {/* Floating live-registry nodes */}
                <div className="absolute -right-2 top-10 hidden w-[248px] md:block lg:-right-6">
                  <div className="rounded-card-sm border border-line bg-white px-4 py-3.5 shadow-[0_16px_40px_rgba(17,17,19,0.10)] transition-transform duration-500 ease-digi hover:-translate-y-0.5">
                    <div className="flex items-start gap-3">
                      <DigiIconContainer icon={hero.nodes[0]?.icon ?? "gantry"} mode="royal" size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold tracking-[-0.01em] text-graphite">
                          {hero.nodes[0]?.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-mute">{hero.nodes[0]?.line}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -left-2 bottom-24 hidden w-[264px] md:block lg:-left-8">
                  <div className="rounded-card-sm border border-line bg-white px-4 py-3.5 shadow-[0_16px_40px_rgba(17,17,19,0.10)] transition-transform duration-500 ease-digi hover:-translate-y-0.5">
                    <div className="flex items-start gap-3">
                      <DigiIconContainer icon={hero.nodes[1]?.icon ?? "doc"} mode="solid" size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold tracking-[-0.01em] text-graphite">
                          {hero.nodes[1]?.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-mute">{hero.nodes[1]?.line}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 right-6 hidden md:block">
                  <div className="flex items-center gap-2.5 rounded-full border border-line bg-white py-2.5 pl-3 pr-5 shadow-[0_16px_40px_rgba(17,17,19,0.10)]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute h-full w-full rounded-full bg-royal breathe" />
                      <span className="relative h-2 w-2 rounded-full bg-royal" />
                    </span>
                    <span className="eyebrow text-graphite">{hero.nodes[2]?.title}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Six Network Progression Steps (placed below visual & narrative, full width across grid) */}
        {hero.trust && hero.trust.length > 0 && (
          <Reveal delay={140}>
            <div className="mt-10 sm:mt-12 lg:mt-14 border-t border-line/80 pt-6 sm:pt-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 lg:gap-4">
                {hero.trust.map((item, i) => {
                  const isObject = typeof item === "object" && item !== null;
                  const indexStr: string = isObject ? item.index : String(i + 1).padStart(2, "0");
                  const titleStr: string = isObject ? item.title : String(item);
                  const descStr: string | null = isObject ? item.desc : null;

                  return (
                    <div
                      key={i}
                      className="group relative flex flex-col justify-start rounded-card-sm border border-line/70 bg-white/70 p-3.5 sm:p-4 backdrop-blur-xs transition-all duration-200 hover:border-royal/40 hover:bg-white hover:shadow-xs"
                    >
                      <div className="flex flex-col space-y-1.5">
                        <span className="font-sans text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wide text-royal">
                          {indexStr} - {titleStr}
                        </span>
                        {descStr && (
                          <p className="text-[11.5px] text-stone font-normal leading-relaxed">
                            {descStr}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        )}
      </DigiContainer>

      {/* Demonstration activity feed */}
      <div className="relative mt-10 md:mt-12">
        <DigiTicker items={config.activityFeed} label="Demonstration Feed" />
      </div>
    </section>
  );
}
