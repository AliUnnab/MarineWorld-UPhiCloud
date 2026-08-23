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
    <section id="top" className="relative overflow-hidden pt-28 md:pt-40">
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
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-10">
          {/* ---- Narrative column ---- */}
          <div className="lg:col-span-6">
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <DigiBadge variant="soft" dot>
                  {hero.eyebrow}
                </DigiBadge>
                <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-mute">
                  {config.sectorCode} / {config.sectorId}
                </span>
              </div>

              <h1 className="text-display mt-7 text-graphite">
                {before}
                {accent ? (
                  <span className="relative inline-block whitespace-nowrap">
                    {accent}
                    <AccentUnderline />
                  </span>
                ) : null}
                {after}
              </h1>

              <p className="text-lead mt-7 max-w-[540px] text-stone">{hero.support}</p>

              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                <DigiButton href="/gateway" icon="arrowRight" id="btn-hero-enter">
                  ENTER
                </DigiButton>
                <DigiButton href="#explorer" variant="secondary" id="btn-hero-explore">
                  Explore MarineWorld
                </DigiButton>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <dl className="mt-12 grid gap-5 border-t border-line pt-7 sm:grid-cols-3">
                {hero.trust.map((item, i) => (
                  <div key={item} className="flex items-start gap-3">
                    <dt className="sr-only">Platform assurance {i + 1}</dt>
                    <dd className="eyebrow leading-[1.5] text-mute">
                      <span className="mb-1.5 block font-sans text-[11px] font-bold tracking-wider text-royal/80">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item}
                    </dd>
                  </div>
                ))}
              </dl>
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
                      src="https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1600&q=80"
                      alt="Commercial deep-water port, container vessels and maritime shipyard infrastructure"
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
      </DigiContainer>

      {/* Demonstration activity feed */}
      <div className="relative mt-20 md:mt-24">
        <DigiTicker items={config.activityFeed} label="Demonstration Feed" />
      </div>
    </section>
  );
}
