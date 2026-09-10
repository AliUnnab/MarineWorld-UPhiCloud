import type { CompanyProfile, SectorCity, IndustryDomainEntity } from "@/lib/types";
import { Icon } from "@/components/digione/icons";
import { DigiContainer } from "@/components/digione/primitives";

export function CompanyContextBar({
  company,
  primaryCity,
  parentDomain,
  activeModule,
  selectedProductName,
  selectedServiceName,
}: {
  company: CompanyProfile;
  primaryCity?: SectorCity;
  parentDomain?: IndustryDomainEntity;
  activeModule?: string;
  selectedProductName?: string;
  selectedServiceName?: string;
}) {
  const citySlug = primaryCity?.slug ?? "shipyard";
  const cityDomain = primaryCity?.domain ?? "SECTOR CITY";

  const companyHref = `/companies/${company.slug ?? company.id}`;

  const moduleLabelMap: Record<string, string> = {
    offerings: "OFFERINGS",
    showroom: "OFFERINGS",
    presence: "PRESENCE",
    "sector-city": "SECTOR CITY CONTEXT",
    network: "NETWORK NODES",
    solutions: "OFFERINGS",
    products: "PRODUCTS",
    services: "SERVICES",
    corporate: "CORPORATE",
    governance: "GOVERNANCE",
    connect: "CONNECT",
    metrics: "METRICS",
    "business-twin": "BUSINESS TWIN",
    chat: "CHAT / AI",
  };

  const isModulePage = Boolean(activeModule && activeModule !== "solutions" && activeModule !== "showroom" && activeModule !== "offerings");
  const moduleLabel = activeModule ? (moduleLabelMap[activeModule] ?? activeModule.toUpperCase()) : "";
  const productsHref = `${companyHref}/products`;
  const servicesHref = `${companyHref}/services`;

  const breadcrumbs = [
    { label: "MARINEWORLD", href: "/" },
    { label: "MARITIME CATEGORIES", href: "/industries" },
    {
      label: parentDomain ? parentDomain.name.toUpperCase() : "INDUSTRY DOMAIN",
      href: parentDomain ? `/industries/${parentDomain.slug}` : "/industries",
    },
    {
      label: cityDomain,
      href: `/cities/${citySlug}`,
    },
    {
      label: String(company.displayName || company.name || company.legalName || "COMPANY").toUpperCase(),
      href: isModulePage ? companyHref : null,
    },
    ...(isModulePage
      ? [
          {
            label: moduleLabel,
            href: selectedProductName
              ? productsHref
              : selectedServiceName
              ? servicesHref
              : null,
          },
        ]
      : []),
    ...(selectedProductName
      ? [
          {
            label: selectedProductName.toUpperCase(),
            href: null,
          },
        ]
      : []),
    ...(selectedServiceName
      ? [
          {
            label: selectedServiceName.toUpperCase(),
            href: null,
          },
        ]
      : []),
  ];

  return (
    <div className="border-b border-line bg-canvas py-3">
      <DigiContainer>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Context Breadcrumb */}
          <nav aria-label="Company Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-wide text-stone">
            {breadcrumbs.map((item, idx) => (
              <span key={item.label + idx} className="flex items-center gap-2">
                {idx > 0 && <span className="text-linesoft">/</span>}
                {item.href ? (
                  <a
                    href={item.href}
                    className="hover:text-graphite transition-colors underline-offset-2 hover:underline"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="font-semibold text-graphite">{item.label}</span>
                )}
              </span>
            ))}
          </nav>

          {/* Back to City Button */}
          <a
            href={`/cities/${citySlug}`}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto font-mono text-[11.5px] font-semibold text-royal hover:text-graphite transition-colors"
          >
            <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180" />
            <span>BACK TO {cityDomain}</span>
          </a>
        </div>
      </DigiContainer>
    </div>
  );
}
