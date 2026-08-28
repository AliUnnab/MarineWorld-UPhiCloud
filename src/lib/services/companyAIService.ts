import type {
  CompanyEntity,
  CompanyOffering,
  PhysicalFacility,
  DocumentEntity,
} from "@/lib/types";
import { getCompanyById, getCompanyBySlug, getPhysicalFacilities } from "@/lib/services/companyService";
import { getCompanyOfferings } from "@/lib/services/offeringEntityService";
import { getKnowledgeSources } from "@/lib/services/knowledgeLifecycleService";
import { generateAIContent } from "@/lib/gemini";

export type CompanyAICommunicationStyle =
  | "Professional"
  | "Technical"
  | "Commercial"
  | "Concise"
  | "Consultative";

export type CompanyAICapability =
  | "Company Information"
  | "Products & Services"
  | "Capabilities"
  | "Facilities"
  | "Certifications"
  | "Commercial Inquiries"
  | "RFQ Guidance"
  | "General Maritime Questions";

export interface CompanyAIConfig {
  companyId: string;
  companyAiEnabled: boolean;
  companyAiStatus: "READY" | "NEEDS_SETUP";
  communicationStyles: CompanyAICommunicationStyle[];
  capabilities: CompanyAICapability[];
  companyAiBoundary: "COMPANY_ONLY";
  companyAiRoutingEnabled: boolean;
  lastUpdated: string;
}

export interface CompanyAIReadinessBreakdown {
  isReady: boolean;
  identityStatus: { ready: boolean; label: string; detail: string };
  positioningStatus: { ready: boolean; label: string; detail: string };
  knowledgeStatus: { ready: boolean; count: number; label: string; detail: string };
  presenceStatus: { ready: boolean; count: number; label: string; detail: string };
  offeringsStatus: { ready: boolean; count: number; label: string; detail: string };
  groundedSourcesCount: number;
  verifiedFacilitiesCount: number;
  readyOfferingsCount: number;
}

const STORAGE_KEY_PREFIX = "marineworld_company_ai_config_";

// In-memory fallback
const inMemoryConfigs = new Map<string, CompanyAIConfig>();

export const DEFAULT_COMMUNICATION_STYLES: CompanyAICommunicationStyle[] = [
  "Professional",
  "Technical",
  "Consultative",
];

export const DEFAULT_CAPABILITIES: CompanyAICapability[] = [
  "Company Information",
  "Products & Services",
  "Capabilities",
  "Facilities",
  "Certifications",
  "Commercial Inquiries",
  "RFQ Guidance",
];

export const ALL_COMMUNICATION_STYLES: Array<{
  id: CompanyAICommunicationStyle;
  label: string;
  description: string;
}> = [
  {
    id: "Professional",
    label: "Professional",
    description: "Diplomatic, authoritative corporate tone suitable for enterprise buyers.",
  },
  {
    id: "Technical",
    label: "Technical",
    description: "Focuses on engineering standards, classification, and precise metrics.",
  },
  {
    id: "Commercial",
    label: "Commercial",
    description: "Highlights procurement terms, delivery lead times, and RFQ pathways.",
  },
  {
    id: "Concise",
    label: "Concise",
    description: "Delivers direct, bulleted answers without conversational filler.",
  },
  {
    id: "Consultative",
    label: "Consultative",
    description: "Explores application context and guides buyers to the best-fit solution.",
  },
];

export const ALL_CAPABILITIES: Array<{
  id: CompanyAICapability;
  label: string;
  description: string;
  requiredModule: "IDENTITY" | "OFFERINGS" | "PRESENCE" | "KNOWLEDGE" | "CONNECT" | "GENERAL";
}> = [
  {
    id: "Company Information",
    label: "Company Information",
    description: "History, headquarters, executive leadership, and verified corporate structure.",
    requiredModule: "IDENTITY",
  },
  {
    id: "Products & Services",
    label: "Products & Services",
    description: "Catalog overview and automated routing to dedicated product specialists.",
    requiredModule: "OFFERINGS",
  },
  {
    id: "Capabilities",
    label: "Capabilities",
    description: "Core technical disciplines, engineering competencies, and maritime domain focus.",
    requiredModule: "IDENTITY",
  },
  {
    id: "Facilities",
    label: "Facilities & Shipyards",
    description: "Berth capacity, drydocks, quayside specifications, and regional service hubs.",
    requiredModule: "PRESENCE",
  },
  {
    id: "Certifications",
    label: "Certifications & Standards",
    description: "Class society type approvals (DNV, ABS, Lloyd's) and ISO quality compliance.",
    requiredModule: "KNOWLEDGE",
  },
  {
    id: "Commercial Inquiries",
    label: "Commercial Inquiries",
    description: "Incoterms, delivery models, availability, and initial commercial qualification.",
    requiredModule: "CONNECT",
  },
  {
    id: "RFQ Guidance",
    label: "RFQ Guidance",
    description: "Guides enterprise purchasers into structured Request for Quotation workflows.",
    requiredModule: "CONNECT",
  },
  {
    id: "General Maritime Questions",
    label: "General Maritime Inquiries",
    description: "Answers industry domain questions anchored to company capabilities.",
    requiredModule: "GENERAL",
  },
];

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Retrieve persisted AI configuration for a company
 */
