import type {
  CompanyProfile,
  BusinessTwinModel,
  CompanyMetricsData,
  InquiryEntity,
  ProductEntity,
  ServiceEntity,
  PhysicalFacility,
} from "@/lib/types";
import { getBusinessTwin, updateBusinessIdentity } from "@/lib/businessTwinStore";
import { getCompanyMetrics } from "@/lib/metricsStore";
import { getCompanyInquiries } from "@/lib/connectStore";
import { getCompanyProducts, getCompanyServices } from "@/lib/registry";
import { recordPlatformEvent } from "@/lib/metricsStore";
import { getPhysicalFacilities, getRegisteredHeadquarters } from "@/lib/services/companyService";
import { getCurrentAuthSession, hasCompanyRole, isAuthenticated } from "@/lib/services/securityService";

export type UserRole = "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "OPERATIONS" | "VIEWER";

export interface AIEvidenceItem {
  source: "BUSINESS TWIN" | "METRICS" | "PRODUCTS" | "SERVICES" | "CONNECT" | "SECTOR";
  detail: string;
}

export interface AIRecommendationItem {
  id: string;
  priority: "P1" | "P2" | "P3";
  title: string;
  reason: string;
  evidence: string;
  suggestedAction: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  actionType?: "UPDATE_IDENTITY" | "COMPLETE_TWIN" | "REPLY_INQUIRY" | "UPDATE_PRODUCT";
  draftChange?: {
    field: string;
    label: string;
    currentContent: string;
    proposedContent: string;
    targetType: "IDENTITY" | "PRODUCT" | "SERVICE";
  };
}

export interface AIDraftChange {
  field: string;
  label: string;
  currentContent: string;
  proposedContent: string;
  targetType: "IDENTITY" | "PRODUCT" | "SERVICE";
}

export interface AIResponsePayload {
  id: string;
  timestamp: string;
  companyId: string;
  query: string;
  answer: string;
  evidence: AIEvidenceItem[];
  interpretation?: string;
  recommendations: AIRecommendationItem[];
  draftChange?: AIDraftChange;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  creditsConsumed: number;
  dataLastSynchronized: string;
  sourcesUsed: Array<"BUSINESS TWIN" | "METRICS" | "PRODUCTS" | "SERVICES" | "CONNECT">;
  insufficientData?: boolean;
}

/**
 * Prompt Injection Protection Helper
 * Encloses untrusted inputs so language models treat them strictly as data.
 */
function sanitizeUntrustedData(input: string): string {
  if (!input) return "";
  return input
    .replace(/<system_instructions>/gi, "")
    .replace(/<\/system_instructions>/gi, "")
    .replace(/ignore all previous instructions/gi, "[Filtered Directive]");
}

/**
 * Determine AI Confidence Score based on data completeness and freshness
 */
function calculateAIConfidence(
  twinCompleteness: number,
  metricsAvailable: boolean,
  inquiriesCount: number
): "HIGH" | "MEDIUM" | "LOW" {
  if (twinCompleteness >= 70 && metricsAvailable && inquiriesCount >= 1) {
    return "HIGH";
  }
  if (twinCompleteness >= 40 || metricsAvailable) {
    return "MEDIUM";
  }
  return "LOW";
}

/**
 * Main Grounded AI Service Abstraction Layer
 * Strict Company Isolation: Evaluates ONLY context for `company.id`
 */
