import type { CompanyProfile } from "@/lib/types";
import { Icon } from "@/components/digione/icons";

/**
 * CompanyCard — a company rendered as a structured business entity.
 * Serves as an ENTRY POINT into the company's digital operating environment.
 * Reusable across Sector Cities, Domain listings, and Network views.
 */
export function CompanyCard({
  company,
  context,
  showEntryPoint = true,
}: {
  company: CompanyProfile;
  context?: { city: string; domain: string; category: string };
  showEntryPoint?: boolean;
}) {
  const verified = company.verificationStatus === "verified";
  const twin = company.aiStatus === "twin";
  const companySlug = company.slug ?? company.id;

  return (
    <article className="group flex h-full flex-col rounded-card-lg border border-line bg-white p-6 transition-all duration-300 ease-digi hover:-translate-y-0.5 hover:border-royal/40 hover:shadow-[0_12px_32px_rgba(17,17,19,0.06)]">
      <div className="flex items-start justify-between">
        {/* Monogram */}
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-icon border border-graphite bg-graphite text-[12.5px] font-semibold tracking-wide text-white"
          aria-hidden="true"
        >
          {company.initials}
        </span>
        {company.recordType === "DEMONSTRATION" ? (
          <span className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-[10px] font-sans font-semibold uppercase tracking-wider text-stone">
            Demo Record
          </span>
        ) : verified ? (
          <span className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-1 text-[10px] font-sans font-semibold uppercase tracking-wider text-royal">
            <Icon name="check" className="h-3 w-3" strokeWidth={2.2} />
            Verified Node
          </span>
        ) : (
          <span className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-[10px] font-sans font-semibold uppercase tracking-wider text-stone">
            KYB Review
          </span>
        )}
      </div>

      <h3 className="mt-5 text-[16.5px] font-semibold tracking-[-0.02em] text-graphite group-hover:text-royal transition-colors">
        <a href={`/companies/${companySlug}`} className="focus:outline-none">
          <span className="absolute inset-0" aria-hidden="true" />
          {company.name}
        </a>
      </h3>

      <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-mute">{company.industry}</p>

      <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-stone">
        <Icon name="pin" className="h-3.5 w-3.5 text-mute shrink-0" />
        <span>{company.location}</span>
      </p>

      {context ? (
        <p className="mt-2 font-sans text-[10.5px] font-medium uppercase tracking-wider text-mute">
          {context.city} · {context.domain}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Capabilities">
        {company.capabilities.map((cap) => (
          <li
            key={cap}
            className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] text-stone"
          >
            {cap}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center justify-between border-t border-linesoft pt-4">
        <span className="flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-wider text-stone">
          <span className="relative flex h-1.5 w-1.5">
            {twin ? <span className="absolute h-full w-full rounded-full bg-electric breathe" /> : null}
            <span className={`relative h-1.5 w-1.5 rounded-full ${twin ? "bg-electric" : "bg-mute"}`} />
          </span>
          {twin ? "AI Twin Active" : "AI Ready"}
        </span>

        {showEntryPoint ? (
          <span className="relative z-10 flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider text-royal group-hover:translate-x-0.5 transition-transform">
            <span>ENTER COMPANY</span>
            <Icon name="arrowRight" className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="font-sans text-[10.5px] font-semibold tracking-wider text-mute">{company.city}</span>
        )}
      </div>
    </article>
  );
}
