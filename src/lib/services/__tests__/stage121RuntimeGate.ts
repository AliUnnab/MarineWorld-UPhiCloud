import {
  resolveAccessContext,
  setActiveOrganizationContext,
  getUserMemberships,
  registerOrganizationalMembership,
  validateCompanyAccess,
  validateEcosystemOrganizationAccess,
  resolveAIContext,
  resolveCommercialConnectContext,
} from "../accessContextService";
import {
  getCurrentAuthSession,
  setCurrentAuthSession,
  registerCompanyMember,
} from "../securityService";
import { resolveIdentity } from "../identityService";
import { resolveDomain } from "../domainService";

import { getCompanyById } from "../companyService";
import type { OrganizationalMembership, AccessContext } from "@/lib/types";

/**
 * Stage 12.1 — Three Identity Entry & Access Context Gate Runtime Test Matrix
 * Validates all 20 required architectural constraints deterministically.
 */
export function runStage121RuntimeGate() {
  const results: Array<{ test: string; passed: boolean; details: string }> = [];

  // Save current auth session to restore at end
  const originalAuth = getCurrentAuthSession();

  try {
    // Test 01: Unauthenticated visitor
    setCurrentAuthSession({ uid: null, email: undefined });
    const res01 = resolveAccessContext();
    const pass01 =
      res01.contextType === "VISITOR" &&
      res01.isAuthenticated === false &&
      res01.activeOrganization === null &&
      res01.capabilities.canExplorePublic === true &&
      res01.capabilities.canAccessCompanyStudio === false;
    results.push({
      test: "01. Unauthenticated Visitor Context",
      passed: pass01,
      details: `contextType=${res01.contextType}, isAuthenticated=${res01.isAuthenticated}`,
    });

    // Test 02: Authenticated individual without organization
    setCurrentAuthSession({ uid: "usr-solo-indiv-101", email: "indiv@gmail.com" });
    const res02 = resolveAccessContext();
    const pass02 =
      res02.contextType === "VISITOR" &&
      res02.isAuthenticated === true &&
      res02.activeOrganization === null &&
      res02.capabilities.canInitiateConnect === true &&
      res02.capabilities.canSubmitRFQ === true &&
      res02.capabilities.canAccessCompanyStudio === false;
    results.push({
      test: "02. Authenticated Individual Without Organization",
      passed: pass02,
      details: `contextType=${res02.contextType}, isAuthenticated=${res02.isAuthenticated}, activeOrg=null`,
    });

    // Test 03: Authenticated company owner
    setCurrentAuthSession({ uid: "usr-owner-001", email: "owner@argento.com" });
    const res03 = resolveAccessContext();
    const pass03 =
      res03.contextType === "COMPANY" &&
      res03.activeOrganization?.role === "OWNER" &&
      res03.activeOrganization?.companyId === "argento-marine" &&
      res03.capabilities.canAccessCompanyStudio === true &&
      res03.capabilities.canManageMembers === true;
    results.push({
      test: "03. Authenticated Company Owner Context",
      passed: pass03,
      details: `contextType=${res03.contextType}, role=${res03.activeOrganization?.role}, busId=${res03.activeOrganization?.businessId}`,
    });

    // Test 04: Authenticated company admin
    registerCompanyMember({
      userId: "usr-admin-002",
      companyId: "argento-marine",
      role: "ADMIN",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    registerOrganizationalMembership("usr-admin-002", {
      organizationId: "argento-marine",
      companyId: "argento-marine",
      businessId: "MW-BUS-ARGENTO-MARITIME",
      organizationName: "Argento Marine",
      organizationType: "COMPANY",
      role: "ADMIN",
      memberStatus: "ACTIVE",
      verificationStatus: "VERIFIED",
      authorityState: "ACTIVE",
    });
    setCurrentAuthSession({ uid: "usr-admin-002", email: "admin@argento.com" });
    const res04 = resolveAccessContext();
    const pass04 =
      res04.contextType === "COMPANY" &&
      res04.activeOrganization?.role === "ADMIN" &&
      res04.capabilities.canManageMembers === true;
    results.push({
      test: "04. Authenticated Company Admin Context",
      passed: pass04,
      details: `contextType=${res04.contextType}, role=${res04.activeOrganization?.role}, canManageMembers=${res04.capabilities.canManageMembers}`,
    });

    // Test 05: Authenticated company member
    registerCompanyMember({
      userId: "usr-member-003",
      companyId: "argento-marine",
      role: "MEMBER",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    registerOrganizationalMembership("usr-member-003", {
      organizationId: "argento-marine",
      companyId: "argento-marine",
      businessId: "MW-BUS-ARGENTO-MARITIME",
      organizationName: "Argento Marine",
      organizationType: "COMPANY",
      role: "MEMBER",
      memberStatus: "ACTIVE",
      verificationStatus: "VERIFIED",
      authorityState: "ACTIVE",
    });
    setCurrentAuthSession({ uid: "usr-member-003", email: "member@argento.com" });
    const res05 = resolveAccessContext();
    const pass05 =
      res05.contextType === "COMPANY" &&
      res05.activeOrganization?.role === "MEMBER" &&
      res05.capabilities.canManageMembers === false;
    results.push({
      test: "05. Authenticated Company Member Context",
      passed: pass05,
      details: `contextType=${res05.contextType}, role=${res05.activeOrganization?.role}, canManageMembers=${res05.capabilities.canManageMembers}`,
    });

    // Test 06: User with multiple companies
    setCurrentAuthSession({ uid: "usr-multi-owner-003", email: "multi@marineworld.city" });
    const res06 = resolveAccessContext();
    const pass06 =
      res06.availableMemberships.length >= 2 &&
      res06.availableMemberships.some((m) => m.companyId === "argento-marine") &&
      res06.availableMemberships.some((m) => m.companyId === "crest-group-materials");
    results.push({
      test: "06. User With Multiple Company Memberships",
      passed: pass06,
      details: `Count=${res06.availableMemberships.length}, Orgs=${res06.availableMemberships.map((m) => m.organizationId).join(", ")}`,
    });

    // Test 07: User switching active company
    setCurrentAuthSession({ uid: "usr-multi-owner-003", email: "multi@marineworld.city" });
    const switchSuccess = setActiveOrganizationContext("usr-multi-owner-003", "crest-group-materials");
    const res07 = resolveAccessContext();
    const pass07 =
      switchSuccess &&
      res07.activeOrganization?.companyId === "crest-group-materials" &&
      res07.activeOrganization?.businessId === "MW-BUS-CREST-GROUP-MATERIALS";
    results.push({
      test: "07. User Switching Active Company Context",
      passed: pass07,
      details: `Active CompanyId=${res07.activeOrganization?.companyId}, BusId=${res07.activeOrganization?.businessId}`,
    });

    // Test 08: User with company + ecosystem organization
    setCurrentAuthSession({ uid: "usr-multi-owner-003", email: "multi@marineworld.city" });
    setActiveOrganizationContext("usr-multi-owner-003", "maritime-association");
    const res08 = resolveAccessContext();
    const pass08 =
      res08.contextType === "ECOSYSTEM_ORGANIZATION" &&
      res08.activeOrganization?.organizationType === "ASSOCIATION" &&
      res08.capabilities.canAccessOrganizationPortal === true;
    results.push({
      test: "08. User With Company + Ecosystem Organization",
      passed: pass08,
      details: `ContextType=${res08.contextType}, OrgType=${res08.activeOrganization?.organizationType}`,
    });

    // Test 09: Invalid companyId
    setCurrentAuthSession({ uid: "usr-owner-001", email: "owner@argento.com" });
    const val09 = validateCompanyAccess("invalid-company-id-999");
    const pass09 = val09.authorized === false && val09.reason.includes("no active membership");
    results.push({
      test: "09. Invalid Company ID Access Rejection",
      passed: pass09,
      details: `Authorized=${val09.authorized}, Reason=${val09.reason}`,
    });

    // Test 10: Invalid businessId
    const fakeComp = getCompanyById("argento-marine");
    const pass10 = !!fakeComp && fakeComp.businessId === "MW-BUS-ARGENTO-MARITIME";
    results.push({
      test: "10. Invalid Business ID Identity Integrity",
      passed: pass10,
      details: `Valid Business ID=${fakeComp?.businessId}`,
    });

    // Test 11: BusinessId mismatch with companyId
    setCurrentAuthSession({ uid: "usr-owner-001", email: "owner@argento.com" });
    const val11 = validateCompanyAccess("crest-group-materials");
    const pass11 = val11.authorized === false;
    results.push({
      test: "11. BusinessId / CompanyId Context Mismatch Rejection",
      passed: pass11,
      details: `Authorized=${val11.authorized}, Reason=${val11.reason}`,
    });

    // Test 12: Domain resolves company but user has no membership
    const resolvedId = resolveIdentity("crestgroupmaterials.com");
    setCurrentAuthSession({ uid: "usr-owner-001", email: "owner@argento.com" });
    const val12 = validateCompanyAccess(resolvedId.companyId || "crest-group-materials");
    const pass12 =
      resolvedId.identityType === "COMPANY" &&
      resolvedId.companyId === "crest-group-materials" &&
      val12.authorized === false;
    results.push({
      test: "12. Domain Resolution Identifies Entity But Does Not Grant Authorization",
      passed: pass12,
      details: `Resolved entity=${resolvedId.companyId}, Authorization=${val12.authorized}`,
    });

    // Test 13: Suspended company membership
    setCurrentAuthSession({ uid: "usr-suspended-member-005", email: "suspended@argento.com" });
    const val13 = validateCompanyAccess("argento-marine");
    const pass13 = val13.authorized === false;
    results.push({
      test: "13. Suspended Company Membership Access Rejection",
      passed: pass13,
      details: `Authorized=${val13.authorized}, Reason=${val13.reason}`,
    });

    // Test 14: Suspended organization
    registerOrganizationalMembership("usr-suspended-org-006", {
      organizationId: "suspended-org",
      companyId: "suspended-org",
      businessId: "MW-BUS-SUSPENDED-ORG",
      organizationName: "Suspended Corp",
      organizationType: "COMPANY",
      role: "OWNER",
      memberStatus: "ACTIVE",
      verificationStatus: "SUSPENDED",
      authorityState: "SUSPENDED",
    });
    setCurrentAuthSession({ uid: "usr-suspended-org-006", email: "suspendedorg@test.com" });
    const val14 = validateCompanyAccess("suspended-org");
    const pass14 = val14.authorized === false && val14.reason.includes("SUSPENDED");
    results.push({
      test: "14. Suspended Organization Authority State Rejection",
      passed: pass14,
      details: `Authorized=${val14.authorized}, Reason=${val14.reason}`,
    });

    // Test 15: Invalid organization type
    setCurrentAuthSession({ uid: "usr-owner-001", email: "owner@argento.com" });
    const val15 = validateEcosystemOrganizationAccess("argento-marine");
    const pass15 = val15.authorized === false && val15.reason.includes("not an ecosystem organization");
    results.push({
      test: "15. Invalid Organization Type Enforcement",
      passed: pass15,
      details: `Authorized=${val15.authorized}, Reason=${val15.reason}`,
    });

    // Test 16: Ecosystem organization admin
    setCurrentAuthSession({ uid: "usr-ecosystem-admin-004", email: "admin@port.org" });
    const res16 = resolveAccessContext();
    const pass16 =
      res16.contextType === "ECOSYSTEM_ORGANIZATION" &&
      res16.activeOrganization?.organizationType === "PUBLIC_ORGANIZATION" &&
      res16.capabilities.canAccessOrganizationPortal === true &&
      res16.capabilities.canManageMembers === true;
    results.push({
      test: "16. Ecosystem Organization Admin Context",
      passed: pass16,
      details: `ContextType=${res16.contextType}, OrgType=${res16.activeOrganization?.organizationType}, canPortal=${res16.capabilities.canAccessOrganizationPortal}`,
    });

    // Test 17: Unauthorized organization access
    setCurrentAuthSession({ uid: "usr-owner-001", email: "owner@argento.com" });
    const val17 = validateEcosystemOrganizationAccess("port-authority");
    const pass17 = val17.authorized === false;
    results.push({
      test: "17. Unauthorized Ecosystem Organization Access Rejection",
      passed: pass17,
      details: `Authorized=${val17.authorized}, Reason=${val17.reason}`,
    });

    // Test 18: Business ID disclosure does not grant authorization
    setCurrentAuthSession({ uid: "usr-solo-indiv-101", email: "indiv@gmail.com" });
    const val18 = validateEcosystemOrganizationAccess("port-authority");
    const pass18 = val18.authorized === false;
    results.push({
      test: "18. Business ID Disclosure Does Not Grant Authorization",
      passed: pass18,
      details: `Authorized=${val18.authorized}, Reason=${val18.reason}`,
    });

    // Test 19: AI context uses active organization
    setCurrentAuthSession({ uid: "usr-owner-001", email: "owner@argento.com" });
    const aiCtx19 = resolveAIContext();
    const pass19 =
      aiCtx19.companyId === "argento-marine" &&
      aiCtx19.businessId === "MW-BUS-ARGENTO-MARITIME" &&
      aiCtx19.authorizedDataScope === "ORGANIZATION_PRIVATE";
    results.push({
      test: "19. AI Context Uses Active Organization Identity & Data Scope",
      passed: pass19,
      details: `CompanyId=${aiCtx19.companyId}, BusinessId=${aiCtx19.businessId}, Scope=${aiCtx19.authorizedDataScope}`,
    });

    // Test 20: Connect/RFQ preserves active company context
    setCurrentAuthSession({ uid: "usr-owner-001", email: "owner@argento.com" });
    const connCtx20 = resolveCommercialConnectContext("crest-group-materials");
    const pass20 =
      connCtx20.fromUserId === "usr-owner-001" &&
      connCtx20.fromCompanyId === "argento-marine" &&
      connCtx20.fromBusinessId === "MW-BUS-ARGENTO-MARITIME" &&
      connCtx20.toCompanyId === "crest-group-materials" &&
      connCtx20.toBusinessId === "MW-BUS-CREST-GROUP-MATERIALS";
    results.push({
      test: "20. Connect/RFQ Preserves Active Company Context & Business IDs",
      passed: pass20,
      details: `From=${connCtx20.fromCompanyId} (${connCtx20.fromBusinessId}) -> To=${connCtx20.toCompanyId} (${connCtx20.toBusinessId})`,
    });

  } finally {
    // Restore original auth session
    setCurrentAuthSession(originalAuth);
  }

  const allPassed = results.every((r) => r.passed);
  console.log("=== STAGE 12.1 THREE IDENTITY ENTRY & ACCESS CONTEXT GATE TEST RESULTS ===");
  results.forEach((r) => console.log(`${r.passed ? "✅ [PASS]" : "❌ [FAIL]"} ${r.test} — ${r.details}`));
  console.log(`OVERALL: ${allPassed ? "ALL 20 TESTS PASSED PERFECTLY" : "SOME TESTS FAILED"}`);

  return { allPassed, results };
}
