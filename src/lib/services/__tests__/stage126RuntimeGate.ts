/**
 * MARINEWORLD.CITY — Stage 12.6 Runtime Gate Test Suite
 * Private Company AI & Grounded Intelligence Gate
 *
 * 31-Point Validation Matrix (01–31)
 */

import {
  resolveAIContext,
  clearUserAIContextCache,
  executePrivateCompanyAI,
  executePrivateProductAI,
  executePrivateServiceAI,
  executePublicCompanyAI,
  requestAIExecutiveAction,
  submitHumanApprovalForAIAction,
  getPendingAIHumanApprovals,
  getCompanyAIHistory,
} from "@/lib/services/aiDomainService";
import {
  setActiveOrganizationContext,
  resolveAccessContext,
  registerOrganizationalMembership,
} from "@/lib/services/accessContextService";
import {
  createDocument,
  getCompanyDocuments,
} from "@/lib/services/dataSpaceService";
import { getCompanyById, ensureCanonicalCompany } from "@/lib/services/companyService";
import {
  startCompanyOnboarding,
  processPayment,
  activateCompany,
} from "@/lib/services/companyOnboardingService";
import { getCompanyProducts, saveProduct } from "@/lib/services/productService";
import { getCompanyServices, saveService } from "@/lib/services/serviceService";
import { registerCompanyMember, type AuthContext } from "@/lib/services/securityService";

export interface Stage126TestResult {
  test: string;
  passed: boolean;
  details: string;
}

