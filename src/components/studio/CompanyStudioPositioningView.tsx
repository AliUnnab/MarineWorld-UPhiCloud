import React, { useState, useEffect, useMemo } from "react";
import {
  Compass,
  CheckCircle2,
  Tag,
  Globe2,
  Save,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Network,
  Cpu,
  Search,
  Building2,
  MapPin,
  Filter,
  Plus,
  X,
  Radio,
  Layers,
  Info,
  Check,
  ArrowRight,
} from "lucide-react";
import type { CompanyEntity, CompanyProfile, CompanyNodeEntity } from "@/lib/types";
import { getCompanyById, saveCompany, getCompanyNodes } from "@/lib/services/companyService";
import { updateCompanyCapabilities, CANONICAL_CAPABILITIES_TAXONOMY } from "@/lib/businessTwinStore";
import { marineSector } from "@/lib/sectors/marine";
import { getCompanyBySlug } from "@/lib/registry";
import { recordPositioningAudit } from "@/lib/services/auditService";

const AVAILABLE_SECTORS = [
  "Marine & Maritime",
  "Maritime Technology & AI Systems",
  "Shipyard & Refit Engineering",
  "Offshore & Energy",
  "Commercial Shipping & Freight",
  "Yachting & Superyacht Services",
  "Subsea Robotics & Survey",
];

const AVAILABLE_INDUSTRY_DOMAINS = [
  { id: "maritime-services", label: "Maritime Services, Ports & Operations" },
  { id: "shipbuilding-production", label: "Shipbuilding, Repair & Production" },
  { id: "engineering-design", label: "Engineering & Naval Architecture" },
  { id: "marine-technology", label: "Maritime Technology & AI Systems" },
  { id: "finance-legal", label: "Legal, Finance & Risk Compliance" },
  { id: "offshore-subsea", label: "Offshore, Energy & Subsea" },
  { id: "vessel-operations", label: "Vessel Operations & Fleet Management" },
  { id: "vessel-sales", label: "Yachting, Charter & Commercial Sales" },
  { id: "lifestyle-hospitality", label: "Maritime Hospitality & Waterfront Lifestyle" },
];

const AVAILABLE_SPECIALIZED_DOMAINS = [
  "Propulsion & Clean Energy",
  "Autonomous Systems & Robotics",
  "Naval Architecture & Composite Materials",
  "Subsea Acoustics & Hydrography",
  "Class Certification & NDT Inspection",
  "Harbor & Port Logistics",
  "Marine Procurement & Spare Parts",
  "Vessel Telemetry & Performance CFD",
  "Maritime Cybersecurity & Fleet Comms",
  "Green Fuel Bunkering (Methanol/Hydrogen)",
  "Superyacht Refit & Interior Fitout",
  "Subsea ROV & Cable Laying",
];

const AVAILABLE_REGIONAL_EDITIONS = [
  { code: "GLOBAL", label: "Global Network Edition" },
  { code: "NORTH_EUROPE", label: "Northern Europe (Rotterdam / Hamburg / Southampton)" },
  { code: "MEDITERRANEAN", label: "Mediterranean (Monaco / Genoa / Athens)" },
  { code: "NORTH_AMERICA", label: "North America (Fort Lauderdale / Seattle)" },
  { code: "CARIBBEAN", label: "Caribbean (St. Maarten / Antigua)" },
  { code: "MIDDLE_EAST", label: "Middle East (Dubai / Abu Dhabi / Doha)" },
  { code: "ASIA_PACIFIC", label: "Asia Pacific (Singapore / Tokyo / Sydney)" },
];

const COMMON_COUNTRIES = [
  "Netherlands",
  "Germany",
  "United Kingdom",
  "Norway",
  "France",
  "Italy",
  "Greece",
  "Spain",
  "Turkey",
  "United States",
  "United Arab Emirates",
  "Singapore",
  "Japan",
  "Australia",
  "Monaco",
  "Belgium",
  "Denmark",
  "Sweden",
  "Finland",
  "Panama",
  "Saudi Arabia",
  "Qatar",
];

interface CompanyStudioPositioningViewProps {
  companyId: string;
  onSaved?: () => void;
}

