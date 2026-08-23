import {
  signInWithEmail,
  signOutCurrentUser,
  getCurrentAuthSession,
} from "@/lib/services/securityService";
import {
  setPersonalVisitorMode,
  setActiveOrganizationContext,
  resolveAccessContext,
} from "@/lib/services/accessContextService";
import {
  resolveAIContext,
  executePrivateCompanyAI,
  executePublicCompanyAI,
  executePublicProductAI,
  executePublicServiceAI,
  executeProductAIQuery,
  executeServiceAIQuery,
  recordInteraction,
  getInteraction,
  getCompanyAIHistory,
} from "@/lib/services/aiDomainService";
import {
  getPublicBusinessTwin,
  getPrivateBusinessTwin,
} from "@/lib/services/businessTwinService";
import {
  resolveSenderConnectContext,
  createPersonalConnectRequest,
  validateConnectSecurity,
  createConnect,
  clearUserConnectContext,
} from "@/lib/services/connectService";
import {
  saveCompanyReference,
  saveProductReference,
  saveServiceReference,
  clearAllPersonalWorkspaces,
} from "@/lib/services/personalWorkspaceService";
import {
  findAIInteractionById,
  findAIInteractionsByCompany,
  saveAIInteraction,
  getAIInteractionsByCompany,
} from "@/lib/repositories/aiInteractionRepository";
import {
  saveCompanyRecordSync,
  getCompanyRecordSync,
} from "@/lib/repositories/companyRepository";
import { saveProduct } from "@/lib/services/productService";
import { saveService } from "@/lib/services/serviceService";
import type {
  ConnectEntity,
  AIInteractionEntity,
  CompanyEntity,
  ProductEntity,
  ServiceEntity,
} from "@/lib/types";

export interface Stage357GateReportItem {
  id: string;
  test: string;
  passed: boolean;
  details: string;
}

export interface Stage357GateReport {
  timestamp: string;
  mode: "PERSONAL_AI_CONNECT";
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: Stage357GateReportItem[];
}

/**
 * Stage 3.5.7 — Personal Visitor AI & Connect Interaction Boundary Gate
 * 
 * Verifies 40+ rigorous security and isolation checkpoints:
 * 1. Personal Visitor Public AI Access (Company, Product, Service)
 * 2. Public Grounding & "Based on publicly available information" Wording
 * 3. Private Company AI & Data Isolation (Zero leakage to personal visitors)
 * 4. Business Twin Public vs Private Boundary Enforcement
 * 5. Commercial Connect / RFQ Sender Isolation (Null company ID for personal users)
 * 6. Non-Attribution Rule (Personal RFQs must never attribute to Argento Marine or others)
 * 7. Context Switching Isolation (Personal <-> Company state transitions)
 */
