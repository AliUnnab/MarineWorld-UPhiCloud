import type { SectorConfig } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import { DigiContainer, DigiSection, DigiSectionHeader, Reveal } from "@/components/digione/primitives";
import { CompanyCard } from "@/components/foundation";
import { getCompanies } from "@/lib/registry";

/**
 * Business Ecosystem — companies as structured, verifiable entities.
 * All profiles are clearly marked demonstration data.
 */
export function SectorNetwork({ config }: { config: SectorConfig }) {
  const { network } = config;
  const companies = getCompanies(config);

  return (
    <DigiSection id="network">
      <DigiContainer>
        <Reveal>
          <DigiSectionHeader
            id="network-title"
            index="04 / ECOSYSTEM"
            eyebrow={network.eyebrow}
            title={network.headline}
            lead={network.lead}
          />
        </Reveal>

        <Reveal delay={80}>
          <p className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-line bg-mist px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-wider text-stone">
            <Icon name="scan" className="h-3.5 w-3.5 text-royal" />
            {network.demoNotice}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company, i) => (
            <Reveal key={company.id} delay={(i % 3) * 70} className="h-full">
              <CompanyCard company={company} />
            </Reveal>
          ))}
        </div>
      </DigiContainer>
    </DigiSection>
  );
}