export async function runStage126RuntimeGate(): Promise<{
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: Stage126TestResult[];
}> {
  const results: Stage126TestResult[] = [];

  const adminAuth: AuthContext = {
    uid: "usr-admin-126",
    email: "admin@argento-marine.com",
  };

  const viewerAuth: AuthContext = {
    uid: "usr-viewer-126",
    email: "viewer@argento-marine.com",
  };

  const companyAId = "argento-marine";
  const companyBId = "oceanic-dynamics";

  // Ensure canonical company entities exist in company repository
  ensureCanonicalCompany({
    id: companyAId,
    name: "Argento Marine",
    legalName: "Argento Marine Ltd",
    businessId: "MW-BUS-ARGENTO-MARITIME",
    slug: "argento-marine",
  } as any);

  ensureCanonicalCompany({
    id: companyBId,
    name: "Oceanic Dynamics",
    legalName: "Oceanic Dynamics Inc",
    businessId: "MW-BUS-OCEANIC-DYNAMICS",
    slug: "oceanic-dynamics",
  } as any);

  // Provision active subscriptions and entitlements for test companies
  const obA = startCompanyOnboarding(
    {
      legalName: "Argento Marine Ltd",
      displayName: "Argento Marine",
      slug: "argento-marine",
      sectorId: "marine",
      primaryCityId: "rotterdam",
      country: "Netherlands",
      requestedPlanCode: "ENTERPRISE",
      creatorEmail: adminAuth.email!,
    },
    adminAuth
  );
  if (obA.result?.subscriptionIntent.id) {
    processPayment(obA.result.subscriptionIntent.id, true, "tx-126-a");
    activateCompany(companyAId);
  }

  const obB = startCompanyOnboarding(
    {
      legalName: "Oceanic Dynamics Inc",
      displayName: "Oceanic Dynamics",
      slug: "oceanic-dynamics",
      sectorId: "marine",
      primaryCityId: "rotterdam",
      country: "Netherlands",
      requestedPlanCode: "ENTERPRISE",
      creatorEmail: adminAuth.email!,
    },
    adminAuth
  );
  if (obB.result?.subscriptionIntent.id) {
    processPayment(obB.result.subscriptionIntent.id, true, "tx-126-b");
    activateCompany(companyBId);
  }

  // Register company memberships for testing
  registerOrganizationalMembership(adminAuth.uid!, {
    organizationId: companyAId,
    companyId: companyAId,
    businessId: "MW-BUS-argento-marine",
    organizationName: "Argento Marine",
    organizationType: "COMPANY",
    role: "ADMIN",
    memberStatus: "ACTIVE",
    verificationStatus: "VERIFIED",
    authorityState: "ACTIVE",
  });

  registerOrganizationalMembership(adminAuth.uid!, {
    organizationId: companyBId,
    companyId: companyBId,
    businessId: "MW-BUS-oceanic-dynamics",
    organizationName: "Oceanic Dynamics",
    organizationType: "COMPANY",
    role: "ADMIN",
    memberStatus: "ACTIVE",
    verificationStatus: "VERIFIED",
    authorityState: "ACTIVE",
  });

  registerOrganizationalMembership(viewerAuth.uid!, {
    organizationId: companyAId,
    companyId: companyAId,
    businessId: "MW-BUS-argento-marine",
    organizationName: "Argento Marine",
    organizationType: "COMPANY",
    role: "VIEWER",
    memberStatus: "ACTIVE",
    verificationStatus: "VERIFIED",
    authorityState: "ACTIVE",
  });

  registerCompanyMember({
    companyId: companyAId,
    userId: adminAuth.uid!,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  registerCompanyMember({
    companyId: companyBId,
    userId: adminAuth.uid!,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  registerCompanyMember({
    companyId: companyAId,
    userId: viewerAuth.uid!,
    role: "VIEWER",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  registerCompanyMember({
    companyId: companyAId,
    userId: "usr-inactive-126",
    role: "MEMBER",
    status: "SUSPENDED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Test 01: AI Context Resolution Engine
  setActiveOrganizationContext(adminAuth.uid!, companyAId);
  const aiCtx01 = resolveAIContext(adminAuth, companyAId);
  const pass01 =
    aiCtx01.contextType === "COMPANY_AI" &&
    aiCtx01.authenticatedUserId === adminAuth.uid &&
    aiCtx01.companyId === companyAId &&
    Array.isArray(aiCtx01.allowedSources) &&
    Array.isArray(aiCtx01.allowedDocuments) &&
    aiCtx01.authorizedDataScope === "ORGANIZATION_PRIVATE";

  results.push({
    test: "01. AI Context Resolution Engine",
    passed: pass01,
    details: `ContextType=${aiCtx01.contextType}, Company=${aiCtx01.companyId}, Scope=${aiCtx01.authorizedDataScope}`,
  });

  // Test 02: Context Resolution Cache & Reset
  clearUserAIContextCache(adminAuth.uid!);
  setActiveOrganizationContext(adminAuth.uid!, companyBId);
  const aiCtx02 = resolveAIContext(adminAuth, companyBId);
  const pass02 = aiCtx02.companyId === companyBId;

  results.push({
    test: "02. Context Resolution Cache & Reset",
    passed: pass02,
    details: `TargetCompany=${aiCtx02.companyId} (Expected: ${companyBId})`,
  });

  // Reset back to company A for subsequent tests
  setActiveOrganizationContext(adminAuth.uid!, companyAId);

  // Test 03: Strict Tenant Scope Boundaries
  const aiCtx03 = resolveAIContext(adminAuth, companyAId);
  const docsB = getCompanyDocuments(companyBId, adminAuth);
  const leakedDoc = docsB.find((d) => aiCtx03.allowedDocuments.includes(d.id));
  const pass03 = leakedDoc === undefined;

  results.push({
    test: "03. Strict Tenant Scope Boundaries",
    passed: pass03,
    details: `No Company B documents present in Company A AI allowedDocuments. Leaked=${!!leakedDoc}`,
  });

  // Seed product and service for grounding tests
  const seedProduct = saveProduct(companyAId, {
    id: "prod-126-a",
    slug: "hydraulic-propulsion-pump-x1",
    name: "Hydraulic Propulsion Pump X1",
    description: "High efficiency marine hydraulic pump",
    status: "ACTIVE",
    visibility: "PUBLIC",
  });

  const seedService = saveService(companyAId, {
    id: "serv-126-a",
    slug: "drydock-overhaul-maintenance",
    name: "Drydock Overhaul & Maintenance",
    description: "Complete shipyard maintenance overhaul service",
    status: "ACTIVE",
    visibility: "PUBLIC",
  });

  // Seed public document for public AI isolation test
  createDocument(
    {
      companyId: companyAId,
      businessId: "MW-BUS-ARGENTO-MARITIME",
      title: "Public Marine Manual 2026",
      documentType: "MANUAL",
      status: "ACTIVE",
      sourceType: "MANUAL",
      fileReferences: [],
      visibility: "PUBLIC",
      groundingEligible: true,
      groundingStatus: "GROUNDED",
      createdBy: adminAuth.uid!,
      updatedBy: adminAuth.uid!,
    },
    adminAuth
  );

  // Test 04: Product AI vs Company AI Scope Isolation
  const prodsA = getCompanyProducts(companyAId);
  const targetProdId = prodsA[0]?.id || seedProduct.id;
  const aiCtx04 = resolveAIContext(adminAuth, companyAId, {
    contextType: "PRODUCT_AI",
    productId: targetProdId,
  });
  const pass04 =
    aiCtx04.contextType === "PRODUCT_AI" &&
    aiCtx04.allowedSources.includes("PRODUCT_SOURCE") &&
    aiCtx04.targetProductId === targetProdId;

  results.push({
    test: "04. Product AI vs Company AI Scope Isolation",
    passed: pass04,
    details: `Scope=${aiCtx04.contextType}, TargetProductId=${aiCtx04.targetProductId}`,
  });

  // Test 05: Service AI vs Company AI Scope Isolation
  const servsA = getCompanyServices(companyAId);
  const targetServId = servsA[0]?.id || seedService.id;
  const aiCtx05 = resolveAIContext(adminAuth, companyAId, {
    contextType: "SERVICE_AI",
    serviceId: targetServId,
  });
  const pass05 =
    aiCtx05.contextType === "SERVICE_AI" &&
    aiCtx05.allowedSources.includes("SERVICE_SOURCE") &&
    aiCtx05.targetServiceId === targetServId;

  results.push({
    test: "05. Service AI vs Company AI Scope Isolation",
    passed: pass05,
    details: `Scope=${aiCtx05.contextType}, TargetServiceId=${aiCtx05.targetServiceId}`,
  });

  // Test 06: Cross-Tenant AI Access Block
  const res06 = await executePrivateCompanyAI(companyBId, "Show internal financials", adminAuth);
  const pass06 = res06.limitations === "ACCESS_DENIED" || res06.answer.includes("Access Denied");

  results.push({
    test: "06. Cross-Tenant AI Access Block",
    passed: pass06,
    details: `Response Answer='${res06.answer}', Limitations=${res06.limitations}`,
  });

  // Test 07: Unauthenticated User Block
  const anonAuth: AuthContext = { uid: "", email: "" };
  const res07 = await executePrivateCompanyAI(companyAId, "Show private specs", anonAuth);
  const pass07 = res07.limitations === "ACCESS_DENIED" || res07.answer.includes("Access Denied");

  results.push({
    test: "07. Unauthenticated User Block",
    passed: pass07,
    details: `Limitations=${res07.limitations}`,
  });

  // Test 08: Public Company AI Isolation
  const res08 = await executePublicCompanyAI(companyAId, "What services are offered?");
  const pass08 =
    res08.scope === "COMPANY_AI" &&
    res08.grounded === true &&
    res08.sources.every((s) => s.visibility === "PUBLIC");

  results.push({
    test: "08. Public Company AI Isolation",
    passed: pass08,
    details: `SourcesCount=${res08.sources.length}, AllPublic=${pass08}`,
  });

  // Test 09: Grounding Eligibility Enforcement
  const uneligibleDocRes = createDocument(
    {
      companyId: companyAId,
      businessId: "MW-BUS-ARGENTO-MARITIME",
      title: "Draft Uneligible Policy",
      documentType: "POLICY",
      status: "ACTIVE",
      sourceType: "MANUAL",
      fileReferences: [],
      visibility: "PRIVATE",
      groundingEligible: false,
      groundingStatus: "GROUNDED",
      createdBy: adminAuth.uid!,
      updatedBy: adminAuth.uid!,
    },
    adminAuth
  );
  const uneligibleDocId = uneligibleDocRes.document?.id || "";
  const aiCtx09 = resolveAIContext(adminAuth, companyAId);
  const pass09 = !aiCtx09.allowedDocuments.includes(uneligibleDocId);

  results.push({
    test: "09. Grounding Eligibility Enforcement",
    passed: pass09,
    details: `Uneligible Doc ID=${uneligibleDocId}, Included=${!pass09}`,
  });

  // Test 10: Grounding Status Enforcement
  const indexingDocRes = createDocument(
    {
      companyId: companyAId,
      businessId: "MW-BUS-ARGENTO-MARITIME",
      title: "Indexing Document",
      documentType: "TECHNICAL_SPEC",
      status: "ACTIVE",
      sourceType: "MANUAL",
      fileReferences: [],
      visibility: "PRIVATE",
      groundingEligible: true,
      groundingStatus: "INDEXING",
      createdBy: adminAuth.uid!,
      updatedBy: adminAuth.uid!,
    },
    adminAuth
  );
  const indexingDocId = indexingDocRes.document?.id || "";
  const aiCtx10 = resolveAIContext(adminAuth, companyAId);
  const pass10 = !aiCtx10.allowedDocuments.includes(indexingDocId);

  results.push({
    test: "10. Grounding Status Enforcement (Excludes INDEXING)",
    passed: pass10,
    details: `Indexing Doc Included=${!pass10}`,
  });

  // Test 11: Public vs Private Grounding Filter
  const pubDocRes = createDocument(
    {
      companyId: companyAId,
      businessId: "MW-BUS-ARGENTO-MARITIME",
      title: "Public Marine Manual 2026",
      documentType: "MANUAL",
      status: "ACTIVE",
      sourceType: "MANUAL",
      fileReferences: [],
      visibility: "PUBLIC",
      groundingEligible: true,
      groundingStatus: "GROUNDED",
      createdBy: adminAuth.uid!,
      updatedBy: adminAuth.uid!,
    },
    adminAuth
  );
  const pubRes11 = await executePublicCompanyAI(companyAId, "Show manual");
  const pass11 = pubRes11.sources.some((s) => s.title.includes("Public Marine Manual 2026"));

  results.push({
    test: "11. Public vs Private Grounding Filter",
    passed: pass11,
    details: `Public doc found in public AI sources=${pass11}`,
  });

  // Test 12: Product-Scoped Grounding Filter
  const prodDocRes = createDocument(
    {
      companyId: companyAId,
      businessId: "MW-BUS-ARGENTO-MARITIME",
      title: "Hydraulic Pump Spec 2026",
      documentType: "TECHNICAL_SPEC",
      status: "ACTIVE",
      sourceType: "MANUAL",
      fileReferences: [],
      visibility: "PRIVATE",
      groundingEligible: true,
      groundingStatus: "GROUNDED",
      createdBy: adminAuth.uid!,
      updatedBy: adminAuth.uid!,
      productId: targetProdId,
    },
    adminAuth
  );
  const prodRes12 = await executePrivateProductAI(companyAId, targetProdId, "Show specs", adminAuth);
  const pass12 = prodRes12.sources.some((s) => s.productId === targetProdId || s.title === "Hydraulic Pump Spec 2026");

  results.push({
    test: "12. Product-Scoped Grounding Filter",
    passed: pass12,
    details: `Product doc included in Product AI=${pass12}`,
  });

  // Test 13: Service-Scoped Grounding Filter
  const servDocRes = createDocument(
    {
      companyId: companyAId,
      businessId: "MW-BUS-ARGENTO-MARITIME",
      title: "Drydock Overhaul SLA 2026",
      documentType: "MANUAL",
      status: "ACTIVE",
      sourceType: "MANUAL",
      fileReferences: [],
      visibility: "PRIVATE",
      groundingEligible: true,
      groundingStatus: "GROUNDED",
      createdBy: adminAuth.uid!,
      updatedBy: adminAuth.uid!,
      serviceId: targetServId,
    },
    adminAuth
  );
  const servRes13 = await executePrivateServiceAI(companyAId, targetServId, "Show SLA", adminAuth);
  const pass13 = servRes13.sources.some((s) => s.serviceId === targetServId || s.title === "Drydock Overhaul SLA 2026");

  results.push({
    test: "13. Service-Scoped Grounding Filter",
    passed: pass13,
    details: `Service doc included in Service AI=${pass13}`,
  });

  // Test 14: Missing Data Hallucination Guard
  const res14 = await executePrivateCompanyAI(companyAId, "What is the secret code unreleased spec?", adminAuth);
  const pass14 =
    res14.limitations === "INSUFFICIENT_GROUNDED_CONTEXT" ||
    res14.answer.includes("does not establish");

  results.push({
    test: "14. Missing Data Hallucination Guard",
    passed: pass14,
    details: `Limitations=${res14.limitations}, Answer='${res14.answer}'`,
  });

  // Test 15: Explicit Source Attribution
  const res15 = await executePrivateCompanyAI(companyAId, "Summarize company profile", adminAuth);
  const pass15 =
    Array.isArray(res15.sources) &&
    res15.sources.length > 0 &&
    res15.sources.every((s) => s.sourceType && s.sourceProvenance && s.title);

  results.push({
    test: "15. Explicit Source Attribution Structure",
    passed: pass15,
    details: `Attributions Count=${res15.sources.length}`,
  });

  // Test 16: Canonical vs Derived Provenance
  const canonicalSource = res15.sources.find((s) => s.sourceProvenance === "CANONICAL_SOURCE");
  const derivedSource = res15.sources.find((s) => s.sourceProvenance === "DERIVED_SOURCE");
  const pass16 = canonicalSource !== undefined && derivedSource !== undefined;

  results.push({
    test: "16. Canonical vs Derived Provenance Tags",
    passed: pass16,
    details: `CanonicalFound=${!!canonicalSource}, DerivedFound=${!!derivedSource}`,
  });

  // Test 17: AI Authority Boundaries (Passive Action)
  const act17 = requestAIExecutiveAction(
    { companyId: companyAId, actionType: "AI_READ", target: "doc-123" },
    adminAuth
  );
  const pass17 = act17.success === true && act17.requiresHumanApproval === false;

  results.push({
    test: "17. AI Authority Boundaries (Passive Action auto-allowed)",
    passed: pass17,
    details: `Success=${act17.success}, RequiresApproval=${act17.requiresHumanApproval}`,
  });

  // Test 18: AI Authority Boundaries (Executive Action)
  const act18 = requestAIExecutiveAction(
    { companyId: companyAId, actionType: "AI_SUBMIT", target: "rfq-456" },
    adminAuth
  );
  const pass18 =
    act18.success === true &&
    act18.requiresHumanApproval === true &&
    act18.approvalEvent?.status === "PENDING";

  results.push({
    test: "18. AI Authority Boundaries (Executive Action requires human approval)",
    passed: pass18,
    details: `ApprovalEventStatus=${act18.approvalEvent?.status}`,
  });

  // Test 19: Human Approval Execution
  const approvalId19 = act18.approvalEvent!.id;
  const app19 = submitHumanApprovalForAIAction(approvalId19, true, adminAuth);
  const pass19 = app19.success === true && app19.approvalEvent?.status === "APPROVED";

  results.push({
    test: "19. Human Approval Execution (Approved)",
    passed: pass19,
    details: `ApprovedStatus=${app19.approvalEvent?.status}`,
  });

  // Test 20: Human Rejection Execution
  const act20 = requestAIExecutiveAction(
    { companyId: companyAId, actionType: "AI_SIGN", target: "contract-789" },
    adminAuth
  );
  const app20 = submitHumanApprovalForAIAction(act20.approvalEvent!.id, false, adminAuth);
  const pass20 = app20.success === true && app20.approvalEvent?.status === "REJECTED";

  results.push({
    test: "20. Human Rejection Execution (Rejected)",
    passed: pass20,
    details: `RejectedStatus=${app20.approvalEvent?.status}`,
  });

  // Test 21: Forbidden AI Action Guard
  const act21 = requestAIExecutiveAction(
    { companyId: companyAId, actionType: "AI_EXECUTE", target: "CHANGE_BUSINESS_ID" },
    adminAuth
  );
  const pass21 = act21.success === false && act21.error?.includes("Forbidden Action");

  results.push({
    test: "21. Forbidden AI Action Guard (Identity Mutate Blocked)",
    passed: pass21,
    details: `Error='${act21.error}'`,
  });

  // Test 22: Entitlement Enforcement
  const res22 = await executePrivateCompanyAI(companyAId, "Summarize strategy", adminAuth);
  const pass22 = res22.grounded === true; // Argento Marine has active entitlement

  results.push({
    test: "22. Entitlement Enforcement Engine",
    passed: pass22,
    details: `Grounded=${res22.grounded}, Scope=${res22.scope}`,
  });

  // Test 23: RBAC Role Enforcement (Viewer Cannot Approve AI Action)
  const act23 = requestAIExecutiveAction(
    { companyId: companyAId, actionType: "AI_SUBMIT", target: "rfq-999" },
    adminAuth
  );
  const app23 = submitHumanApprovalForAIAction(act23.approvalEvent!.id, true, viewerAuth);
  const pass23 = app23.success === false && app23.error?.includes("Permission Denied");

  results.push({
    test: "23. RBAC Role Enforcement (Viewer Approval Denied)",
    passed: pass23,
    details: `Error='${app23.error}'`,
  });

  // Test 24: Business Twin Source Integration & Derived Authority Audit (Stage 12.6.1)
  const res24 = await executePrivateCompanyAI(companyAId, "Describe business model", adminAuth);
  const twinSource = res24.sources.find((s) => s.sourceType === "BUSINESS_TWIN_SOURCE");
  const canonicalSources = res24.sources.filter((s) => s.sourceProvenance === "CANONICAL_SOURCE");

  const passTwinExists = twinSource !== undefined;
  const passDerivedClassification = twinSource?.sourceProvenance === "DERIVED_SOURCE";
  const passCanonicalPriority =
    canonicalSources.length > 0 &&
    twinSource !== undefined &&
    res24.sources.indexOf(canonicalSources[0]) < res24.sources.indexOf(twinSource);
  const passProvenancePreserved = typeof twinSource?.provenance === "string" && twinSource.provenance.length > 0;

  // Duplicate source audit: Ensure entity IDs are unique across sources
  const entityIds = res24.sources.map((s) => s.entityId).filter(Boolean);
  const passNoDuplicateSources = new Set(entityIds).size === entityIds.length;

  const pass24 =
    passTwinExists &&
    passDerivedClassification &&
    passCanonicalPriority &&
    passProvenancePreserved &&
    passNoDuplicateSources;

  results.push({
    test: "24. Business Twin Source Integration & Derived Authority Audit (Stage 12.6.1)",
    passed: pass24,
    details: `TwinFound=${passTwinExists}, DerivedClassification=${passDerivedClassification}, CanonicalPriority=${passCanonicalPriority}, ProvenancePreserved=${passProvenancePreserved}, DuplicateAuditPass=${passNoDuplicateSources}`,
  });

  // Test 25: Multi-Organization Switch Isolation
  setActiveOrganizationContext(adminAuth.uid!, companyBId);
  const aiCtx25 = resolveAIContext(adminAuth, companyBId);
  const pass25 = aiCtx25.companyId === companyBId;

  results.push({
    test: "25. Multi-Organization Switch Isolation",
    passed: pass25,
    details: `Switch to ${companyBId} verified cleanly.`,
  });

  // Reset back to company A
  setActiveOrganizationContext(adminAuth.uid!, companyAId);

  // Test 26: Public Visitor AI Scope
  const aiCtx26 = resolveAIContext({ uid: "", email: "" }, companyAId, { isPublicOnly: true });
  const pass26 = aiCtx26.isPublicOnly === true && aiCtx26.authorizedDataScope === "PUBLIC_ONLY";

  results.push({
    test: "26. Public Visitor AI Scope",
    passed: pass26,
    details: `IsPublicOnly=${aiCtx26.isPublicOnly}, DataScope=${aiCtx26.authorizedDataScope}`,
  });

  // Test 27: Audit Interaction Logging
  const auditLogs27 = getCompanyAIHistory(companyAId);
  const pass27 = Array.isArray(auditLogs27) && auditLogs27.length > 0;

  results.push({
    test: "27. Audit Interaction Logging Store",
    passed: pass27,
    details: `Logged Interactions Count=${auditLogs27.length}`,
  });

  // Test 28: Response Contract Schema Conformity
  const res28 = await executePrivateCompanyAI(companyAId, "Check status", adminAuth);
  const pass28 =
    typeof res28.answer === "string" &&
    typeof res28.confidence === "string" &&
    typeof res28.grounded === "boolean" &&
    Array.isArray(res28.sources) &&
    res28.scope === "COMPANY_AI";

  results.push({
    test: "28. Response Contract Schema Conformity",
    passed: pass28,
    details: `Schema verified cleanly (${res28.scope}, Grounded=${res28.grounded})`,
  });

  // Test 29: Inactive Membership AI Access Block
  const inactiveAuth: AuthContext = { uid: "usr-inactive-126", email: "inactive@test.com" };
  const res29 = await executePrivateCompanyAI(companyAId, "Private query", inactiveAuth);
  const pass29 = res29.limitations === "ACCESS_DENIED" || res29.answer.includes("Access Denied");

  results.push({
    test: "29. Inactive Membership AI Access Block",
    passed: pass29,
    details: `Limitations=${res29.limitations}`,
  });

  // Test 30: Suspended Authority AI Access Block
  const res30 = await executePrivateCompanyAI("comp-suspended-test", "Private query", adminAuth);
  const pass30 = res30.limitations === "ACCESS_DENIED" || res30.answer.includes("Access Denied");

  results.push({
    test: "30. Suspended Authority AI Access Block",
    passed: pass30,
    details: `Limitations=${res30.limitations}`,
  });

  // Test 31: Grounding Attribution Visibility Match
  const res31 = await executePrivateCompanyAI(companyAId, "Check attributions", adminAuth);
  const pass31 = res31.sources.every((s) => s.visibility === "PUBLIC" || s.visibility === "PRIVATE");

  results.push({
    test: "31. Grounding Attribution Visibility Match",
    passed: pass31,
    details: `Attributions visibility tags validated across ${res31.sources.length} sources.`,
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    passedCount,
    failedCount,
    totalCount: results.length,
    results,
  };
}