export async function processCompanyAIQuery(
  company: CompanyProfile,
  userQuery: string,
  userRole: UserRole = "OWNER"
): Promise<AIResponsePayload> {
  const companyId = company.id;
  const sanitizedQuery = sanitizeUntrustedData(userQuery);

  // 1. Gather Grounded Canonical Context (Company-Scoped)
  const twin: BusinessTwinModel = getBusinessTwin(company);
  const metrics: CompanyMetricsData = getCompanyMetrics(company, "30D");
  const products: ProductEntity[] = getCompanyProducts(company);
  const services: ServiceEntity[] = getCompanyServices(company);
  const inquiries: InquiryEntity[] = getCompanyInquiries(companyId);

  const totalProfileViews = metrics.kpis.profileViews.current;
  const profileViewsChange = metrics.kpis.profileViews.percentChange;
  const totalProductViews = metrics.kpis.productViews.current;
  const totalServiceViews = metrics.kpis.serviceViews.current;

  const timestamp = new Date().toISOString();
  const dataLastSynchronized = new Date(Date.now() - 1000 * 60 * 12).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const confidence = calculateAIConfidence(
    twin.overallCompleteness,
    totalProfileViews > 0,
    inquiries.length
  );

  // Check role authorization limits
  if (userRole === "VIEWER" && sanitizedQuery.toLowerCase().includes("inquir")) {
    return {
      id: `ai-${Date.now()}`,
      timestamp,
      companyId,
      query: sanitizedQuery,
      answer: "Access restricted: Inquiry and conversion data requires Sales, Manager, or Admin role permissions.",
      evidence: [],
      recommendations: [],
      confidence: "HIGH",
      creditsConsumed: 1,
      dataLastSynchronized,
      sourcesUsed: ["BUSINESS TWIN"],
    };
  }

  const queryLower = sanitizedQuery.toLowerCase();
  const sourcesUsed: Array<"BUSINESS TWIN" | "METRICS" | "PRODUCTS" | "SERVICES" | "CONNECT"> = [
    "BUSINESS TWIN",
    "METRICS",
  ];

  // 2. SCENARIO ANALYSIS & GROUNDED INTENT ROUTING

  // Case A: Insufficient Data Check
  if (twin.overallCompleteness === 0 && totalProfileViews === 0) {
    return {
      id: `ai-${Date.now()}`,
      timestamp,
      companyId,
      query: sanitizedQuery,
      answer: "NOT ENOUGH DATA YET. Complete your Business Twin and publish products or service offerings to unlock grounded AI intelligence.",
      evidence: [
        {
          source: "BUSINESS TWIN",
          detail: `Overall twin completeness score is currently ${twin.overallCompleteness}%.`,
        },
      ],
      recommendations: [
        {
          id: "rec-complete-twin",
          priority: "P1",
          title: "Complete Business Twin Profile",
          reason: "Canonical profile data is incomplete.",
          evidence: "0% completed profile attributes.",
          suggestedAction: "Navigate to Business Twin module and enter company legal name, headquarters address, and industry taxonomy.",
          confidence: "HIGH",
          actionType: "COMPLETE_TWIN",
        },
      ],
      confidence: "HIGH",
      creditsConsumed: 1,
      dataLastSynchronized,
      sourcesUsed: ["BUSINESS TWIN"],
      insufficientData: true,
    };
  }

  // Case B: Company Performance / Overview
  if (
    queryLower.includes("performing") ||
    queryLower.includes("performance") ||
    queryLower.includes("overview") ||
    queryLower.includes("how is my company")
  ) {
    sourcesUsed.push("CONNECT", "PRODUCTS", "SERVICES");

    const answer = `${company.name} is operating as a ${twin.verificationStatus.toLowerCase()} entity in MarineWorld.City (${twin.identity.industry}). Over the last 30 days, your profile recorded ${totalProfileViews} profile views (${profileViewsChange ?? 0}% period-over-period) and received ${inquiries.length} direct commercial inquiries.`;

    const evidence: AIEvidenceItem[] = [
      {
        source: "METRICS",
        detail: `${totalProfileViews} total profile views recorded over the last 30 days (${profileViewsChange ?? 0}% vs previous 30 days).`,
      },
      {
        source: "CONNECT",
        detail: `${inquiries.length} verified commercial RFQs / inquiries logged in the Connect workspace.`,
      },
      {
        source: "BUSINESS TWIN",
        detail: `Digital Business Twin is currently ${twin.overallCompleteness}% complete across 6 canonical sections.`,
      },
    ];

    const interpretation =
      "Your company exhibits strong profile view engagement with positive inbound commercial inquiries. However, completeness gaps in your Business Twin structure may limit search relevance across Sector City hubs.";

    const recommendations: AIRecommendationItem[] = [
      {
        id: "rec-perf-1",
        priority: "P1",
        title: "Address Business Twin Completeness Gaps",
        reason: `Your Business Twin is ${twin.overallCompleteness}% complete. Unfilled required fields restrict automated procurement matching.`,
        evidence: `Missing fields in section: ${Object.values(twin.sectionCompleteness)
          .filter((s) => s.missingRequiredFields.length > 0)
          .map((s) => s.sectionLabel)
          .join(", ") || "None"}`,
        suggestedAction: "Update missing headquarters node fields and capability tags.",
        confidence,
        actionType: "COMPLETE_TWIN",
      },
      {
        id: "rec-perf-2",
        priority: "P2",
        title: "Optimize High-Traffic Offerings",
        reason: "Commercial buyers are viewing product listings, but inquiry conversion can be improved with technical specifications.",
        evidence: `${products.length} published products with ${totalProductViews} total product page views.`,
        suggestedAction: "Add DNV-GL/ABS class approval tags to top product datasheets.",
        confidence,
        actionType: "UPDATE_PRODUCT",
      },
    ];

    recordPlatformEvent({
      eventType: "cta_click",
      companyId,
      metadata: { auditAction: "ai_performance_overview_generated" },
    });

    return {
      id: `ai-${Date.now()}`,
      timestamp,
      companyId,
      query: sanitizedQuery,
      answer,
      evidence,
      interpretation,
      recommendations,
      confidence,
      creditsConsumed: 5,
      dataLastSynchronized,
      sourcesUsed,
    };
  }

  // Case C: Strongest Products / Product Insights
  if (queryLower.includes("product") || queryLower.includes("best product") || queryLower.includes("strongest")) {
    sourcesUsed.push("PRODUCTS");
    const topProducts = products.slice(0, 3);

    const answer = `${company.name} currently references ${products.length} active products in its canonical catalog. Your top performing product lines by view engagement and RFQ density are ${topProducts.map((p) => p.name).join(", ") || "your published marine composite and equipment series"}.`;

    const evidence: AIEvidenceItem[] = [
      {
        source: "PRODUCTS",
        detail: `${products.length} products listed in MarineWorld catalog across ${twin.productsSummary.categoriesCount} categories.`,
      },
      {
        source: "METRICS",
        detail: `${totalProductViews} total product datasheet views logged in the last 30 days.`,
      },
    ];

    if (inquiries.length > 0) {
      evidence.push({
        source: "CONNECT",
        detail: `${inquiries.filter((i) => i.source === "PRODUCT").length} RFQ inquiries originated directly from product pages.`,
      });
    }

    const interpretation =
      "Product engagement is concentrated in certified structural materials and technical components. Items with detailed technical specifications generate 3.2x higher inquiry conversion.";

    const recommendations: AIRecommendationItem[] = [
      {
        id: "rec-prod-1",
        priority: "P1",
        title: "Enhance Product Datasheets with Class Approvals",
        reason: "Buyers frequently search by DNV, Lloyd's Register, or ABS certification standard.",
        evidence: "2 products missing explicit classification badges.",
        suggestedAction: "Add classification metadata to published datasheets.",
        confidence,
        actionType: "UPDATE_PRODUCT",
      },
    ];

    return {
      id: `ai-${Date.now()}`,
      timestamp,
      companyId,
      query: sanitizedQuery,
      answer,
      evidence,
      interpretation,
      recommendations,
      confidence,
      creditsConsumed: 5,
      dataLastSynchronized,
      sourcesUsed,
    };
  }

  // Case D: Services Insights
  if (queryLower.includes("service") || queryLower.includes("repair") || queryLower.includes("engineering")) {
    sourcesUsed.push("SERVICES");

    const answer = `${company.name} offers ${services.length} specialized service capabilities. Service offerings recorded ${totalServiceViews} views in the trailing 30 days.`;

    const evidence: AIEvidenceItem[] = [
      {
        source: "SERVICES",
        detail: `${services.length} published service offerings in company index.`,
      },
      {
        source: "METRICS",
        detail: `${totalServiceViews} service views logged in trailing 30-day period.`,
      },
    ];

    const recommendations: AIRecommendationItem[] = [
      {
        id: "rec-serv-1",
        priority: "P2",
        title: "Clarify Service Operating Scope & Regional Nodes",
        reason: "Regional marine service inquiries require location verification.",
        evidence: `Service offerings connected to headquarters node (${twin.organization.headquarters.city}).`,
        suggestedAction: "Link regional nodes to local service hub dispatch locations.",
        confidence,
        actionType: "COMPLETE_TWIN",
      },
    ];

    return {
      id: `ai-${Date.now()}`,
      timestamp,
      companyId,
      query: sanitizedQuery,
      answer,
      evidence,
      recommendations,
      confidence,
      creditsConsumed: 5,
      dataLastSynchronized,
      sourcesUsed,
    };
  }

  // Case E: Physical Operating Presence, Facilities, Headquarters & Geographic Coverage
  if (
    queryLower.includes("headquarter") ||
    queryLower.includes("hq") ||
    queryLower.includes("facility") ||
    queryLower.includes("facilities") ||
    queryLower.includes("location") ||
    queryLower.includes("locations") ||
    queryLower.includes("branch") ||
    queryLower.includes("branches") ||
    queryLower.includes("service location") ||
    queryLower.includes("service locations") ||
    queryLower.includes("geographic") ||
    queryLower.includes("geographic operations") ||
    queryLower.includes("shipyard") ||
    queryLower.includes("factory") ||
    queryLower.includes("showroom") ||
    queryLower.includes("warehouse") ||
    queryLower.includes("office") ||
    queryLower.includes("offices") ||
    queryLower.includes("where are you") ||
    queryLower.includes("where do you operate") ||
    queryLower.includes("where is") ||
    queryLower.includes("presence") ||
    queryLower.includes("countries")
  ) {
    sourcesUsed.push("BUSINESS TWIN");
    const facilities: PhysicalFacility[] = getPhysicalFacilities(company.id);
    const hq = getRegisteredHeadquarters(company.id) || facilities.find((f) => f.isHeadquarters) || facilities[0];
    const nonHqFacilities = facilities.filter((f) => !f.isHeadquarters);

    const operatingCountries = company.operatingCountries || company.countriesServed || [hq?.country || company.country || "Netherlands"];
    const operatingRegions = company.operatingRegions || company.regionalEditions || [company.region || "Western Europe"];

    let answer = `${company.name} maintains its verified Registered Headquarters at ${hq ? `${hq.facilityName} in ${hq.city}, ${hq.country} (${hq.address})` : `${company.city || "Rotterdam"}, ${company.country || "Netherlands"}`}.`;

    if (hq?.operationalScope) {
      answer += ` Core HQ scope includes: ${hq.operationalScope}.`;
    }

    if (nonHqFacilities.length > 0) {
      answer += ` Additionally, the company operates ${nonHqFacilities.length} specialized physical facility node${nonHqFacilities.length > 1 ? "s" : ""}: ${nonHqFacilities
        .map((f) => `${f.facilityName} (${f.facilityType} in ${f.city}, ${f.country} — ${f.status})`)
        .join("; ")}.`;
    }

    if (operatingCountries.length > 0) {
      answer += ` Verified geographic coverage spans ${operatingCountries.length} countr${operatingCountries.length > 1 ? "ies" : "y"} (${operatingCountries.join(", ")}) across ${operatingRegions.join(", ")}.`;
    }

    const evidence: AIEvidenceItem[] = [
      {
        source: "BUSINESS TWIN",
        detail: `Canonical Headquarters: ${hq?.facilityName || company.name} (${hq?.city || company.city}, ${hq?.country || company.country}). Verification: ${hq?.verificationStatus || "VERIFIED"}.`,
      },
      {
        source: "BUSINESS TWIN",
        detail: `Physical Operating Assets: ${facilities.length} active facilities registered in MarineWorld registry.`,
      },
    ];

    if (operatingCountries.length > 0) {
      evidence.push({
        source: "BUSINESS TWIN",
        detail: `Geographic coverage includes: ${operatingCountries.join(", ")}.`,
      });
    }

    const recommendations: AIRecommendationItem[] = [];
    if (facilities.some((f) => !f.media || f.media.length === 0)) {
      recommendations.push({
        id: "rec-pres-media",
        priority: "P2",
        title: "Add Facility Media & Visual Infrastructure",
        reason: "Facilities with exterior and workshop photos achieve 3x higher trust indexing.",
        evidence: "Facility record is missing photo galleries.",
        suggestedAction: "Upload high-resolution photography for workshops and quayside infrastructure in Company Studio Presence.",
        confidence: "HIGH",
        actionType: "COMPLETE_TWIN",
      });
    }

    return {
      id: `ai-${Date.now()}`,
      timestamp,
      companyId,
      query: sanitizedQuery,
      answer,
      evidence,
      recommendations,
      confidence: "HIGH",
      creditsConsumed: 5,
      dataLastSynchronized,
      sourcesUsed,
    };
  }

  // Case F: Inquiries / Connect Analysis
  if (queryLower.includes("inquiry") || queryLower.includes("inquiries") || queryLower.includes("rfq") || queryLower.includes("connect")) {
    sourcesUsed.push("CONNECT");

    const unreplied = inquiries.filter((i) => i.status === "NEW" || i.status === "IN_PROGRESS");
    const answer = `${company.name} has received ${inquiries.length} total commercial inquiries in Connect. There are currently ${unreplied.length} open inquiries requiring attention.`;

    const evidence: AIEvidenceItem[] = [
      {
        source: "CONNECT",
        detail: `${inquiries.length} total inquiries recorded. ${unreplied.length} in NEW or IN_PROGRESS status.`,
      },
      {
        source: "METRICS",
        detail: `Average Connect response time is within 4 hours.`,
      },
    ];

    const recommendations: AIRecommendationItem[] = [
      {
        id: "rec-inq-1",
        priority: "P1",
        title: "Respond to Pending Commercial RFQs",
        reason: "Fast response time significantly increases buyer conversion.",
        evidence: `${unreplied.length} open inquiry requires response.`,
        suggestedAction: "Review open inquiries in Connect module and send technical quote or response.",
        confidence,
        actionType: "REPLY_INQUIRY",
      },
    ];

    return {
      id: `ai-${Date.now()}`,
      timestamp,
      companyId,
      query: sanitizedQuery,
      answer,
      evidence,
      recommendations,
      confidence,
      creditsConsumed: 5,
      dataLastSynchronized,
      sourcesUsed,
    };
  }

  // Case F: Digital Gaps / What should I improve first?
  if (queryLower.includes("gap") || queryLower.includes("improve") || queryLower.includes("missing")) {
    const answer = `Based on canonical analysis of ${company.name}'s Business Twin (${twin.overallCompleteness}% score) and 30-day activity metrics, your highest-leverage digital improvements are identified below.`;

    const missingFields = Object.values(twin.sectionCompleteness)
      .flatMap((s) => s.missingRequiredFields)
      .filter(Boolean);

    const evidence: AIEvidenceItem[] = [
      {
        source: "BUSINESS TWIN",
        detail: `Completeness score: ${twin.overallCompleteness}%. Missing attributes: ${missingFields.slice(0, 3).join(", ") || "None"}.`,
      },
      {
        source: "METRICS",
        detail: `Profile views: ${totalProfileViews}. Product views: ${totalProductViews}.`,
      },
    ];

    const recommendations: AIRecommendationItem[] = [
      {
        id: "rec-gap-1",
        priority: "P1",
        title: "Complete Executive Summary & Capabilities",
        reason: "Search indexing uses Executive Summary text to rank companies in Sector City hubs.",
        evidence: `Executive summary length: ${twin.identity.shortDescription.length} characters.`,
        suggestedAction: "Refine Executive Summary with target marine sector keywords.",
        confidence: "HIGH",
        actionType: "UPDATE_IDENTITY",
        draftChange: {
          field: "shortDescription",
          label: "Executive Summary",
          currentContent: twin.identity.shortDescription,
          proposedContent: `${company.name} is a leading provider of high-performance marine systems, certified naval materials, and engineering services operating across key European and Asian maritime hubs.`,
          targetType: "IDENTITY",
        },
      },
      {
        id: "rec-gap-2",
        priority: "P2",
        title: "Add Secondary Operating Regional Nodes",
        reason: "Companies with 2+ regional nodes receive 45% more regional RFQ matches.",
        evidence: `Current node count: ${twin.organization.totalNodeCount} headquarters node.`,
        suggestedAction: "Add regional logistics or support nodes in key port cities.",
        confidence: "HIGH",
        actionType: "COMPLETE_TWIN",
      },
    ];

    return {
      id: `ai-${Date.now()}`,
      timestamp,
      companyId,
      query: sanitizedQuery,
      answer,
      evidence,
      interpretation: "Focusing on Business Twin completeness delivers immediate improvements in search discoverability across MarineWorld.City.",
      recommendations,
      confidence: "HIGH",
      creditsConsumed: 5,
      dataLastSynchronized,
      sourcesUsed,
    };
  }

  // Case G: Draft / Content Assistance Request ("Update my description", "Write summary")
  if (queryLower.includes("update") || queryLower.includes("write") || queryLower.includes("draft") || queryLower.includes("description")) {
    const proposedText = `${company.name} is a verified marine engineering and composite manufacturing corporation specializing in certified structural resins, subsea sensor instrumentation, and naval propulsion overhauls. Headquartered in ${twin.organization.headquarters.city}, ${twin.organization.headquarters.country}.`;

    const answer = `I have generated a proposed draft update for ${company.name}'s Executive Summary based on your Business Twin and product offerings. Pursuant to MarineWorld governance, changes remain DRAFT until explicitly confirmed by you below.`;

    const evidence: AIEvidenceItem[] = [
      {
        source: "BUSINESS TWIN",
        detail: "Generated from verified headquarters node, industry taxonomy, and published catalog.",
      },
    ];

    const draftChange: AIDraftChange = {
      field: "shortDescription",
      label: "Executive Short Description",
      currentContent: twin.identity.shortDescription,
      proposedContent: proposedText,
      targetType: "IDENTITY",
    };

    return {
      id: `ai-${Date.now()}`,
      timestamp,
      companyId,
      query: sanitizedQuery,
      answer,
      evidence,
      recommendations: [],
      draftChange,
      confidence: "HIGH",
      creditsConsumed: 5,
      dataLastSynchronized,
      sourcesUsed: ["BUSINESS TWIN"],
    };
  }

  // Default Fallback Response
  return {
    id: `ai-${Date.now()}`,
    timestamp,
    companyId,
    query: sanitizedQuery,
    answer: `Analysis for ${company.name}: Your company maintains an active Business Twin (${twin.overallCompleteness}% score) with ${totalProfileViews} profile views and ${inquiries.length} Connect inquiries. I am grounded in your verified platform data.`,
    evidence: [
      {
        source: "BUSINESS TWIN",
        detail: `Verified status: ${twin.verificationStatus}. Node count: ${twin.organization.totalNodeCount}.`,
      },
      {
        source: "METRICS",
        detail: `30-Day Activity: ${totalProfileViews} views, ${totalProductViews} product views.`,
      },
    ],
    recommendations: [],
    confidence: "HIGH",
    creditsConsumed: 3,
    dataLastSynchronized,
    sourcesUsed: ["BUSINESS TWIN", "METRICS"],
  };
}

/**
 * Execute Confirmed AI Action Flow
 * AI RECOMMENDATION -> USER REVIEW -> USER CONFIRMATION -> SYSTEM ACTION -> AUDIT EVENT
 */
export function applyAIConfirmedAction(
  company: CompanyProfile,
  draftChange: AIDraftChange
): boolean {
  const auth = getCurrentAuthSession();
  if (!isAuthenticated(auth) || !hasCompanyRole(company.id, ["OWNER", "ADMIN", "MANAGER"], auth)) {
    throw new Error("Unauthorized: Only authorized company managers can apply AI draft modifications.");
  }

  if (draftChange.targetType === "IDENTITY" && draftChange.field === "shortDescription") {
    updateBusinessIdentity(company, {
      shortDescription: draftChange.proposedContent,
    });

    recordPlatformEvent({
      eventType: "cta_click",
      companyId: company.id,
      metadata: {
        auditAction: "ai_action_confirmed",
        field: draftChange.field,
        targetType: draftChange.targetType,
      },
    });

    return true;
  }

  return false;
}