export const CompanyStudioPositioningView: React.FC<CompanyStudioPositioningViewProps> = ({
  companyId,
  onSaved,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Master List of all 25 MarineWorld Sector Cities
  const masterSectorCities = useMemo(() => {
    return marineSector.explorer.cities.map((city) => ({
      id: city.id,
      slug: city.slug,
      domain: city.domain,
      code: city.code,
      name: city.shortDescription || city.description || `${city.domain} Node`,
      category: city.category,
      industryDomainId: city.industryDomainId,
      description: city.description,
      scope: city.scope || [],
    }));
  }, []);

  // Filter Categories for Sector Cities
  const cityCategories = useMemo(() => {
    const set = new Set<string>();
    masterSectorCities.forEach((c) => set.add(c.category));
    return ["ALL", ...Array.from(set)];
  }, [masterSectorCities]);

  // Resolve Canonical Company
  const canonicalCompany =
    getCompanyById(companyId) ||
    (getCompanyBySlug(marineSector, companyId) as unknown as CompanyEntity);

  // Operating Nodes (Physical presence loaded independently)
  const [operatingNodes, setOperatingNodes] = useState<CompanyNodeEntity[]>([]);

  // 1. Primary Sector
  const [primarySector, setPrimarySector] = useState(
    (canonicalCompany as any)?.primarySectorCategory ||
      canonicalCompany?.industry ||
      "Marine & Maritime"
  );

  // 2. Industry Domain
  const [industryDomain, setIndustryDomain] = useState(
    canonicalCompany?.sectorId || "maritime-services"
  );

  // 3. Specialized Domains
  const [specializedDomains, setSpecializedDomains] = useState<string[]>(
    (canonicalCompany as any)?.specializedDomains ||
      (canonicalCompany as any)?.secondaryDomains || [
        "Propulsion & Clean Energy",
        "Naval Architecture & Composite Materials",
      ]
  );

  // 4. Organizational Capabilities
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(
    (canonicalCompany as any)?.capabilities && (canonicalCompany as any)?.capabilities.length > 0
      ? (canonicalCompany as any).capabilities
      : ["ENGINEERING & DESIGN", "MAINTENANCE", "SYSTEM INTEGRATION"]
  );

  // 5. PRIMARY REGISTERED SECTOR CITY (Mandatory, exactly 1)
  const initialRegisteredCity =
    (canonicalCompany as any)?.registeredSectorCity ||
    canonicalCompany?.primarySectorCityId ||
    canonicalCompany?.sectorCityId ||
    "shipyard";
  const [registeredSectorCity, setRegisteredSectorCity] = useState<string>(initialRegisteredCity);

  // 6. PARTICIPATING SECTOR CITIES (Multi-select, Maximum 5)
  const initialParticipating =
    (canonicalCompany as any)?.participatingSectorCities ||
    canonicalCompany?.sectorCityIds || [initialRegisteredCity, "supplychain", "procurement"];
  const [participatingSectorCities, setParticipatingSectorCities] =
    useState<string[]>(initialParticipating);

  // 7. REGIONAL OPERATING EDITIONS
  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    (canonicalCompany as any)?.regionalEditions || ["NORTH_EUROPE", "MEDITERRANEAN"]
  );

  // 8. COUNTRY / MARKET COVERAGE
  const [countriesServed, setCountriesServed] = useState<string[]>(
    (canonicalCompany as any)?.countriesServed || [
      canonicalCompany?.country || "Netherlands",
      "Germany",
      "United Kingdom",
      "Norway",
    ]
  );
  const [customCountryInput, setCustomCountryInput] = useState("");

  // Sector City Explorer UI States
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [selectedCityCategory, setSelectedCityCategory] = useState("ALL");

  useEffect(() => {
    const comp =
      getCompanyById(companyId) ||
      (getCompanyBySlug(marineSector, companyId) as unknown as CompanyEntity);
    if (comp) {
      setPrimarySector(
        (comp as any)?.primarySectorCategory || comp.industry || "Marine & Maritime"
      );
      setIndustryDomain(comp.sectorId || "maritime-services");
      if ((comp as any)?.capabilities?.length > 0) {
        setSelectedCapabilities((comp as any).capabilities);
      }
      if ((comp as any)?.registeredSectorCity) {
        setRegisteredSectorCity((comp as any).registeredSectorCity);
      } else if (comp.primarySectorCityId) {
        setRegisteredSectorCity(comp.primarySectorCityId);
      }
      if ((comp as any)?.participatingSectorCities?.length > 0) {
        setParticipatingSectorCities((comp as any).participatingSectorCities);
      } else if (comp.sectorCityIds?.length > 0) {
        setParticipatingSectorCities(comp.sectorCityIds);
      }
      if ((comp as any)?.specializedDomains?.length > 0) {
        setSpecializedDomains((comp as any).specializedDomains);
      } else if ((comp as any)?.secondaryDomains?.length > 0) {
        setSpecializedDomains((comp as any).secondaryDomains);
      }
      if ((comp as any)?.regionalEditions?.length > 0) {
        setSelectedRegions((comp as any).regionalEditions);
      }
      if ((comp as any)?.countriesServed?.length > 0) {
        setCountriesServed((comp as any).countriesServed);
      }
    }

    // Load physical operating nodes
    try {
      const nodes = getCompanyNodes(companyId);
      setOperatingNodes(nodes);
    } catch {
      setOperatingNodes([]);
    }
  }, [companyId]);

  // Derived Registered Sector City Object
  const registeredCityObj = useMemo(() => {
    return (
      masterSectorCities.find((c) => c.id === registeredSectorCity) || {
        id: registeredSectorCity,
        slug: registeredSectorCity,
        domain: `${registeredSectorCity.toUpperCase()}.CITY`,
        code: "REG --",
        name: "Canonical Sector City",
        category: "Sector City",
      }
    );
  }, [masterSectorCities, registeredSectorCity]);

  // Filtered master sector cities for search & category
  const filteredSectorCities = useMemo(() => {
    return masterSectorCities.filter((city) => {
      const matchesCategory =
        selectedCityCategory === "ALL" || city.category === selectedCityCategory;
      const q = citySearchQuery.trim().toLowerCase();
      if (!q) return matchesCategory;
      const matchesSearch =
        city.domain.toLowerCase().includes(q) ||
        city.name.toLowerCase().includes(q) ||
        city.code.toLowerCase().includes(q) ||
        city.category.toLowerCase().includes(q) ||
        city.scope.some((s) => s.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [masterSectorCities, selectedCityCategory, citySearchQuery]);

  // Toggle Participating Sector City (Maximum 5)
  const toggleParticipatingCity = (cityId: string) => {
    setParticipatingSectorCities((prev) => {
      if (prev.includes(cityId)) {
        return prev.filter((id) => id !== cityId);
      }
      if (prev.length >= 5) {
        return prev; // Block selection beyond 5
      }
      return [...prev, cityId];
    });
  };

  // Set Registered Sector City (Mandatory 1)
  const handleSelectRegisteredCity = (cityId: string) => {
    setRegisteredSectorCity(cityId);
  };

  // Toggle Capability
  const toggleCapability = (cap: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  // Toggle Specialized Domain
  const toggleSpecializedDomain = (dom: string) => {
    setSpecializedDomains((prev) =>
      prev.includes(dom) ? prev.filter((d) => d !== dom) : [...prev, dom]
    );
  };

  // Toggle Regional Edition
  const toggleRegion = (code: string) => {
    setSelectedRegions((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]
    );
  };

  // Country Management
  const toggleCountry = (country: string) => {
    setCountriesServed((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
    );
  };

  const handleAddCustomCountry = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customCountryInput.trim();
    if (!clean) return;
    if (!countriesServed.includes(clean)) {
      setCountriesServed((prev) => [...prev, clean]);
    }
    setCustomCountryInput("");
  };

  const removeCountry = (country: string) => {
    setCountriesServed((prev) => prev.filter((c) => c !== country));
  };

  // Derived Industry Domain Label
  const industryDomainLabel = useMemo(() => {
    const found = AVAILABLE_INDUSTRY_DOMAINS.find((d) => d.id === industryDomain);
    return found ? found.label : industryDomain.toUpperCase();
  }, [industryDomain]);

  // Derived Routing Status
  const routingStatus = useMemo(() => {
    if (participatingSectorCities.length <= 1) {
      return "Single-City Registered Routing";
    }
    return `Multi-City Routing (${participatingSectorCities.length} Active Nodes)`;
  }, [participatingSectorCities.length]);

  // Save handler
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!registeredSectorCity) {
      setErrorMessage("Please select a Primary Registered Sector City.");
      return;
    }

    if (selectedCapabilities.length === 0) {
      setErrorMessage("Please select at least one organizational capability.");
      return;
    }

    if (participatingSectorCities.length > 5) {
      setErrorMessage("Maximum 5 participating Sector Cities allowed.");
      return;
    }

    try {
      if (!canonicalCompany) {
        setErrorMessage("Canonical company could not be resolved.");
        return;
      }

      const updated: CompanyEntity = {
        ...canonicalCompany,
        sectorId: industryDomain,
        primarySectorCityId: registeredSectorCity,
        registeredSectorCity: registeredSectorCity,
        sectorCityId: registeredSectorCity,
        sectorCityIds: participatingSectorCities,
        participatingSectorCities: participatingSectorCities,
        specializedDomains: specializedDomains,
        countriesServed: countriesServed,
        regionalEditions: selectedRegions,
        updatedAt: new Date().toISOString(),
      };

      (updated as any).primarySectorCategory = primarySector;
      (updated as any).capabilities = selectedCapabilities;
      (updated as any).secondaryDomains = specializedDomains;

      saveCompany(updated);

      // Sync capabilities to twin store
      updateCompanyCapabilities(updated as unknown as CompanyProfile, selectedCapabilities);

      // Canonical Audit Ledger dispatch
      recordPositioningAudit(
        updated.id,
        updated.id,
        {
          previous: {
            primarySectorCategory: (canonicalCompany as any)?.primarySectorCategory || canonicalCompany?.industry,
            sectorId: canonicalCompany.sectorId,
            primarySectorCityId: canonicalCompany.primarySectorCityId,
            capabilities: (canonicalCompany as any)?.capabilities,
          },
          next: {
            primarySectorCategory: primarySector,
            sectorId: industryDomain,
            primarySectorCityId: registeredSectorCity,
            capabilities: selectedCapabilities,
          },
        },
        "Updated company sector positioning, domain classification, and capability taxonomy"
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      if (onSaved) onSaved();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update company positioning.");
    }
  };

  return (
    <div className="space-y-6" id="module-02-positioning-view">
      {/* 1. PAGE HEADER */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-royal font-bold uppercase tracking-wider">
              <span>MarineWorld.City</span>
              <span>•</span>
              <span>02 — Positioning</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-graphite tracking-tight">
              Sector Positioning & Digital Taxonomy
            </h1>
            <p className="text-sm font-medium text-stone">
              Define where your company operates, what it does, and how MarineWorld should classify it.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-royal/10 border border-royal/20 text-royal text-xs font-mono font-bold flex items-center gap-2 shadow-2xs">
              <Compass className="w-4 h-4 text-royal shrink-0" />
              <div className="text-left">
                <div className="text-[10px] text-royal/80 uppercase tracking-wider">REGISTERED CITY</div>
                <div className="text-xs font-black">{registeredCityObj.domain}</div>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-canvas border border-line text-graphite text-xs font-mono font-bold flex items-center gap-2 shadow-2xs">
              <Network className="w-4 h-4 text-stone shrink-0" />
              <div className="text-left">
                <div className="text-[10px] text-stone uppercase tracking-wider">SERVICE PRESENCE</div>
                <div className="text-xs font-black">{participatingSectorCities.length} / 5 CITIES</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. POSITIONING EXPLANATION (4 Institutional Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-line">
          <div className="p-3 rounded-lg bg-canvas border border-line/60 space-y-0.5">
            <div className="text-[9px] font-mono font-bold text-royal uppercase tracking-wider">
              WHAT IS THIS?
            </div>
            <p className="text-[11px] text-stone leading-normal">
              Your company's verified position within the MarineWorld industry taxonomy.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-canvas border border-line/60 space-y-0.5">
            <div className="text-[9px] font-mono font-bold text-royal uppercase tracking-wider">
              WHAT DO I PROVIDE?
            </div>
            <p className="text-[11px] text-stone leading-normal">
              Primary sector, specialized domains, capabilities, registered Sector City, service presence, and geographic coverage.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-canvas border border-line/60 space-y-0.5">
            <div className="text-[9px] font-mono font-bold text-royal uppercase tracking-wider">
              WHAT IS ALREADY READY?
            </div>
            <p className="text-[11px] text-stone leading-normal">
              MarineWorld's standard industry ontology, routing structure and sector-city taxonomy.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-canvas border border-line/60 space-y-0.5">
            <div className="text-[9px] font-mono font-bold text-royal uppercase tracking-wider">
              WHAT WILL THIS CHANGE?
            </div>
            <p className="text-[11px] text-stone leading-normal">
              Improves company discovery, sector routing, AI grounding, directory placement and relevant B2B matching.
            </p>
          </div>
        </div>
      </div>

      {/* 3. SECTION 9: YOUR MARINEWORLD POSITION (Canonical Hierarchy & Live Summary) */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-royal" />
              <h2 className="text-base font-bold text-graphite">
                YOUR MARINEWORLD POSITION
              </h2>
            </div>
            <p className="text-xs text-stone mt-0.5">
              Canonical company hierarchy, active service networks, capabilities, and geographic coverage.
            </p>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
            CANONICAL REGISTRATION SUMMARY
          </span>
        </div>

        {/* 9.A: REGISTERED POSITION (Canonical Hierarchy) */}
        <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider flex items-center gap-1.5">
              <span>REGISTERED POSITION</span>
              <span className="text-royal font-normal">• 1 CANONICAL POSITION</span>
            </div>
            <span className="text-[10px] font-mono font-semibold text-stone">
              STRICT CANONICAL TRAIL
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Level 1: Platform */}
            <span className="px-3 py-1.5 rounded-lg bg-graphite text-white font-bold text-[11px] shadow-2xs">
              MARINEWORLD
            </span>

            <ChevronRight className="w-4 h-4 text-stone shrink-0" />

            {/* Level 2: Maritime Category */}
            <span className="px-3 py-1.5 rounded-lg bg-royal text-white font-bold text-[11px] shadow-2xs">
              {primarySector.toUpperCase()}
            </span>

            <ChevronRight className="w-4 h-4 text-stone shrink-0" />

            {/* Level 3: Industry Domain */}
            <span className="px-3 py-1.5 rounded-lg bg-white border border-royal/30 text-royal font-bold text-[11px]">
              {industryDomainLabel.toUpperCase()}
            </span>

            <ChevronRight className="w-4 h-4 text-stone shrink-0" />

            {/* Level 4: PRIMARY REGISTERED SECTOR CITY ONLY */}
            <span className="px-3 py-1.5 rounded-lg bg-royal/10 border-2 border-royal text-royal font-black text-[11px] flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-royal shrink-0" />
              {registeredCityObj.domain}
              <span className="px-1 py-0.2 bg-royal text-white text-[8px] font-mono rounded">REGISTERED</span>
            </span>

            <ChevronRight className="w-4 h-4 text-stone shrink-0" />

            {/* Level 5: Verified Company */}
            <span className="px-3 py-1.5 rounded-lg bg-white border border-line text-graphite font-black text-[11px]">
              {canonicalCompany?.displayName || canonicalCompany?.legalName || "Verified Company"}
            </span>
          </div>
        </div>

        {/* 9.B: SERVICE & NETWORK PRESENCE (X / 5 Sector Cities) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-graphite font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>SERVICE & NETWORK PRESENCE</span>
              <span className="text-royal font-bold">({participatingSectorCities.length} / 5 SECTOR CITIES)</span>
            </span>
            <span className="text-[10px] font-mono text-stone">
              Multi-City B2B Routing & Service Discovery
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {participatingSectorCities.length === 0 ? (
              <div className="text-xs text-stone italic p-3 bg-canvas rounded-lg border border-line w-full">
                No active service sector cities selected. Select up to 5 participating cities below.
              </div>
            ) : (
              participatingSectorCities.map((cityId) => {
                const city = masterSectorCities.find((c) => c.id === cityId);
                const isRegistered = cityId === registeredSectorCity;
                return (
                  <div
                    key={cityId}
                    className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                      isRegistered
                        ? "bg-royal/5 border-royal/40 text-royal font-bold"
                        : "bg-canvas border-line text-graphite font-medium"
                    }`}
                  >
                    <Network className="w-3.5 h-3.5 text-royal shrink-0" />
                    <span>{city?.domain || `${cityId.toUpperCase()}.CITY`}</span>
                    {isRegistered && (
                      <span className="px-1.5 py-0.5 bg-royal text-white text-[8px] font-mono font-bold rounded">
                        REGISTERED
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-mono font-bold rounded">
                      ACTIVE SERVICE
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 9.C: CORE CAPABILITIES */}
        <div className="space-y-2 pt-2 border-t border-line/70">
          <div className="text-[11px] font-mono font-bold text-graphite uppercase tracking-wider">
            CORE CAPABILITIES ({selectedCapabilities.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedCapabilities.map((cap) => (
              <span
                key={cap}
                className="px-2.5 py-1 rounded-lg bg-white border border-line text-graphite text-xs font-mono font-semibold shadow-2xs"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* 9.D: REGIONAL COVERAGE & COUNTRIES SERVED */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-line/70 text-xs">
          <div className="space-y-2">
            <div className="text-[11px] font-mono font-bold text-graphite uppercase tracking-wider">
              REGIONAL COVERAGE ({selectedRegions.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedRegions.map((code) => {
                const label =
                  AVAILABLE_REGIONAL_EDITIONS.find((r) => r.code === code)?.label.split("(")[0].trim() ||
                  code;
                return (
                  <span
                    key={code}
                    className="px-2.5 py-1 rounded-lg bg-canvas border border-line text-stone text-xs font-medium"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-mono font-bold text-graphite uppercase tracking-wider">
              COUNTRIES SERVED ({countriesServed.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {countriesServed.map((cntry) => (
                <span
                  key={cntry}
                  className="px-2.5 py-1 rounded-lg bg-royal/5 border border-royal/20 text-royal text-xs font-medium"
                >
                  {cntry}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. SECTION 8: PHYSICAL OPERATING NODES (Separate from Positioning) */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-royal" />
              <h2 className="text-base font-bold text-graphite">
                PHYSICAL OPERATING NODES
              </h2>
            </div>
            <p className="text-xs text-stone">
              Physical operating locations are separate from digital Sector City positioning classification.
            </p>
          </div>
          <span className="text-[10px] font-mono text-stone bg-canvas px-2.5 py-1 rounded border border-line">
            PHYSICAL FACILITY DIRECTORY
          </span>
        </div>

        {operatingNodes.length === 0 ? (
          <div className="p-4 rounded-xl bg-canvas border border-line flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-stone">
              <MapPin className="w-4 h-4 text-royal shrink-0" />
              <div>
                <span className="font-bold text-graphite">Primary Headquarters Node: </span>
                <span>
                  {canonicalCompany?.city || "Rotterdam"}, {canonicalCompany?.country || "Netherlands"}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold">
              VERIFIED HQ
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {operatingNodes.map((node) => (
              <div
                key={node.id}
                className="p-3.5 rounded-xl bg-canvas border border-line space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-royal uppercase tracking-wider">
                    {node.nodeType || (node.isHeadquarters ? "HEADQUARTERS" : "OPERATING NODE")}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    {node.status || "VERIFIED"}
                  </span>
                </div>
                <div className="font-bold text-graphite">{node.name}</div>
                <div className="text-stone text-[11px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-stone shrink-0" />
                  <span>
                    {node.city}, {node.country}
                  </span>
                </div>
                {node.address && <div className="text-[10px] text-stone truncate">{node.address}</div>}
              </div>
            ))}
          </div>
        )}

        <div className="p-3 rounded-xl bg-royal/5 border border-royal/10 text-royal text-[11px] flex items-start gap-2">
          <Info className="w-4 h-4 text-royal shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-bold font-mono">Structural Separation Rule: </strong>
            Physical operating nodes represent physical operational facilities and real-world hubs. Digital Sector Cities represent structured business domains and digital market presence.
          </p>
        </div>
      </div>

      {/* 5. CLASSIFICATION & DOMAIN TAXONOMY CONFIGURATION FORM */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-2xs space-y-7"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-royal" />
              <h2 className="text-base font-bold text-graphite">
                Classification & Domain Taxonomy Configuration
              </h2>
            </div>
            <p className="text-xs text-stone">
              Maintain strict separation across primary sector, industry domain, specialized domains, capabilities, registered city, service cities, regions, and countries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Saved
              </span>
            )}
            <button
              type="submit"
              id="positioning-btn-save-top"
              className="px-5 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm min-h-[40px]"
            >
              <Save className="w-4 h-4" />
              Save Positioning
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* DIMENSION A: PRIMARY SECTOR (One Value) */}
        <div className="space-y-2">
          <label
            htmlFor="select-primary-sector"
            className="text-xs font-bold text-graphite flex items-center justify-between"
          >
            <span>A. Primary Sector Classification *</span>
            <span className="text-[10px] font-mono text-stone font-normal">
              Single Value • Maritime Category
            </span>
          </label>
          <select
            id="select-primary-sector"
            value={primarySector}
            onChange={(e) => setPrimarySector(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium transition"
          >
            {AVAILABLE_SECTORS.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        {/* DIMENSION B: INDUSTRY DOMAIN (One Primary Value) */}
        <div className="space-y-2">
          <label
            htmlFor="select-industry-domain"
            className="text-xs font-bold text-graphite flex items-center justify-between"
          >
            <span>B. Primary Industry Domain *</span>
            <span className="text-[10px] font-mono text-stone font-normal">
              Single Primary Value • Domain Node
            </span>
          </label>
          <select
            id="select-industry-domain"
            value={industryDomain}
            onChange={(e) => setIndustryDomain(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-line bg-canvas focus:bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium transition"
          >
            {AVAILABLE_INDUSTRY_DOMAINS.map((dom) => (
              <option key={dom.id} value={dom.id}>
                {dom.label}
              </option>
            ))}
          </select>
        </div>

        {/* DIMENSION C: SPECIALIZED DOMAINS (Multiple) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-graphite flex items-center justify-between">
            <span>C. Secondary Specialized Domains</span>
            <span className="text-[10px] font-mono text-stone font-normal">
              Multi-Select • {specializedDomains.length} Selected
            </span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {AVAILABLE_SPECIALIZED_DOMAINS.map((dom) => {
              const isSelected = specializedDomains.includes(dom);
              return (
                <button
                  type="button"
                  key={dom}
                  onClick={() => toggleSpecializedDomain(dom)}
                  className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                    isSelected
                      ? "bg-royal/10 border-royal text-royal font-bold shadow-2xs"
                      : "bg-canvas hover:bg-mist border-line text-stone"
                  }`}
                >
                  <span className="truncate">{dom}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-royal shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* DIMENSION D: ORGANIZATIONAL CAPABILITIES (Standard Taxonomy) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-graphite flex items-center justify-between">
            <span>D. Organizational Capabilities (Standard Ontology) *</span>
            <span className="text-[10px] font-mono text-stone font-normal">
              Multi-Select • {selectedCapabilities.length} Selected
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {CANONICAL_CAPABILITIES_TAXONOMY.map((cap) => {
              const isSelected = selectedCapabilities.includes(cap);
              return (
                <button
                  type="button"
                  key={cap}
                  onClick={() => toggleCapability(cap)}
                  className={`p-2.5 rounded-xl border text-left text-[11px] font-mono transition flex items-center justify-between ${
                    isSelected
                      ? "bg-royal text-white border-royal font-bold shadow-2xs"
                      : "bg-canvas hover:bg-mist border-line text-graphite"
                  }`}
                >
                  <span className="truncate">{cap}</span>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-white shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* DIMENSION E: PRIMARY REGISTERED SECTOR CITY (Mandatory, exactly 1) */}
        <div className="p-5 rounded-2xl bg-royal/5 border border-royal/20 space-y-3">
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="select-registered-sector-city"
                className="text-xs font-black text-royal uppercase tracking-wider font-mono flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-royal" />
                <span>PRIMARY REGISTERED SECTOR CITY *</span>
              </label>
              <span className="px-2 py-0.5 bg-royal text-white text-[9px] font-mono font-bold rounded">
                EXACTLY 1 REQUIRED
              </span>
            </div>
            <p className="text-xs text-stone">
              Your company's canonical Sector City registration inside MarineWorld.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-graphite">Select Canonical Registered City:</label>
              <select
                id="select-registered-sector-city"
                value={registeredSectorCity}
                onChange={(e) => handleSelectRegisteredCity(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-royal/30 bg-white focus:border-royal focus:outline-none text-xs text-graphite font-bold font-mono transition"
              >
                {masterSectorCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.domain} ({city.code}) — {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-white border border-royal/20 flex flex-col justify-center space-y-1 text-xs">
              <div className="text-[10px] font-mono font-bold text-royal uppercase">
                ACTIVE CANONICAL DESTINATION
              </div>
              <div className="font-bold text-graphite font-mono text-sm flex items-center gap-1.5">
                <span>{registeredCityObj.domain}</span>
                <span className="px-1.5 py-0.2 bg-royal/10 text-royal border border-royal/20 text-[9px] rounded">
                  {registeredCityObj.code}
                </span>
              </div>
              <div className="text-[11px] text-stone truncate">{registeredCityObj.category}</div>
            </div>
          </div>
        </div>

        {/* DIMENSION F: SERVICE & NETWORK SECTOR CITIES (Participating - Max 5) */}
        <div className="p-5 rounded-2xl bg-canvas border border-line space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-royal" />
                <h3 className="text-sm font-black text-graphite uppercase tracking-wider font-mono">
                  SERVICE & NETWORK SECTOR CITIES
                </h3>
              </div>
              <p className="text-xs text-stone">
                Select the Sector Cities where your company actively provides products, services, capabilities or commercial support.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border ${
                  participatingSectorCities.length === 5
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-white border-line text-graphite"
                }`}
              >
                Selected: {participatingSectorCities.length} / 5
              </span>
            </div>
          </div>

          {participatingSectorCities.length >= 5 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Maximum 5 active Sector Cities reached. Remove an active city to select another.</span>
              </div>
            </div>
          )}

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search all MarineWorld Sector Cities (e.g. SHIPYARD, propulsion, cargo, repair)..."
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-line bg-white focus:border-royal focus:outline-none text-xs text-graphite"
              />
              {citySearchQuery && (
                <button
                  type="button"
                  onClick={() => setCitySearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-graphite"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCityCategory}
              onChange={(e) => setSelectedCityCategory(e.target.value)}
              className="h-10 px-3 rounded-xl border border-line bg-white focus:border-royal focus:outline-none text-xs text-graphite font-medium shrink-0 w-full sm:w-auto"
            >
              {cityCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "ALL" ? "All Sector Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Master 25 Sector Cities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredSectorCities.map((city) => {
              const isRegistered = city.id === registeredSectorCity;
              const isParticipating = participatingSectorCities.includes(city.id);
              const reachedLimit = participatingSectorCities.length >= 5 && !isParticipating;

              return (
                <div
                  key={city.id}
                  className={`p-3.5 rounded-xl border transition space-y-2 flex flex-col justify-between ${
                    isParticipating
                      ? "bg-white border-royal/50 shadow-2xs"
                      : "bg-white/60 hover:bg-white border-line"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-black text-xs text-graphite">{city.domain}</div>
                      <span className="text-[9px] font-mono text-stone">{city.code}</span>
                    </div>
                    <div className="text-[11px] font-medium text-stone line-clamp-1">{city.name}</div>
                    <div className="text-[10px] text-royal font-medium truncate">{city.category}</div>
                  </div>

                  <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-1.5">
                    {/* Registered Badge or Set as Registered button */}
                    {isRegistered ? (
                      <span className="px-2 py-0.5 bg-royal text-white text-[9px] font-mono font-bold rounded">
                        REGISTERED
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectRegisteredCity(city.id)}
                        className="text-[10px] font-mono text-stone hover:text-royal hover:underline"
                        title="Set this city as the single canonical registered city"
                      >
                        Make Registered
                      </button>
                    )}

                    {/* Active Service Toggle Button */}
                    <button
                      type="button"
                      onClick={() => toggleParticipatingCity(city.id)}
                      disabled={reachedLimit}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 ${
                        isParticipating
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : reachedLimit
                          ? "bg-stone/10 text-stone cursor-not-allowed"
                          : "bg-royal/10 hover:bg-royal text-royal hover:text-white"
                      }`}
                    >
                      {isParticipating ? (
                        <>
                          <Check className="w-3 h-3" />
                          ACTIVE
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          ADD SERVICE
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DIMENSION G: REGIONAL OPERATING EDITIONS */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-graphite flex items-center justify-between">
            <span>G. Regional Operating Editions</span>
            <span className="text-[10px] font-mono text-stone font-normal">
              Multi-Select • Geographic Scope • {selectedRegions.length} Active
            </span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AVAILABLE_REGIONAL_EDITIONS.map((reg) => {
              const isSelected = selectedRegions.includes(reg.code);
              return (
                <button
                  type="button"
                  key={reg.code}
                  onClick={() => toggleRegion(reg.code)}
                  className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                    isSelected
                      ? "bg-royal/10 border-royal text-royal font-bold shadow-2xs"
                      : "bg-canvas hover:bg-mist border-line text-stone"
                  }`}
                >
                  <span className="truncate">{reg.label}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-royal shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* DIMENSION H: COUNTRY / MARKET COVERAGE */}
        <div className="p-5 rounded-2xl bg-canvas border border-line space-y-3">
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-graphite">
                H. Country / Market Commercial Coverage
              </label>
              <span className="text-[10px] font-mono text-stone">
                {countriesServed.length} Countries Served
              </span>
            </div>
            <p className="text-xs text-stone">
              Specify countries where your company provides commercial coverage, deliveries, or services (independent from headquarters and Sector Cities).
            </p>
          </div>

          {/* Active Country Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {countriesServed.map((cntry) => (
              <span
                key={cntry}
                className="px-3 py-1 rounded-lg bg-white border border-royal/30 text-royal text-xs font-medium flex items-center gap-1.5 shadow-2xs"
              >
                <span>{cntry}</span>
                <button
                  type="button"
                  onClick={() => removeCountry(cntry)}
                  className="text-stone hover:text-rose-600 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Quick Common Maritime Countries Toggle */}
          <div className="pt-2">
            <div className="text-[10px] font-mono font-bold text-stone uppercase mb-1.5">
              QUICK SELECT COMMON MARITIME MARKETS:
            </div>
            <div className="flex flex-wrap gap-1">
              {COMMON_COUNTRIES.map((cntry) => {
                const isSelected = countriesServed.includes(cntry);
                return (
                  <button
                    type="button"
                    key={cntry}
                    onClick={() => toggleCountry(cntry)}
                    className={`px-2 py-0.5 rounded text-[11px] border transition ${
                      isSelected
                        ? "bg-royal text-white border-royal font-bold"
                        : "bg-white hover:bg-mist border-line text-stone"
                    }`}
                  >
                    {cntry}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Country Adder */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Add another country or jurisdiction..."
              value={customCountryInput}
              onChange={(e) => setCustomCountryInput(e.target.value)}
              className="h-9 px-3 rounded-lg border border-line bg-white text-xs text-graphite focus:border-royal focus:outline-none flex-1 max-w-sm"
            />
            <button
              type="button"
              onClick={handleAddCustomCountry}
              className="h-9 px-3 bg-graphite hover:bg-graphite/90 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Country
            </button>
          </div>
        </div>
      </form>

      {/* 6. SECTION 10: POSITIONING OUTCOME & PERSISTED ROUTING DATA */}
      <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-2xs space-y-5">
        <div className="pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-royal" />
            <h2 className="text-base font-bold text-graphite">
              POSITIONING OUTCOME
            </h2>
          </div>
          <p className="text-xs text-stone mt-0.5">
            Persisted classification and deterministic discovery routing across MarineWorld.
          </p>
        </div>

        {/* Persisted Routing Data Summary Card */}
        <div className="p-5 rounded-xl bg-canvas border border-line space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="text-[10px] font-mono font-bold text-royal uppercase tracking-wider">
              PERSISTED ROUTING DATA MATRIX
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
              SYNCHRONIZED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Primary Sector */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-stone uppercase">PRIMARY SECTOR</div>
              <div className="font-bold text-graphite">{primarySector}</div>
            </div>

            {/* Industry Domain */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-stone uppercase">INDUSTRY DOMAIN</div>
              <div className="font-bold text-graphite">{industryDomainLabel}</div>
            </div>

            {/* Registered Sector City */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-stone uppercase">REGISTERED SECTOR CITY</div>
              <div className="font-bold text-royal font-mono flex items-center gap-1.5">
                <span>{registeredCityObj.domain}</span>
                <span className="px-1.5 py-0.2 bg-royal text-white text-[8px] rounded">REGISTERED</span>
              </div>
            </div>

            {/* Active Sector City Presence */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-stone uppercase">ACTIVE SECTOR CITY PRESENCE</div>
              <div className="font-bold text-graphite font-mono">
                {participatingSectorCities.length} / 5 Active Nodes
              </div>
            </div>

            {/* Regional Coverage */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-stone uppercase">REGIONAL COVERAGE</div>
              <div className="font-medium text-graphite">
                {selectedRegions
                  .map(
                    (code) =>
                      AVAILABLE_REGIONAL_EDITIONS.find((r) => r.code === code)?.label.split("(")[0].trim() || code
                  )
                  .join(", ")}
              </div>
            </div>

            {/* Countries Served */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-stone uppercase">COUNTRIES SERVED</div>
              <div className="font-medium text-graphite">
                {countriesServed.length > 0 ? countriesServed.join(", ") : "Global"}
              </div>
            </div>

            {/* Routing Status */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-stone uppercase">ROUTING STATUS</div>
              <div className="font-bold text-graphite font-mono">{routingStatus}</div>
            </div>

            {/* Discovery Status */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-stone uppercase">DISCOVERY STATUS</div>
              <div className="font-bold text-emerald-700 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ready for Sector Routing
              </div>
            </div>
          </div>

          {/* Core Capabilities representation */}
          <div className="space-y-1.5 pt-3 border-t border-line/70">
            <div className="text-[10px] font-mono text-stone uppercase">CORE CAPABILITIES</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedCapabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-2 py-0.5 rounded bg-white text-graphite border border-line text-[10px] font-mono font-bold"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* AI Grounding Context */}
          <div className="pt-3 border-t border-line/70 flex items-start gap-2 text-stone">
            <Cpu className="w-3.5 h-3.5 text-royal shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-bold text-graphite font-mono">AI Grounding Context: </span>
              Positioning data becomes part of the company's canonical AI context.
            </p>
          </div>
        </div>

        {/* Live Query Matching Showcase (Illustrating Routing Engine) */}
        <div className="p-4 rounded-xl bg-canvas border border-line space-y-2 text-xs">
          <div className="text-[10px] font-mono font-bold text-stone uppercase tracking-wider flex items-center gap-1">
            <Cpu className="w-3 h-3 text-royal" />
            <span>DISCOVERY & AI MATCHING RESOLUTION ENGINE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white rounded-lg border border-line space-y-1">
              <div className="text-[11px] font-mono font-bold text-graphite">
                Query: "shipyard companies in Northern Europe"
              </div>
              <p className="text-[11px] text-stone leading-normal">
                Matches through: <strong className="text-royal font-mono">SHIPYARD.CITY</strong> +{" "}
                <strong className="text-graphite font-mono">Northern Europe</strong> +{" "}
                <strong className="text-graphite font-mono">{selectedCapabilities[0] || "ENGINEERING"}</strong>
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-line space-y-1">
              <div className="text-[11px] font-mono font-bold text-graphite">
                Query: "marine procurement services in Dubai"
              </div>
              <p className="text-[11px] text-stone leading-normal">
                Matches through: <strong className="text-royal font-mono">PROCUREMENT.CITY</strong> +{" "}
                <strong className="text-graphite font-mono">Middle East</strong> +{" "}
                <strong className="text-graphite font-mono">UAE Coverage</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Save Trigger */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-stone font-mono">
            {registeredSectorCity && selectedCapabilities.length > 0 ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Valid positioning configuration ready to persist.
              </span>
            ) : (
              <span className="text-amber-800 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Select 1 registered city and at least 1 capability.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Saved
              </span>
            )}
            <button
              type="button"
              id="positioning-btn-save-bottom"
              onClick={handleSave}
              className="px-6 py-2 bg-royal hover:bg-royal/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm min-h-[40px]"
            >
              <Save className="w-4 h-4" />
              Save Positioning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