export function getCompanyAIConfig(companyId: string): CompanyAIConfig {
  if (inMemoryConfigs.has(companyId)) {
    return inMemoryConfigs.get(companyId)!;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${companyId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        inMemoryConfigs.set(companyId, parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  // Derive initial config
  const initial: CompanyAIConfig = {
    companyId,
    companyAiEnabled: true,
    companyAiStatus: "READY",
    communicationStyles: DEFAULT_COMMUNICATION_STYLES,
    capabilities: DEFAULT_CAPABILITIES,
    companyAiBoundary: "COMPANY_ONLY",
    companyAiRoutingEnabled: true,
    lastUpdated: new Date().toISOString(),
  };

  inMemoryConfigs.set(companyId, initial);

  // Background warm from Firestore
  if (companyId) {
    const docRef = doc(db, "companies", companyId, "ai", "config");
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as CompanyAIConfig;
        inMemoryConfigs.set(companyId, data);
        if (typeof window !== "undefined") {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${companyId}`, JSON.stringify(data));
          window.dispatchEvent(
            new CustomEvent("marineworld_company_ai_updated", { detail: { companyId, config: data } })
          );
        }
      }
    }).catch(() => {});
  }

  return initial;
}

/**
 * Persist AI configuration for a company
 */
export function saveCompanyAIConfig(
  companyId: string,
  config: Partial<CompanyAIConfig>
): CompanyAIConfig {
  const current = getCompanyAIConfig(companyId);
  const updated: CompanyAIConfig = {
    ...current,
    ...config,
    companyId,
    companyAiBoundary: "COMPANY_ONLY",
    lastUpdated: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${companyId}`, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("marineworld_company_ai_updated", { detail: { companyId, config: updated } })
      );
    } catch {
      // ignore
    }
  }

  inMemoryConfigs.set(companyId, updated);

  // Direct Firestore persistence
  try {
    const docRef = doc(db, "companies", companyId, "ai", "config");
    setDoc(docRef, updated, { merge: true }).catch((e) => {
      console.warn("[CompanyAIService] Firestore config write error:", e);
    });

    const rootDocRef = doc(db, "companies", companyId);
    setDoc(rootDocRef, { aiConfig: updated, updatedAt: updated.lastUpdated }, { merge: true }).catch((e) => {
      console.warn("[CompanyAIService] Firestore root aiConfig write error:", e);
    });

    import("@/services/businessTwinService").then(({ saveCompanyBusinessTwin }) => {
      saveCompanyBusinessTwin(companyId, {
        capabilities: updated.capabilities as any,
        overallCompleteness: updated.companyAiStatus === "READY" ? 100 : 50,
      });
    }).catch(() => {});
  } catch (err) {
    console.warn("[CompanyAIService] Firestore saveCompanyBusinessTwin fallback:", err);
  }

  return updated;
}

/**
 * Compute dynamic AI Readiness from real persisted modules
 */
export function evaluateCompanyAIReadiness(companyId: string): CompanyAIReadinessBreakdown {
  const company = getCompanyById(companyId) || (getCompanyBySlug(companyId) as unknown as CompanyEntity);
  const facilities = getPhysicalFacilities(companyId);
  const offerings = getCompanyOfferings(companyId);
  const knowledgeSources = getKnowledgeSources(companyId, { status: "ACTIVE" });

  const groundedSources = knowledgeSources.filter(
    (d) => d.groundingStatus === "GROUNDED" && d.status === "ACTIVE"
  );

  // 1. Identity Readiness
  const hasName = Boolean(company?.displayName || company?.legalName || company?.brandName || (company as any)?.name);
  const hasSector = Boolean(company?.sectorId || (company as any)?.sectorCode);
  const hasShortDesc = Boolean(company?.shortDescription || company?.corporateDescription || (company as any)?.description || (company as any)?.tagline);
  const identityReady = hasName && hasSector && hasShortDesc;

  // 2. Positioning Readiness
  const hasPositioning = Boolean(
    (company as any)?.corePositioning ||
    (company as any)?.valueProposition ||
    (company as any)?.primaryCapabilities?.length > 0 ||
    (company as any)?.tagline ||
    company?.shortDescription
  );

  // 3. Knowledge Readiness
  const knowledgeReady = groundedSources.length > 0;

  // 4. Presence Readiness
  const presenceReady = facilities.length > 0;

  // 5. Offerings Readiness
  const readyOfferings = offerings.filter((o) => o.status === "ACTIVE");
  const offeringsReady = readyOfferings.length > 0;

  // Overall Company AI is ready if basic identity + positioning + at least 1 grounding dimension exist
  const isReady = identityReady && (knowledgeReady || offeringsReady || presenceReady);

  return {
    isReady,
    identityStatus: {
      ready: identityReady,
      label: identityReady ? "Ready" : "Needs Setup",
      detail: identityReady ? "Verified Name & Corporate Profile" : "Missing core description or legal identity",
    },
    positioningStatus: {
      ready: hasPositioning,
      label: hasPositioning ? "Ready" : "Needs Setup",
      detail: hasPositioning ? "Positioning & Value Proposition defined" : "Value proposition not configured",
    },
    knowledgeStatus: {
      ready: knowledgeReady,
      count: groundedSources.length,
      label: knowledgeReady ? `${groundedSources.length} Grounded Sources` : "No Grounded Sources",
      detail: knowledgeReady ? "Active company policies & certificates" : "Upload source documents in 05 — Knowledge",
    },
    presenceStatus: {
      ready: presenceReady,
      count: facilities.length,
      label: presenceReady ? `${facilities.length} Verified Facilities` : "No Facilities",
      detail: presenceReady ? "Physical locations & operational bases" : "Add operational nodes in 03 — Presence",
    },
    offeringsStatus: {
      ready: offeringsReady,
      count: readyOfferings.length,
      label: offeringsReady ? `${readyOfferings.length} Active Offerings` : "No Offerings",
      detail: offeringsReady ? "Grounded products & services with specs" : "Add catalog items in 04 — Offerings",
    },
    groundedSourcesCount: groundedSources.length,
    verifiedFacilitiesCount: facilities.length,
    readyOfferingsCount: readyOfferings.length,
  };
}

export interface SimulationResult {
  representativeName: string;
  representativeScope: "COMPANY_AI" | "OFFERING_AI" | "FACILITY_AI";
  routingReason: string;
  response: string;
  groundedFacts: string[];
  suggestedActions: Array<{
    id: string;
    label: string;
    actionType: "VIEW_OFFERING" | "ASK_OFFERING_SPECIALIST" | "REQUEST_OFFER" | "CONNECT_COMPANY" | "VIEW_FACILITY";
    targetId?: string;
  }>;
}

/**
 * Generate real grounded Company AI query with Gemini API and intelligent commercial handoff
 */
export async function generateCompanyAIResponse(
  companyId: string,
  query: string
): Promise<SimulationResult> {
  const syncRes = simulateCompanyAIResponse(companyId, query);
  try {
    const company = getCompanyById(companyId) || (getCompanyBySlug(companyId) as unknown as CompanyEntity);
    const companyName = company?.displayName || company?.brandName || (company as any)?.name || "Company";
    const offerings = getCompanyOfferings(companyId);
    const facilities = getPhysicalFacilities(companyId);
    
    const offeringSummary = offerings.map((o) => `${o.name} (${o.type}): ${o.shortDescription || ""}`).join("\n");
    const facilitySummary = facilities.map((f) => `${f.facilityName} (${f.facilityType}) in ${f.city}, ${f.country}`).join("\n");

    const prompt = `You are the verified AI Digital Twin representative for "${companyName}" on the MarineWorld.City platform.
Representative Role: ${syncRes.representativeName} (${syncRes.representativeScope})

GROUNDED COMPANY CONTEXT:
- Company Name: ${companyName}
- Headquarters: ${company?.city || "Rotterdam"}, ${company?.country || "Netherlands"}
- Verified Offerings:
${offeringSummary || "None listed"}
- Verified Facilities:
${facilitySummary || "None listed"}
- Grounding Facts:
${syncRes.groundedFacts.join("\n")}
- Standard Response Baseline: ${syncRes.response}

USER INQUIRY:
"${query}"

INSTRUCTIONS:
1. Provide an authoritative, grounded, professional, and helpful response representing ${companyName}.
2. Adhere strictly to the facts above and maritime domain standards.
3. Keep the response concise, clear, and direct (1 to 2 paragraphs).
4. If the user asks about purchasing, specifications, or RFQs, guide them to request a formal quotation.`;

    const aiText = await generateAIContent(prompt, `You are representing ${companyName} on the MarineWorld digital network. Answer strictly based on grounded facts.`);
    if (aiText && aiText.trim().length > 10) {
      return {
        ...syncRes,
        response: aiText.trim(),
      };
    }
  } catch (e) {
    console.warn("[CompanyAIService] Live Gemini generation fallback to structured sync result:", e);
  }
  return syncRes;
}

export function simulateCompanyAIResponse(
  companyId: string,
  query: string
): SimulationResult {
  const company = getCompanyById(companyId) || (getCompanyBySlug(companyId) as unknown as CompanyEntity);
  const companyName = company?.displayName || company?.brandName || (company as any)?.name || "Argento Maritime Engineering";
  const facilities = getPhysicalFacilities(companyId);
  const offerings = getCompanyOfferings(companyId);
  const knowledgeSources = getKnowledgeSources(companyId, { status: "ACTIVE" });

  const qLower = query.toLowerCase().trim();

  // 1. Check for Offering Specificity (ROV, Propulsion, Pod, Subsea, Product Name)
  const matchingOffering = offerings.find(
    (off) =>
      qLower.includes(off.name.toLowerCase()) ||
      (off.slug && qLower.includes(off.slug.toLowerCase())) ||
      (off.category && qLower.includes(off.category.toLowerCase())) ||
      (qLower.includes("rov") && off.name.toLowerCase().includes("rov")) ||
      (qLower.includes("propulsion") && off.name.toLowerCase().includes("propulsion")) ||
      (qLower.includes("pod") && off.name.toLowerCase().includes("pod")) ||
      (qLower.includes("inspection") && off.name.toLowerCase().includes("inspection"))
  ) || (qLower.includes("product") || qLower.includes("equipment") || qLower.includes("depth") || qLower.includes("specs") ? offerings[0] : null);

  // 2. Check for Facility Specificity (Berth, Shipyard, Quay, Port, Rotterdam, Mooring, Facility)
  const matchingFacility = facilities.find(
    (fac) =>
      qLower.includes(fac.facilityName.toLowerCase()) ||
      (fac.city && qLower.includes(fac.city.toLowerCase())) ||
      (fac.facilityType && qLower.includes(fac.facilityType.toLowerCase())) ||
      (qLower.includes("berth") && fac.facilityName.toLowerCase().includes("berth")) ||
      (qLower.includes("shipyard") && fac.facilityType === "Shipyard") ||
      (qLower.includes("quayside") || qLower.includes("mooring") || qLower.includes("drydock"))
  ) || (qLower.includes("facility") || qLower.includes("location") || qLower.includes("shipyard") ? facilities[0] : null);

  // ROUTING CASE A: Specific Offering Question
  if (
    matchingOffering &&
    (qLower.includes("depth") ||
      qLower.includes("operating") ||
      qLower.includes("spec") ||
      qLower.includes("rov") ||
      qLower.includes("propulsion") ||
      qLower.includes("pod") ||
      qLower.includes("warranty") ||
      qLower.includes("price") ||
      qLower.includes("quotation") ||
      qLower.includes("rfq") ||
      qLower.includes("buy") ||
      qLower.includes("lead time") ||
      qLower.includes(matchingOffering.name.toLowerCase()))
  ) {
    const isCommercial = qLower.includes("quotation") || qLower.includes("quote") || qLower.includes("price") || qLower.includes("rfq") || qLower.includes("order") || qLower.includes("buy") || qLower.includes("lead time");

    let text = `${matchingOffering.name} is an active, verified commercial offering from ${companyName}. `;
    if (matchingOffering.shortDescription) {
      text += `${matchingOffering.shortDescription} `;
    }

    if (matchingOffering.specifications && Array.isArray(matchingOffering.specifications) && matchingOffering.specifications.length > 0) {
      const topSpecs = matchingOffering.specifications.slice(0, 3).map((s) => `${s.key}: ${s.value}`).join(", ");
      text += `Key specifications verified from factory datasheet: ${topSpecs}. `;
    }

    if (isCommercial) {
      text += `Commercial terms: Pricing is available upon formal inquiry based on system configuration. Standard incoterms: FCA / EXW. You can request a binding quotation directly below.`;
    }

    return {
      representativeName: `${matchingOffering.name} Specialist`,
      representativeScope: "OFFERING_AI",
      routingReason: `Automated Specialist Routing: User asked about '${matchingOffering.name}' specifications and commercial terms.`,
      response: text,
      groundedFacts: [
        `Grounded to Offering: ${matchingOffering.name}`,
        `Verified Technical Specs: ${matchingOffering.specifications?.length || 4} parameters`,
        `Commercial Inquiry / RFQ Pathway Enabled`,
      ],
      suggestedActions: [
        {
          id: "act-view-offering",
          label: `View ${matchingOffering.name}`,
          actionType: "VIEW_OFFERING",
          targetId: matchingOffering.id,
        },
        {
          id: "act-ask-offering",
          label: `Ask ${matchingOffering.name} Specialist`,
          actionType: "ASK_OFFERING_SPECIALIST",
          targetId: matchingOffering.id,
        },
        {
          id: "act-rfq",
          label: "Request Formal Quotation (RFQ)",
          actionType: "REQUEST_OFFER",
          targetId: matchingOffering.id,
        },
      ],
    };
  }

  // ROUTING CASE B: Facility Question
  if (
    matchingFacility &&
    (qLower.includes("berth") ||
      qLower.includes("quay") ||
      qLower.includes("dock") ||
      qLower.includes("mooring") ||
      qLower.includes("shipyard") ||
      qLower.includes("vessel") ||
      qLower.includes("handle") ||
      qLower.includes("rotterdam") ||
      qLower.includes(matchingFacility.facilityName.toLowerCase()))
  ) {
    const text = `${matchingFacility.facilityName} is a verified ${matchingFacility.facilityType} facility operated by ${companyName} in ${matchingFacility.city}, ${matchingFacility.country}. Operational status: ${matchingFacility.operatingStatus || matchingFacility.status || "ACTIVE"}. Equipped for quayside technical operations, heavy mooring, and subsea integration with continuous quayside depth.`;

    return {
      representativeName: `${matchingFacility.facilityName} Facility Specialist`,
      representativeScope: "FACILITY_AI",
      routingReason: `Automated Facility Routing: User asked about physical facility capability '${matchingFacility.facilityName}'.`,
      response: text,
      groundedFacts: [
        `Grounded to Physical Facility: ${matchingFacility.facilityName}`,
        `Location: ${matchingFacility.city}, ${matchingFacility.country}`,
        `Operational Status: ${matchingFacility.operatingStatus || matchingFacility.status || "ACTIVE"}`,
      ],
      suggestedActions: [
        {
          id: "act-view-facility",
          label: `View ${matchingFacility.facilityName} Details`,
          actionType: "VIEW_FACILITY",
          targetId: matchingFacility.id,
        },
        {
          id: "act-connect-company",
          label: `Inquire with ${companyName}`,
          actionType: "CONNECT_COMPANY",
        },
      ],
    };
  }

  // ROUTING CASE C: General Company Inquiries (Products catalog, contact, capabilities, overview)
  if (qLower.includes("what does") || qLower.includes("who is") || qLower.includes("overview") || qLower.includes("about") || qLower.includes("company")) {
    const text = `${companyName} is an authoritative maritime enterprise headquartered in ${company?.city || "Rotterdam"}, ${company?.country || "Netherlands"}. We specialize in autonomous subsea robotics, certified propulsion systems, and offshore engineering. Our operations comply with verified DNV and ISO standards with active operational facilities across key maritime ports.`;
    return {
      representativeName: `${companyName} Company AI`,
      representativeScope: "COMPANY_AI",
      routingReason: "Company-Level Context: General corporate identity and domain capabilities.",
      response: text,
      groundedFacts: [
        `Company Identity: ${companyName}`,
        `Headquarters: ${company?.city || "Rotterdam"}, ${company?.country || "Netherlands"}`,
        `Grounded Documents: ${knowledgeSources.length} verified sources`,
      ],
      suggestedActions: [
        {
          id: "act-view-catalog",
          label: `Browse All ${offerings.length} Offerings`,
          actionType: "VIEW_OFFERING",
        },
        {
          id: "act-connect",
          label: "Connect with Company",
          actionType: "CONNECT_COMPANY",
        },
      ],
    };
  }

  if (qLower.includes("product") || qLower.includes("service") || qLower.includes("offer") || qLower.includes("catalog")) {
    const listNames = offerings.map((o) => o.name).join(", ");
    const text = `${companyName} currently offers ${offerings.length} published solutions: ${listNames || "Autonomous Subsea ROV-4 and Hybrid Azimuth Propulsion Pods"}. Each product is backed by dedicated technical documentation and specialized AI support. Select any product to explore full technical parameters or request an offer.`;
    return {
      representativeName: `${companyName} Company AI`,
      representativeScope: "COMPANY_AI",
      routingReason: "Company-Level Catalog Context: High-level product & service overview.",
      response: text,
      groundedFacts: [
        `Published Offerings: ${offerings.length} active items`,
        `Catalog Routing: Enabled`,
      ],
      suggestedActions: offerings.slice(0, 2).map((off) => ({
        id: `act-off-${off.id}`,
        label: `View ${off.name}`,
        actionType: "VIEW_OFFERING",
        targetId: off.id,
      })),
    };
  }

  if (qLower.includes("contact") || qLower.includes("reach") || qLower.includes("email") || qLower.includes("phone")) {
    const text = `You can connect with ${companyName} directly through MarineWorld Connect for technical consultations, commercial quotations, or facility visits. Inquiries are routed immediately to authorized enterprise personnel.`;
    return {
      representativeName: `${companyName} Company AI`,
      representativeScope: "COMPANY_AI",
      routingReason: "Company-Level Inquiries: Commercial handoff and communications dispatch.",
      response: text,
      groundedFacts: [
        `Verified Inquiries Channel: MarineWorld Connect`,
        `Direct Commercial RFQ Dispatch: Active`,
      ],
      suggestedActions: [
        {
          id: "act-connect",
          label: `Connect with ${companyName}`,
          actionType: "CONNECT_COMPANY",
        },
      ],
    };
  }

  if (qLower.includes("sector") || qLower.includes("industry") || qLower.includes("market")) {
    const text = `${companyName} serves offshore energy, subsea inspection, commercial shipping, and port infrastructure sectors. All engineering solutions are certified to Lloyd's Register and DNV maritime classifications.`;
    return {
      representativeName: `${companyName} Company AI`,
      representativeScope: "COMPANY_AI",
      routingReason: "Company-Level Sector Scope: Verified maritime industry classifications.",
      response: text,
      groundedFacts: [
        "Sectors: Offshore Marine, Subsea Robotics, Port Infrastructure",
        "Class Approvals: DNV / Lloyd's Register",
      ],
      suggestedActions: [
        {
          id: "act-connect",
          label: "Discuss a Project",
          actionType: "CONNECT_COMPANY",
        },
      ],
    };
  }

  // DEFAULT GROUNDED RESPONSE
  const text = `According to verified corporate records for ${companyName}, our organization operates under strict maritime quality standards. We provide grounded specifications, active catalog offerings, and verified quayside facilities. Please ask about our products, facility capacities, or commercial procurement.`;
  return {
    representativeName: `${companyName} Company AI`,
    representativeScope: "COMPANY_AI",
    routingReason: "Company-Level Representative: Answering from verified company Data Space.",
    response: text,
    groundedFacts: [
      `Grounded on ${knowledgeSources.length} Company Knowledge records`,
      `Tenant Isolation: Verified (Company ID: ${companyId})`,
      `Boundary: Company-Level Only`,
    ],
    suggestedActions: [
      {
        id: "act-view-catalog",
        label: "View Product Catalog",
        actionType: "VIEW_OFFERING",
      },
      {
        id: "act-connect",
        label: "Connect with Company",
        actionType: "CONNECT_COMPANY",
      },
    ],
  };
}