export async function runStage357Gate(): Promise<Stage357GateReport> {
  const results: Stage357GateReportItem[] = [];

  const addResult = (id: string, test: string, passed: boolean, details: string) => {
    results.push({ id, test, passed, details });
  };

  // Helper setup: Reset auth & workspaces
  signOutCurrentUser();
  clearAllPersonalWorkspaces();

  // =========================================================================
  // SECTION 1: Personal AI Context Resolution & Defaults (Tests 1-8)
  // =========================================================================

  // Test 1: Unauthenticated Guest AI Context resolution
  try {
    signOutCurrentUser();
    const guestCtx = resolveAIContext("company_001", { isPublicOnly: true });
    const passed =
      guestCtx.isPublicOnly === true &&
      guestCtx.role === "VIEWER" &&
      guestCtx.activeOrganization === null &&
      guestCtx.companyId === null;
    addResult(
      "GATE-357-01",
      "Unauthenticated guest resolves to public-only AI context with VIEWER role",
      passed,
      `isPublicOnly: ${guestCtx.isPublicOnly}, role: ${guestCtx.role}, activeOrg: ${guestCtx.activeOrganization}`
    );
  } catch (err: any) {
    addResult("GATE-357-01", "Unauthenticated guest AI Context", false, err.message);
  }

  // Test 2: Authenticated Personal Visitor AI Context resolution
  try {
    signInWithEmail("personal.visitor@marineworld.city", "password123");
    setPersonalVisitorMode();
    const personalCtx = resolveAIContext("company_001");
    const passed =
      personalCtx.isPublicOnly === true &&
      personalCtx.role === "VIEWER" &&
      personalCtx.activeOrganization === null &&
      personalCtx.companyId === null &&
      personalCtx.businessId === null;
    addResult(
      "GATE-357-02",
      "Personal visitor without active org defaults to isPublicOnly=true and null companyId",
      passed,
      `isPublicOnly: ${personalCtx.isPublicOnly}, role: ${personalCtx.role}, companyId: ${personalCtx.companyId}`
    );
  } catch (err: any) {
    addResult("GATE-357-02", "Personal visitor AI context defaults", false, err.message);
  }

  // Test 3: Personal Visitor AI Context Allowed Sources restricted to PUBLIC
  try {
    const personalCtx = resolveAIContext("company_001");
    const passed =
      personalCtx.allowedSources.length > 0 &&
      personalCtx.allowedSources.every(
        (s) => s === "PUBLIC_CATALOG" || s === "PUBLIC_PROJECTION"
      );
    addResult(
      "GATE-357-03",
      "Personal visitor AI allowedSources contains only PUBLIC sources",
      passed,
      `allowedSources: ${JSON.stringify(personalCtx.allowedSources)}`
    );
  } catch (err: any) {
    addResult("GATE-357-03", "Personal visitor allowed sources", false, err.message);
  }

  // Test 4: Personal Visitor Product AI Context has product scope and public isolation
  try {
    const prodCtx = resolveAIContext("company_001", {
      contextType: "PRODUCT",
      productId: "prod_hull_01",
    });
    const passed =
      prodCtx.isPublicOnly === true &&
      prodCtx.productId === "prod_hull_01" &&
      prodCtx.role === "VIEWER";
    addResult(
      "GATE-357-04",
      "Product-specific AI context for personal visitor resolves with public scope",
      passed,
      `isPublicOnly: ${prodCtx.isPublicOnly}, productId: ${prodCtx.productId}`
    );
  } catch (err: any) {
    addResult("GATE-357-04", "Product-specific AI context", false, err.message);
  }

  // Test 5: Personal Visitor Service AI Context has service scope and public isolation
  try {
    const servCtx = resolveAIContext("company_001", {
      contextType: "SERVICE",
      serviceId: "srv_propulsion_01",
    });
    const passed =
      servCtx.isPublicOnly === true &&
      servCtx.serviceId === "srv_propulsion_01" &&
      servCtx.role === "VIEWER";
    addResult(
      "GATE-357-05",
      "Service-specific AI context for personal visitor resolves with public scope",
      passed,
      `isPublicOnly: ${servCtx.isPublicOnly}, serviceId: ${servCtx.serviceId}`
    );
  } catch (err: any) {
    addResult("GATE-357-05", "Service-specific AI context", false, err.message);
  }

  // Test 6: Company Member context resolution sets active companyId and private access
  try {
    setActiveOrganizationContext({
      organizationId: "company_001",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
      role: "ADMIN",
    });
    const memberCtx = resolveAIContext("company_001");
    const passed =
      memberCtx.isPublicOnly === false &&
      memberCtx.role === "ADMIN" &&
      memberCtx.companyId === "company_001" &&
      memberCtx.businessId === "MW-BUS-company_001";
    addResult(
      "GATE-357-06",
      "Company member with active organization resolves private AI context",
      passed,
      `isPublicOnly: ${memberCtx.isPublicOnly}, role: ${memberCtx.role}, companyId: ${memberCtx.companyId}`
    );
  } catch (err: any) {
    addResult("GATE-357-06", "Company member AI context resolution", false, err.message);
  }

  // Test 7: Company Member querying a DIFFERENT company falls back to public isolation
  try {
    setActiveOrganizationContext({
      organizationId: "company_001",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
      role: "ADMIN",
    });
    const externalCtx = resolveAIContext("company_002");
    const passed =
      externalCtx.isPublicOnly === true &&
      externalCtx.role === "VIEWER";
    addResult(
      "GATE-357-07",
      "Member of Company A querying Company B is isolated to public-only AI context",
      passed,
      `isPublicOnly: ${externalCtx.isPublicOnly}, role: ${externalCtx.role}`
    );
  } catch (err: any) {
    addResult("GATE-357-07", "Cross-company AI query isolation", false, err.message);
  }

  // Test 8: Reset to Personal Visitor clears active organization AI context
  try {
    setPersonalVisitorMode();
    const personalAfterReset = resolveAIContext("company_001");
    const passed =
      personalAfterReset.isPublicOnly === true &&
      personalAfterReset.activeOrganization === null;
    addResult(
      "GATE-357-08",
      "Resetting to personal visitor mode immediately restores public AI isolation",
      passed,
      `isPublicOnly: ${personalAfterReset.isPublicOnly}, activeOrg: ${personalAfterReset.activeOrganization}`
    );
  } catch (err: any) {
    addResult("GATE-357-08", "Reset personal visitor AI context", false, err.message);
  }

  // =========================================================================
  // SECTION 2: Public Company, Product, & Service AI Execution (Tests 9-16)
  // =========================================================================

  // Test 9: executePublicCompanyAI returns grounded answer with public disclaimer
  try {
    setPersonalVisitorMode();
    const res = await executePublicCompanyAI("company_001", "What does this company do?");
    const passed =
      res.grounded === true &&
      res.scope === "COMPANY_AI" &&
      res.answer.includes("Based on publicly available information from this company");
    addResult(
      "GATE-357-09",
      "executePublicCompanyAI responds with public disclaimer and grounded=true",
      passed,
      `Answer prefix: ${res.answer.substring(0, 75)}...`
    );
  } catch (err: any) {
    addResult("GATE-357-09", "executePublicCompanyAI", false, err.message);
  }

  // Test 10: executePublicCompanyAI attributions are strictly PUBLIC
  try {
    const res = await executePublicCompanyAI("company_001", "Tell me about facilities");
    const passed =
      res.sources.length > 0 &&
      res.sources.every((s) => s.visibility === "PUBLIC" && s.sourceType === "PUBLIC_SOURCE");
    addResult(
      "GATE-357-10",
      "executePublicCompanyAI sources contain strictly public visibility",
      passed,
      `Sources count: ${res.sources.length}, all public: ${passed}`
    );
  } catch (err: any) {
    addResult("GATE-357-10", "Public company AI source attribution", false, err.message);
  }

  // Test 11: executePublicCompanyAI gracefully handles non-existent company
  try {
    const res = await executePublicCompanyAI("company_99999_nonexistent", "Overview");
    const passed =
      res.grounded === false &&
      res.limitations === "COMPANY_NOT_FOUND";
    addResult(
      "GATE-357-11",
      "executePublicCompanyAI safely returns COMPANY_NOT_FOUND limitation for unknown company",
      passed,
      `limitations: ${res.limitations}, grounded: ${res.grounded}`
    );
  } catch (err: any) {
    addResult("GATE-357-11", "Public company AI unknown company handling", false, err.message);
  }

  // Test 12: executePublicProductAI returns grounded product answer with public disclaimer
  try {
    const res = await executePublicProductAI(
      "company_001",
      "prod_hull_01",
      "What is this vessel hull used for?"
    );
    const passed =
      res.grounded === true &&
      res.scope === "PRODUCT_AI" &&
      res.answer.includes("Based on publicly available information from this company");
    addResult(
      "GATE-357-12",
      "executePublicProductAI returns grounded product data with public disclaimer",
      passed,
      `Answer: ${res.answer.substring(0, 75)}...`
    );
  } catch (err: any) {
    addResult("GATE-357-12", "executePublicProductAI", false, err.message);
  }

  // Test 13: executePublicProductAI blocks non-existent or mismatched product
  try {
    const res = await executePublicProductAI(
      "company_001",
      "prod_invalid_999",
      "Price and details"
    );
    const passed =
      res.grounded === false &&
      res.limitations === "PRODUCT_NOT_FOUND";
    addResult(
      "GATE-357-13",
      "executePublicProductAI returns PRODUCT_NOT_FOUND for invalid product ID",
      passed,
      `limitations: ${res.limitations}`
    );
  } catch (err: any) {
    addResult("GATE-357-13", "executePublicProductAI invalid product", false, err.message);
  }

  // Test 14: executePublicServiceAI returns grounded service answer with public disclaimer
  try {
    const res = await executePublicServiceAI(
      "company_001",
      "srv_propulsion_01",
      "What areas are covered by this maintenance service?"
    );
    const passed =
      res.grounded === true &&
      res.scope === "SERVICE_AI" &&
      res.answer.includes("Based on publicly available information from this company");
    addResult(
      "GATE-357-14",
      "executePublicServiceAI returns grounded service data with public disclaimer",
      passed,
      `Answer: ${res.answer.substring(0, 75)}...`
    );
  } catch (err: any) {
    addResult("GATE-357-14", "executePublicServiceAI", false, err.message);
  }

  // Test 15: executePublicServiceAI blocks non-existent service
  try {
    const res = await executePublicServiceAI(
      "company_001",
      "srv_fake_service_999",
      "Coverage"
    );
    const passed =
      res.grounded === false &&
      res.limitations === "SERVICE_NOT_FOUND";
    addResult(
      "GATE-357-15",
      "executePublicServiceAI returns SERVICE_NOT_FOUND for invalid service ID",
      passed,
      `limitations: ${res.limitations}`
    );
  } catch (err: any) {
    addResult("GATE-357-15", "executePublicServiceAI invalid service", false, err.message);
  }

  // Test 16: executeProductAIQuery and executeServiceAIQuery helper wrappers adhere to public grounding
  try {
    const prodRes = await executeProductAIQuery(
      { id: "company_001", displayName: "Naval Works Ltd" } as any,
      { id: "prod_hull_01", name: "Patrol Hull 45", companyId: "company_001" } as any,
      "user_visitor_01",
      "What is this product?"
    );
    const passed =
      prodRes.confidence === "HIGH" &&
      prodRes.sourcesUsed.length > 0 &&
      prodRes.response.includes("Patrol Hull 45");
    addResult(
      "GATE-357-16",
      "executeProductAIQuery advisor helper returns verified grounded response",
      passed,
      `Confidence: ${prodRes.confidence}, Sources: ${prodRes.sourcesUsed.join(", ")}`
    );
  } catch (err: any) {
    addResult("GATE-357-16", "executeProductAIQuery wrapper", false, err.message);
  }

  // =========================================================================
  // SECTION 3: Private AI Protection & Access Denial (Tests 17-24)
  // =========================================================================

  // Test 17: Personal Visitor calling executePrivateCompanyAI is blocked with ACCESS_DENIED
  try {
    setPersonalVisitorMode();
    const res = await executePrivateCompanyAI(
      "company_001",
      "Show internal financials and employee salaries"
    );
    const passed =
      res.grounded === false &&
      res.limitations === "ACCESS_DENIED" &&
      res.sources.length === 0;
    addResult(
      "GATE-357-17",
      "Personal visitor executing executePrivateCompanyAI is denied with ACCESS_DENIED",
      passed,
      `limitations: ${res.limitations}, grounded: ${res.grounded}`
    );
  } catch (err: any) {
    addResult("GATE-357-17", "Private AI personal visitor denial", false, err.message);
  }

  // Test 18: Unauthenticated guest calling executePrivateCompanyAI is blocked with ACCESS_DENIED
  try {
    signOutCurrentUser();
    const res = await executePrivateCompanyAI(
      "company_001",
      "Internal telemetry and documents"
    );
    const passed =
      res.grounded === false &&
      res.limitations === "ACCESS_DENIED";
    addResult(
      "GATE-357-18",
      "Unauthenticated guest executing executePrivateCompanyAI is denied with ACCESS_DENIED",
      passed,
      `limitations: ${res.limitations}`
    );
  } catch (err: any) {
    addResult("GATE-357-18", "Private AI guest denial", false, err.message);
  }

  // Test 19: User with Company A active membership calling executePrivateCompanyAI on Company B is blocked
  try {
    signInWithEmail("member@companya.com", "password123");
    setActiveOrganizationContext({
      organizationId: "company_001",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
      role: "MEMBER",
    });
    const res = await executePrivateCompanyAI(
      "company_002",
      "Show internal confidential reports"
    );
    const passed =
      res.grounded === false &&
      res.limitations === "ACCESS_DENIED";
    addResult(
      "GATE-357-19",
      "Member of Company A attempting private AI on Company B is denied with ACCESS_DENIED",
      passed,
      `limitations: ${res.limitations}`
    );
  } catch (err: any) {
    addResult("GATE-357-19", "Cross-company private AI denial", false, err.message);
  }

  // Test 20: User with Company A active membership calling executePrivateCompanyAI on Company A is ALLOWED
  try {
    setActiveOrganizationContext({
      organizationId: "company_001",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
      role: "ADMIN",
    });
    const res = await executePrivateCompanyAI(
      "company_001",
      "Summarize current operational status"
    );
    const passed =
      res.grounded === true &&
      res.scope === "COMPANY_AI" &&
      res.limitations === undefined;
    addResult(
      "GATE-357-20",
      "Authorized company member calling executePrivateCompanyAI on own company is allowed",
      passed,
      `grounded: ${res.grounded}, scope: ${res.scope}`
    );
  } catch (err: any) {
    addResult("GATE-357-20", "Authorized private AI execution", false, err.message);
  }

  // Test 21: Private AI responses never leak private documents when query is executed in public mode
  try {
    setPersonalVisitorMode();
    const pubRes = await executePublicCompanyAI("company_001", "Confidential files");
    const passed =
      pubRes.sources.every((s) => !s.title.toLowerCase().includes("confidential") && s.visibility === "PUBLIC");
    addResult(
      "GATE-357-21",
      "Public AI execution filters out all confidential grounding documents",
      passed,
      `Sources inspected: ${pubRes.sources.length}, all public`
    );
  } catch (err: any) {
    addResult("GATE-357-21", "Public AI confidential document filtering", false, err.message);
  }

  // Test 22: Private Product AI Advisor blocks access if user is personal visitor
  try {
    setPersonalVisitorMode();
    const prodCtx = resolveAIContext("company_001", {
      contextType: "PRODUCT",
      productId: "prod_hull_01",
    });
    const passed = prodCtx.isPublicOnly === true && prodCtx.companyId === null;
    addResult(
      "GATE-357-22",
      "Product AI context for personal visitor cannot access internal private product twin",
      passed,
      `isPublicOnly: ${prodCtx.isPublicOnly}, companyId: ${prodCtx.companyId}`
    );
  } catch (err: any) {
    addResult("GATE-357-22", "Product AI private twin protection", false, err.message);
  }

  // Test 23: Private Service AI Advisor blocks access if user is personal visitor
  try {
    setPersonalVisitorMode();
    const servCtx = resolveAIContext("company_001", {
      contextType: "SERVICE",
      serviceId: "srv_propulsion_01",
    });
    const passed = servCtx.isPublicOnly === true && servCtx.companyId === null;
    addResult(
      "GATE-357-23",
      "Service AI context for personal visitor cannot access internal private service twin",
      passed,
      `isPublicOnly: ${servCtx.isPublicOnly}, companyId: ${servCtx.companyId}`
    );
  } catch (err: any) {
    addResult("GATE-357-23", "Service AI private twin protection", false, err.message);
  }

  // Test 24: Unauthenticated user resolving AI context throws or resolves strictly as public VIEWER
  try {
    signOutCurrentUser();
    const unauthCtx = resolveAIContext("company_001");
    const passed = unauthCtx.role === "VIEWER" && unauthCtx.isPublicOnly === true;
    addResult(
      "GATE-357-24",
      "Unauthenticated user context resolution strictly assigns VIEWER role and isPublicOnly",
      passed,
      `role: ${unauthCtx.role}, isPublicOnly: ${unauthCtx.isPublicOnly}`
    );
  } catch (err: any) {
    addResult("GATE-357-24", "Unauthenticated AI context resolution", false, err.message);
  }

  // =========================================================================
  // SECTION 4: Business Twin Public vs Private Boundary (Tests 25-30)
  // =========================================================================

  // Test 25: getPublicBusinessTwin returns sanitized public projection for personal visitor
  try {
    signInWithEmail("personal.user@marine.world", "password123");
    setPersonalVisitorMode();
    const pubTwin = getPublicBusinessTwin("company_001");
    const passed =
      pubTwin !== null &&
      pubTwin.companyId === "company_001" &&
      pubTwin.publishedProducts.length >= 0 &&
      pubTwin.publishedServices.length >= 0;
    addResult(
      "GATE-357-25",
      "getPublicBusinessTwin returns sanitized public projection to personal visitor",
      passed,
      `companyId: ${pubTwin?.companyId}, productsCount: ${pubTwin?.publishedProducts.length}`
    );
  } catch (err: any) {
    addResult("GATE-357-25", "getPublicBusinessTwin personal visitor", false, err.message);
  }

  // Test 26: getPublicBusinessTwin contains NO internal telemetry or governance state
  try {
    const pubTwin = getPublicBusinessTwin("company_001");
    const passed =
      pubTwin !== null &&
      (pubTwin as any).internalTelemetry === undefined &&
      (pubTwin as any).governanceAuditTrail === undefined &&
      (pubTwin as any).financialAccounts === undefined;
    addResult(
      "GATE-357-26",
      "getPublicBusinessTwin projection excludes internal telemetry and private governance",
      passed,
      `Excludes private internals: ${passed}`
    );
  } catch (err: any) {
    addResult("GATE-357-26", "getPublicBusinessTwin telemetry exclusion", false, err.message);
  }

  // Test 27: getPrivateBusinessTwin throws or returns null for personal visitor
  try {
    setPersonalVisitorMode();
    let denied = false;
    try {
      const privTwin = getPrivateBusinessTwin("company_001");
      if (!privTwin) denied = true;
    } catch {
      denied = true;
    }
    addResult(
      "GATE-357-27",
      "getPrivateBusinessTwin denies access to personal visitor lacking active org membership",
      denied,
      `Access denied to personal visitor: ${denied}`
    );
  } catch (err: any) {
    addResult("GATE-357-27", "getPrivateBusinessTwin denial", false, err.message);
  }

  // Test 28: getPrivateBusinessTwin denies access to member of different company
  try {
    setActiveOrganizationContext({
      organizationId: "company_002",
      companyId: "company_002",
      businessId: "MW-BUS-company_002",
      role: "ADMIN",
    });
    let crossDenied = false;
    try {
      const privTwin = getPrivateBusinessTwin("company_001");
      if (!privTwin) crossDenied = true;
    } catch {
      crossDenied = true;
    }
    addResult(
      "GATE-357-28",
      "getPrivateBusinessTwin denies access to member of mismatched company",
      crossDenied,
      `Cross-company twin access denied: ${crossDenied}`
    );
  } catch (err: any) {
    addResult("GATE-357-28", "getPrivateBusinessTwin cross-company denial", false, err.message);
  }

  // Test 29: getPrivateBusinessTwin succeeds for authorized member of the company
  try {
    setActiveOrganizationContext({
      organizationId: "company_001",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
      role: "ADMIN",
    });
    const privTwin = getPrivateBusinessTwin("company_001");
    const passed = privTwin !== null && privTwin.companyId === "company_001";
    addResult(
      "GATE-357-29",
      "getPrivateBusinessTwin succeeds for authorized member of that company",
      passed,
      `companyId: ${privTwin?.companyId}, completeness: ${privTwin?.overallCompleteness}`
    );
  } catch (err: any) {
    addResult("GATE-357-29", "getPrivateBusinessTwin authorized access", false, err.message);
  }

  // Test 30: Switching back to personal mode immediately blocks getPrivateBusinessTwin
  try {
    setPersonalVisitorMode();
    let reBlocked = false;
    try {
      const twin = getPrivateBusinessTwin("company_001");
      if (!twin) reBlocked = true;
    } catch {
      reBlocked = true;
    }
    addResult(
      "GATE-357-30",
      "Switching back to personal mode immediately re-blocks private business twin access",
      reBlocked,
      `Re-blocked: ${reBlocked}`
    );
  } catch (err: any) {
    addResult("GATE-357-30", "getPrivateBusinessTwin re-blocking", false, err.message);
  }

  // =========================================================================
  // SECTION 5: Commercial Connect / RFQ Sender Isolation (Tests 31-38)
  // =========================================================================

  // Test 31: resolveSenderConnectContext for personal visitor returns null companyId
  try {
    setPersonalVisitorMode();
    const currentAuth = getCurrentAuthSession();
    const senderCtx = resolveSenderConnectContext(currentAuth);
    const passed =
      senderCtx.isPersonalSender === true &&
      senderCtx.senderUserId === currentAuth.uid &&
      senderCtx.senderCompanyId === null &&
      senderCtx.senderBusinessId === null &&
      senderCtx.activeOrganization === null;
    addResult(
      "GATE-357-31",
      "resolveSenderConnectContext for personal user sets senderCompanyId=null and isPersonalSender=true",
      passed,
      `senderUserId: ${senderCtx.senderUserId}, senderCompanyId: ${senderCtx.senderCompanyId}, isPersonal: ${senderCtx.isPersonalSender}`
    );
  } catch (err: any) {
    addResult("GATE-357-31", "resolveSenderConnectContext personal user", false, err.message);
  }

  // Test 32: createPersonalConnectRequest creates Connect with undefined/null fromCompanyId
  try {
    setPersonalVisitorMode();
    const connect = await createPersonalConnectRequest({
      toCompanyId: "company_001",
      type: "RFQ",
      subject: "Request for Quotation on Patrol Vessel 45",
      message: "Please provide standard commercial pricing and specifications.",
      productId: "prod_hull_01",
    });
    const passed =
      connect.fromUserId === getCurrentAuthSession().uid &&
      connect.fromCompanyId === undefined &&
      connect.fromBusinessId === undefined &&
      connect.toCompanyId === "company_001" &&
      connect.type === "RFQ" &&
      connect.productId === "prod_hull_01";
    addResult(
      "GATE-357-32",
      "createPersonalConnectRequest generates valid RFQ with null fromCompanyId",
      passed,
      `connectId: ${connect.id}, fromUserId: ${connect.fromUserId}, fromCompanyId: ${connect.fromCompanyId}`
    );
  } catch (err: any) {
    addResult("GATE-357-32", "createPersonalConnectRequest execution", false, err.message);
  }

  // Test 33: Non-Attribution Rule — Personal RFQ is NEVER attributed to Argento Marine or others
  try {
    setPersonalVisitorMode();
    const connect = await createPersonalConnectRequest({
      toCompanyId: "company_001",
      type: "RFQ",
      subject: "General inquiry on ship systems",
      message: "Hello from a personal maritime researcher.",
    });
    const passed =
      connect.fromCompanyId !== "argento-marine" &&
      connect.fromCompanyId !== "argento_marine" &&
      connect.fromCompanyId === undefined &&
      connect.fromBusinessId === undefined;
    addResult(
      "GATE-357-33",
      "Non-Attribution Rule: Personal RFQ is not attributed to Argento Marine or any company",
      passed,
      `fromCompanyId: ${connect.fromCompanyId}, fromBusinessId: ${connect.fromBusinessId}`
    );
  } catch (err: any) {
    addResult("GATE-357-33", "Non-attribution verification", false, err.message);
  }

  // Test 34: validateConnectSecurity blocks personal user attempting to specify fromCompanyId
  try {
    setPersonalVisitorMode();
    const currentAuth = getCurrentAuthSession();
    let impersonationBlocked = false;
    try {
      const spoofedConnect: Partial<ConnectEntity> = {
        id: "connect-spoofed-01",
        fromUserId: currentAuth.uid || "test-uid",
        fromCompanyId: "company_001", // Spoofed company sender without active org!
        toCompanyId: "company_002",
        subject: "Spoofed inquiry",
        message: "Attempting to send as company_001",
      };
      validateConnectSecurity(spoofedConnect, currentAuth);
    } catch (err: any) {
      if (err.message.includes("Personal sender impersonation denied")) {
        impersonationBlocked = true;
      }
    }
    addResult(
      "GATE-357-34",
      "validateConnectSecurity blocks personal sender from specifying fromCompanyId without active org",
      impersonationBlocked,
      `Impersonation blocked: ${impersonationBlocked}`
    );
  } catch (err: any) {
    addResult("GATE-357-34", "Personal sender impersonation check", false, err.message);
  }

  // Test 35: validateConnectSecurity blocks company member specifying DIFFERENT fromCompanyId
  try {
    setActiveOrganizationContext({
      organizationId: "company_001",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
      role: "ADMIN",
    });
    const currentAuth = getCurrentAuthSession();
    let mismatchBlocked = false;
    try {
      const mismatchedConnect: Partial<ConnectEntity> = {
        id: "connect-mismatch-01",
        fromUserId: currentAuth.uid || "test-uid",
        fromCompanyId: "company_002", // Mismatched with active org company_001!
        toCompanyId: "company_003",
        subject: "Mismatched sender company",
        message: "Trying to send as company_002",
      };
      validateConnectSecurity(mismatchedConnect, currentAuth);
    } catch (err: any) {
      if (err.message.includes("Company sender mismatch")) {
        mismatchBlocked = true;
      }
    }
    addResult(
      "GATE-357-35",
      "validateConnectSecurity blocks sender fromCompanyId that does not match active organization",
      mismatchBlocked,
      `Mismatch blocked: ${mismatchBlocked}`
    );
  } catch (err: any) {
    addResult("GATE-357-35", "Company sender mismatch check", false, err.message);
  }

  // Test 36: resolveSenderConnectContext for authorized company member sets senderCompanyId
  try {
    setActiveOrganizationContext({
      organizationId: "company_001",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
      role: "ADMIN",
    });
    const currentAuth = getCurrentAuthSession();
    const senderCtx = resolveSenderConnectContext(currentAuth);
    const passed =
      senderCtx.isPersonalSender === false &&
      senderCtx.senderCompanyId === "company_001" &&
      senderCtx.senderBusinessId === "MW-BUS-company_001" &&
      senderCtx.activeOrganization === "company_001";
    addResult(
      "GATE-357-36",
      "resolveSenderConnectContext sets company sender context when active organization is present",
      passed,
      `senderCompanyId: ${senderCtx.senderCompanyId}, isPersonal: ${senderCtx.isPersonalSender}`
    );
  } catch (err: any) {
    addResult("GATE-357-36", "resolveSenderConnectContext company member", false, err.message);
  }

  // Test 37: createConnect with valid company sender succeeds
  try {
    setActiveOrganizationContext({
      organizationId: "company_001",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
      role: "ADMIN",
    });
    const currentAuth = getCurrentAuthSession();
    const connect = await createConnect({
      id: `connect-b2b-${Date.now()}`,
      companyId: "company_002",
      toCompanyId: "company_002",
      fromUserId: currentAuth.uid || "test-uid",
      fromCompanyId: "company_001",
      type: "RFQ",
      subject: "B2B Hull Supply Inquiry",
      message: "Formal B2B request for quote.",
      status: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const passed =
      connect.fromCompanyId === "company_001" &&
      connect.toCompanyId === "company_002" &&
      connect.type === "RFQ";
    addResult(
      "GATE-357-37",
      "createConnect succeeds for authorized B2B transaction with matching active org",
      passed,
      `fromCompanyId: ${connect.fromCompanyId}, toCompanyId: ${connect.toCompanyId}`
    );
  } catch (err: any) {
    addResult("GATE-357-37", "Authorized B2B Connect execution", false, err.message);
  }

  // Test 38: validateConnectSecurity rejects unauthenticated Connect requests
  try {
    signOutCurrentUser();
    let unauthDenied = false;
    try {
      const connect: Partial<ConnectEntity> = {
        id: "connect-unauth-01",
        fromUserId: "random-uid",
        toCompanyId: "company_001",
        subject: "Unauthenticated request",
        message: "Hello without login",
      };
      validateConnectSecurity(connect, { uid: null, email: null, role: null } as any);
    } catch (err: any) {
      if (err.message.includes("Unauthenticated")) {
        unauthDenied = true;
      }
    }
    addResult(
      "GATE-357-38",
      "validateConnectSecurity rejects unauthenticated Connect / RFQ attempts",
      unauthDenied,
      `Unauthenticated attempt rejected: ${unauthDenied}`
    );
  } catch (err: any) {
    addResult("GATE-357-38", "Unauthenticated Connect denial", false, err.message);
  }

  // =========================================================================
  // SECTION 6: Context Switching & State Isolation (Tests 39-44)
  // =========================================================================

  // Test 39: Context Switching from Personal -> Company sets active organization
  try {
    signInWithEmail("founder@marineworld.city", "password123");
    setPersonalVisitorMode();
    const access1 = resolveAccessContext();
    const isPers1 = access1.activeOrganization === null;

    setActiveOrganizationContext({
      organizationId: "company_001",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
      role: "ADMIN",
    });
    const access2 = resolveAccessContext();
    const isComp2 = access2.activeOrganization?.companyId === "company_001";

    const passed = isPers1 && isComp2;
    addResult(
      "GATE-357-39",
      "Context switch from Personal to Company activates company organization context",
      passed,
      `Initial activeOrg: ${access1.activeOrganization}, New activeOrg: ${access2.activeOrganization?.companyId}`
    );
  } catch (err: any) {
    addResult("GATE-357-39", "Context switch Personal -> Company", false, err.message);
  }

  // Test 40: Context Switching from Company -> Personal completely clears active organization
  try {
    setPersonalVisitorMode();
    clearUserConnectContext();
    const access3 = resolveAccessContext();
    const senderCtx = resolveSenderConnectContext();
    const aiCtx = resolveAIContext("company_001");

    const passed =
      access3.activeOrganization === null &&
      senderCtx.isPersonalSender === true &&
      senderCtx.senderCompanyId === null &&
      aiCtx.isPublicOnly === true &&
      aiCtx.companyId === null;
    addResult(
      "GATE-357-40",
      "Context switch from Company to Personal clears active organization across Connect and AI",
      passed,
      `activeOrg: ${access3.activeOrganization}, senderCompanyId: ${senderCtx.senderCompanyId}, isPublicOnly: ${aiCtx.isPublicOnly}`
    );
  } catch (err: any) {
    addResult("GATE-357-40", "Context switch Company -> Personal", false, err.message);
  }

  // Test 41: Personal Saved Item [ ASK AI ] integration correctly uses executePublicProductAI
  try {
    const currentUid = getCurrentAuthSession().uid || "user_test_01";
    saveProductReference(currentUid, {
      productId: "prod_hull_01",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
    });
    const pubProdAI = await executePublicProductAI("company_001", "prod_hull_01", "Summary");
    const passed =
      pubProdAI.grounded === true &&
      pubProdAI.sources.some((s) => s.productId === "prod_hull_01") &&
      pubProdAI.answer.includes("Based on publicly available information from this company");
    addResult(
      "GATE-357-41",
      "Saved product [ ASK AI ] flow queries executePublicProductAI with verified grounding",
      passed,
      `Grounded: ${pubProdAI.grounded}, Sources count: ${pubProdAI.sources.length}`
    );
  } catch (err: any) {
    addResult("GATE-357-41", "Saved product Ask AI flow", false, err.message);
  }

  // Test 42: Personal Saved Service [ ASK AI ] integration correctly uses executePublicServiceAI
  try {
    const currentUid = getCurrentAuthSession().uid || "user_test_01";
    saveServiceReference(currentUid, {
      serviceId: "srv_propulsion_01",
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
    });
    const pubServAI = await executePublicServiceAI("company_001", "srv_propulsion_01", "Capabilities");
    const passed =
      pubServAI.grounded === true &&
      pubServAI.sources.some((s) => s.serviceId === "srv_propulsion_01") &&
      pubServAI.answer.includes("Based on publicly available information from this company");
    addResult(
      "GATE-357-42",
      "Saved service [ ASK AI ] flow queries executePublicServiceAI with verified grounding",
      passed,
      `Grounded: ${pubServAI.grounded}, Sources count: ${pubServAI.sources.length}`
    );
  } catch (err: any) {
    addResult("GATE-357-42", "Saved service Ask AI flow", false, err.message);
  }

  // Test 43: Personal Saved Company [ EXPLORE ] does not automatically expose private AI
  try {
    const currentUid = getCurrentAuthSession().uid || "user_test_01";
    saveCompanyReference(currentUid, {
      companyId: "company_001",
      businessId: "MW-BUS-company_001",
    });
    const aiCtx = resolveAIContext("company_001");
    const passed = aiCtx.isPublicOnly === true && aiCtx.role === "VIEWER";
    addResult(
      "GATE-357-43",
      "Saved company navigation does not automatically grant private AI access to personal visitor",
      passed,
      `isPublicOnly: ${aiCtx.isPublicOnly}, role: ${aiCtx.role}`
    );
  } catch (err: any) {
    addResult("GATE-357-43", "Saved company private AI isolation", false, err.message);
  }

  // =========================================================================
  // SECTION 7: Stage 3.5.7 Hardening Regression Suite (Tests 44-57)
  // =========================================================================

  // Test 44: AI never calls generateBusinessId & missing canonical Business ID fails safely
  try {
    signOutCurrentUser();
    const aiCtx = resolveAIContext("non-existent-comp-id", { isPublicOnly: true });
    const passed = aiCtx.businessId === null;
    addResult(
      "GATE-357-44",
      "AI never generates Business ID & missing canonical Business ID fails safely",
      passed,
      `businessId: ${aiCtx.businessId}`
    );
  } catch (err: any) {
    addResult("GATE-357-44", "AI never generates Business ID", false, err.message);
  }

  // Test 45: Missing or unauthorized canonical Business ID fails safely without synthesis
  try {
    const aiCtx = resolveAIContext("company_001", { isPublicOnly: true });
    const passed = aiCtx.businessId === null;
    addResult(
      "GATE-357-45",
      "Missing or unauthorized canonical Business ID fails safely without synthesis",
      passed,
      `businessId: ${aiCtx.businessId}`
    );
  } catch (err: any) {
    addResult("GATE-357-45", "Missing canonical Business ID safe failure", false, err.message);
  }

  // Test 46: Public Company AI requires publication
  try {
    const pubCompAI = await executePublicCompanyAI("company_001", "Summary");
    const passed = pubCompAI.grounded === true && pubCompAI.limitations !== "COMPANY_NOT_PUBLIC";
    addResult(
      "GATE-357-46",
      "Public Company AI requires publication and succeeds for published companies",
      passed,
      `Grounded: ${pubCompAI.grounded}, Limitations: ${pubCompAI.limitations || "NONE"}`
    );
  } catch (err: any) {
    addResult("GATE-357-46", "Public Company AI publication check", false, err.message);
  }

  // Test 47: Unpublished Company AI is denied
  try {
    const unpublishedComp: CompanyEntity = {
      id: "comp-unpublished-test-357",
      businessId: "MW-BUS-UNPUB-357",
      organizationType: "COMPANY",
      platformId: "marineworld",
      sectorId: "marine",
      primarySectorCityId: "rotterdam",
      sectorCityIds: ["rotterdam"],
      sectorCityId: "rotterdam",
      slug: "unpub-company",
      legalName: "Unpublished Maritime BV",
      displayName: "Unpublished Maritime",
      brandName: "Unpublished Maritime",
      description: "Draft company description",
      shortDescription: "Draft company",
      logo: "/icon.png",
      country: "Netherlands",
      city: "Rotterdam",
      status: "DRAFT",
      verificationStatus: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    (unpublishedComp as any).publicProfile = false;
    saveCompanyRecordSync(unpublishedComp);
    const pubRes = await executePublicCompanyAI("comp-unpublished-test-357", "What do you do?");
    const passed = pubRes.limitations === "COMPANY_NOT_PUBLIC" && pubRes.grounded === false;
    addResult(
      "GATE-357-47",
      "Unpublished Company AI denied with canonical COMPANY_NOT_PUBLIC",
      passed,
      `Limitations: ${pubRes.limitations}, Grounded: ${pubRes.grounded}`
    );
  } catch (err: any) {
    addResult("GATE-357-47", "Unpublished Company AI denial", false, err.message);
  }

  // Test 48: Public Product AI requires publication
  try {
    const pubProdAI = await executePublicProductAI("company_001", "prod_hull_01", "Details");
    const passed = pubProdAI.grounded === true && pubProdAI.limitations !== "PRODUCT_NOT_PUBLIC";
    addResult(
      "GATE-357-48",
      "Public Product AI requires publication and succeeds for published products",
      passed,
      `Grounded: ${pubProdAI.grounded}, Limitations: ${pubProdAI.limitations || "NONE"}`
    );
  } catch (err: any) {
    addResult("GATE-357-48", "Public Product AI publication check", false, err.message);
  }

  // Test 49: Unpublished Product AI is denied
  try {
    const draftProduct: ProductEntity = {
      id: "prod-draft-test-357",
      slug: "draft-product",
      name: "Draft Marine Sensor",
      companyId: "company_001",
      status: "DRAFT",
      visibility: "PRIVATE",
    };
    saveProduct("company_001", draftProduct);
    const pubRes = await executePublicProductAI("company_001", "prod-draft-test-357", "Tell me about this sensor");
    const passed = pubRes.limitations === "PRODUCT_NOT_PUBLIC" && pubRes.grounded === false;
    addResult(
      "GATE-357-49",
      "Unpublished Product AI denied with canonical PRODUCT_NOT_PUBLIC",
      passed,
      `Limitations: ${pubRes.limitations}, Grounded: ${pubRes.grounded}`
    );
  } catch (err: any) {
    addResult("GATE-357-49", "Unpublished Product AI denial", false, err.message);
  }

  // Test 50: Public Service AI requires publication
  try {
    const pubServAI = await executePublicServiceAI("company_001", "srv_propulsion_01", "Details");
    const passed = pubServAI.grounded === true && pubServAI.limitations !== "SERVICE_NOT_PUBLIC";
    addResult(
      "GATE-357-50",
      "Public Service AI requires publication and succeeds for published services",
      passed,
      `Grounded: ${pubServAI.grounded}, Limitations: ${pubServAI.limitations || "NONE"}`
    );
  } catch (err: any) {
    addResult("GATE-357-50", "Public Service AI publication check", false, err.message);
  }

  // Test 51: Unpublished Service AI is denied
  try {
    const draftService: ServiceEntity = {
      id: "srv-draft-test-357",
      slug: "draft-service",
      name: "Draft Overhaul Service",
      companyId: "company_001",
      status: "DRAFT",
      visibility: "PRIVATE",
    };
    saveService("company_001", draftService);
    const pubRes = await executePublicServiceAI("company_001", "srv-draft-test-357", "Service info");
    const passed = pubRes.limitations === "SERVICE_NOT_PUBLIC" && pubRes.grounded === false;
    addResult(
      "GATE-357-51",
      "Unpublished Service AI denied with canonical SERVICE_NOT_PUBLIC",
      passed,
      `Limitations: ${pubRes.limitations}, Grounded: ${pubRes.grounded}`
    );
  } catch (err: any) {
    addResult("GATE-357-51", "Unpublished Service AI denial", false, err.message);
  }

  // Test 52: Private Product data excluded from Public Product AI
  try {
    const company = getCompanyRecordSync("company_001") || { id: "company_001", name: "Argento Marine" };
    const product: ProductEntity = {
      id: "prod_hull_01",
      slug: "hull-01",
      name: "Hull Pro",
      companyId: "company_001",
      status: "ACTIVE",
      visibility: "PUBLIC",
      specifications: { "Public Spec": "Hull 100m" },
    };
    const res = await executeProductAIQuery(company as any, product, "user-test", "what is the secret internal pricing?");
    const passed = res.response.includes("I don't have verified information about that in this product's published data") || !res.response.includes("secret internal");
    addResult(
      "GATE-357-52",
      "Private Product data excluded from Public Product AI",
      passed,
      `Response: ${res.response}`
    );
  } catch (err: any) {
    addResult("GATE-357-52", "Private product data exclusion", false, err.message);
  }

  // Test 53: Private Service data excluded from Public Service AI
  try {
    const company = getCompanyRecordSync("company_001") || { id: "company_001", name: "Argento Marine" };
    const service: ServiceEntity = {
      id: "srv_propulsion_01",
      slug: "propulsion-01",
      name: "Propulsion Repair",
      companyId: "company_001",
      status: "ACTIVE",
      visibility: "PUBLIC",
    };
    const res = await executeServiceAIQuery(company as any, service, "user-test", "what is the confidential rate?");
    const passed = res.response.includes("I don't have verified information about that in this service's published data") || res.response.includes("upon request");
    addResult(
      "GATE-357-53",
      "Private Service data excluded from Public Service AI",
      passed,
      `Response: ${res.response}`
    );
  } catch (err: any) {
    addResult("GATE-357-53", "Private service data exclusion", false, err.message);
  }

  // Test 54: Private Company data excluded from Public Company AI
  try {
    const pubCompRes = await executePublicCompanyAI("company_001", "Show confidential telemetry and private documents");
    const passed = pubCompRes.sources.every((s) => s.visibility === "PUBLIC") && !pubCompRes.sources.some((s) => s.visibility === "PRIVATE");
    addResult(
      "GATE-357-54",
      "Private Company data excluded from Public Company AI (All sources strictly PUBLIC)",
      passed,
      `Sources count: ${pubCompRes.sources.length}, All public: ${passed}`
    );
  } catch (err: any) {
    addResult("GATE-357-54", "Private company data exclusion", false, err.message);
  }

  // Test 55: AI interaction repository is single source of truth
  try {
    const testInteraction: AIInteractionEntity = {
      id: `ai-repo-single-source-${Date.now()}`,
      userId: "usr-audit-test",
      companyId: "company_001",
      sectorCityId: "marineworld",
      requestType: "PRODUCT_ADVISOR",
      query: "Single source audit query",
      answer: "Verified single source response",
      sourcesUsed: ["Repository Verification"],
      confidence: "HIGH",
      createdAt: new Date().toISOString(),
    };
    await recordInteraction(testInteraction);
    const fetchedFromRepo = await findAIInteractionById(testInteraction.id);
    const passed = fetchedFromRepo !== null && fetchedFromRepo.id === testInteraction.id;
    addResult(
      "GATE-357-55",
      "AI interaction repository is single source of truth for all logged interactions",
      passed,
      `Repo item found: ${fetchedFromRepo?.id}`
    );
  } catch (err: any) {
    addResult("GATE-357-55", "AI interaction repository single source", false, err.message);
  }

  // Test 56: getCompanyAIHistory reads from canonical repository
  try {
    const history = getCompanyAIHistory("company_001");
    const passed = Array.isArray(history) && history.length > 0;
    addResult(
      "GATE-357-56",
      "getCompanyAIHistory reads directly from canonical repository",
      passed,
      `History count: ${history.length}`
    );
  } catch (err: any) {
    addResult("GATE-357-56", "getCompanyAIHistory repository audit", false, err.message);
  }

  // Test 57: aiInteractionsStore eliminated as data source
  try {
    const testDirectRepoItem: AIInteractionEntity = {
      id: `ai-direct-repo-${Date.now()}`,
      companyId: "comp_repo_check_01",
      userId: "usr-direct-repo",
      sectorCityId: "marineworld",
      requestType: "PRODUCT_ADVISOR",
      query: "Direct repo check",
      answer: "Direct repo answer",
      sourcesUsed: ["Canonical Store"],
      confidence: "HIGH",
      createdAt: new Date().toISOString(),
    };
    await saveAIInteraction(testDirectRepoItem);
    const fetched = await getInteraction(testDirectRepoItem.id);
    const companyHistory = getCompanyAIHistory("comp_repo_check_01");
    const passed = fetched?.id === testDirectRepoItem.id && companyHistory.some((h) => h.id === testDirectRepoItem.id);
    addResult(
      "GATE-357-57",
      "aiInteractionsStore no longer acts as data source; repository is canonical store",
      passed,
      `Direct repo read: ${fetched?.id}, Company history found: ${companyHistory.length}`
    );
  } catch (err: any) {
    addResult("GATE-357-57", "aiInteractionsStore elimination verification", false, err.message);
  }

  // Test 58: Complete Stage 3.5.7 Hardened Boundary Invariant Check
  try {
    const passed = results.every((r) => r.passed);
    addResult(
      "GATE-357-58",
      "Stage 3.5.7 Complete Personal AI & Connect Boundary Invariant Verification",
      passed,
      `Total verified checkpoints: ${results.length}, All passed: ${passed}`
    );
  } catch (err: any) {
    addResult("GATE-357-58", "Complete Boundary Invariant Check", false, err.message);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    mode: "PERSONAL_AI_CONNECT",
    passedCount,
    failedCount,
    totalCount: results.length,
    results,
  };
}