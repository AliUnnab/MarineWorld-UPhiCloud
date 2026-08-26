import { useState, type FormEvent } from "react";
import type { SectorConfig } from "@/lib/types";
import { PageShell } from "@/components/foundation/PageShell";
import { Icon } from "@/components/digione/icons";
import {
  DigiBadge,
  DigiButton,
  DigiContainer,
  DigiIconContainer,
  Reveal,
} from "@/components/digione/primitives";
import { getCities } from "@/lib/registry";

export function CityEntrancePage({
  config,
  cityId,
}: {
  config: SectorConfig;
  cityId: string;
}) {
  const cities = getCities(config);
  const city = cities.find((c) => c.id === cityId) ?? cities[0];

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"standard" | "twin" | "enterprise">("twin");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !email.trim()) return;
    setSubmitted(true);
  };

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: city.code, href: `/cities/${city.slug}` },
    { label: "PORTAL ENTRANCE" },
  ];

  return (
    <PageShell
      config={config}
      breadcrumbs={breadcrumbs}
      metadata={{
        title: `${city.domain} Portal Entrance | MarineWorld.City`,
        description: `Register and establish digital presence in ${city.domain}.`,
      }}
    >
      <div className="py-12 md:py-16 pb-24">
        <DigiContainer>

          <div className="mt-8 grid gap-10 lg:grid-cols-12">
            {/* Context Column */}
            <div className="lg:col-span-5">
              <Reveal>
                <DigiBadge variant="soft" dot dotClass="bg-electric">
                  PLACEMENT APPLICATION
                </DigiBadge>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-4 text-graphite tracking-tight break-words leading-tight max-w-full">
                  Join <span className="break-all">{city.domain}</span>
                </h1>

                <p className="text-lead mt-5 text-stone">
                  Establish your verified business presence in {city.domain}. Connect your products, services, and operations directly to the unified maritime sector network.
                </p>

                <div className="mt-8 space-y-4 rounded-card-md border border-line bg-white p-6">
                  <div className="flex items-center gap-3">
                    <DigiIconContainer icon={city.icon} mode="royal" size={40} />
                    <div>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">
                        Target City
                      </p>
                      <p className="text-[15px] font-semibold text-graphite">{city.domain}</p>
                    </div>
                  </div>

                  <div className="border-t border-line pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                      Domain Category
                    </p>
                    <p className="text-[13.5px] font-medium text-graphite">{city.category}</p>
                  </div>

                  <div className="border-t border-line pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                      Verification Standard
                    </p>
                    <p className="text-[13.5px] font-medium text-graphite">
                      Industry Standard Accreditation
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Portal Form Column */}
            <div className="lg:col-span-7">
              <Reveal delay={100}>
                <div className="rounded-card-lg border border-line bg-white p-8 md:p-10 shadow-sm">
                  {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <h2 className="text-h2 text-graphite">Placement Application</h2>
                        <p className="mt-1 text-[13.5px] text-stone">
                          Submit your company details to request a verified placement in {city.domain}.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label htmlFor="company-name" className="block text-[13px] font-semibold text-graphite mb-1.5">
                            Company Name
                          </label>
                          <input
                            id="company-name"
                            type="text"
                            required
                            placeholder="e.g. Nordic Shipbuilding Group"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full rounded-card-sm border border-line bg-canvas px-4 py-2.5 text-[14px] text-graphite focus:border-royal focus:bg-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label htmlFor="official-email" className="block text-[13px] font-semibold text-graphite mb-1.5">
                            Official Contact Email
                          </label>
                          <input
                            id="official-email"
                            type="email"
                            required
                            placeholder="e.g. contact@nordicshipbuilding.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-card-sm border border-line bg-canvas px-4 py-2.5 text-[14px] text-graphite focus:border-royal focus:bg-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[13px] font-semibold text-graphite mb-2">
                            Placement Tier
                          </label>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <button
                              type="button"
                              onClick={() => setTier("standard")}
                              className={`rounded-card-sm border p-4 text-left transition-all ${
                                tier === "standard"
                                  ? "border-royal bg-soft/50 ring-1 ring-royal"
                                  : "border-line bg-canvas hover:border-line-dark"
                              }`}
                            >
                              <p className="text-[13px] font-bold text-graphite">Commercial Presence</p>
                              <p className="mt-1 text-[11px] text-mute">Standard company presence and verified status</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => setTier("twin")}
                              className={`rounded-card-sm border p-4 text-left transition-all ${
                                tier === "twin"
                                  ? "border-royal bg-soft/50 ring-1 ring-royal"
                                  : "border-line bg-canvas hover:border-line-dark"
                              }`}
                            >
                              <p className="text-[13px] font-bold text-graphite">Featured Showcase</p>
                              <p className="mt-1 text-[11px] text-mute">Flagship-tier gallery placement with logo and description</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => setTier("enterprise")}
                              className={`rounded-card-sm border p-4 text-left transition-all ${
                                tier === "enterprise"
                                  ? "border-royal bg-soft/50 ring-1 ring-royal"
                                  : "border-line bg-canvas hover:border-line-dark"
                              }`}
                            >
                              <p className="text-[13px] font-bold text-graphite">Landmark Placement</p>
                              <p className="mt-1 text-[11px] text-mute">Premium anchor position with maximum visibility</p>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-line pt-6">
                        <DigiButton type="submit" size="md" className="w-full" icon="arrowRight">
                          Request Placement
                        </DigiButton>
                        <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                          Demonstration Portal · No charges incurred
                        </p>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6 text-center py-6">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-soft text-royal">
                        <Icon name="check" className="h-8 w-8" strokeWidth={2.2} />
                      </div>

                      <div>
                        <DigiBadge variant="soft">APPLICATION RECEIVED</DigiBadge>
                        <h2 className="text-h2 mt-3 text-graphite">
                          Application Submitted for {companyName}
                        </h2>
                        <p className="mt-2 text-[14px] leading-relaxed text-stone max-w-md mx-auto">
                          Your application for a verified placement in {city.domain} under <span className="font-mono font-semibold">{email}</span> has been successfully received.
                        </p>
                      </div>

                      <div className="rounded-card-sm border border-line bg-mist p-5 text-left text-[12.5px] space-y-2 font-mono">
                        <div className="flex justify-between">
                          <span className="text-mute">Status:</span>
                          <span className="text-emerald-600 font-semibold">PENDING VERIFICATION</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-mute">Target Domain:</span>
                          <span className="text-graphite">{city.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-mute">Placement Tier:</span>
                          <span className="text-royal font-semibold">{tier.toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-wrap gap-3 justify-center">
                        <DigiButton href={`/cities/${city.slug}`}>
                          Back to {city.code}
                        </DigiButton>
                        <DigiButton href="/" variant="secondary">
                          Return to Maritime World
                        </DigiButton>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </DigiContainer>
      </div>
    </PageShell>
  );
}
