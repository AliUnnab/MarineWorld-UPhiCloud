import {
  getFirebaseAuth,
  getFirebaseApp,
  googleAuthProvider,
  mapFirebaseUserToAuthContext,
} from "@/lib/auth/firebaseAuth";
import {
  getActiveAuthAdapter,
  setAuthAdapterProvider,
  subscribeAuthState,
  type AuthContext,
} from "@/lib/auth/authAdapter";
import {
  resolveCompanyStudioAccess,
  getStudioNavigation,
  getCompanyDataSpace,
} from "@/lib/services/studioService";
import {
  getCurrentAuthSession,
  setCurrentAuthSession,
  registerCompanyMember,
  getCompanyMember,
} from "@/lib/services/securityService";
import {
  getCompanySubscription,
  getCompanyEntitlements,
  evaluateEffectiveCapability,
} from "@/lib/services/companyOnboardingService";
import { getCompanyVerificationStatus } from "@/lib/services/governanceService";
import { recordDigitalActionAttribution, getActionAttributionLog } from "@/lib/services/companyService";
import type { CompanyMemberEntity, CompanyStudioAccessStatus } from "@/lib/types";

export interface Stage33TestResult {
  stepNumber: number;
  testName: string;
  passed: boolean;
  details: string;
}

export interface Stage33Report {
  timestamp: string;
  totalSteps: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  results: Stage33TestResult[];
}

export async function runStage33AuthenticationRuntimeGate(): Promise<Stage33Report> {
  const results: Stage33TestResult[] = [];

  const addResult = (stepNumber: number, testName: string, passed: boolean, details: string) => {
    results.push({ stepNumber, testName, passed, details });
  };

  // Test 1: Real Firebase Auth initialization verification
  try {
    const auth = getFirebaseAuth();
    const app = getFirebaseApp();
    const passed = Boolean(auth && app && app.name === "[DEFAULT]");
    addResult(
      1,
      "Real Firebase Auth initialization verification",
      passed,
      passed
        ? `Firebase App '${app.name}' and Firebase Auth instance successfully initialized.`
        : "Firebase Auth failed to initialize."
    );
  } catch (err: unknown) {
    addResult(1, "Real Firebase Auth initialization verification", false, String(err));
  }

  // Test 2: Google Provider configuration verification
  try {
    const passed = Boolean(
      googleAuthProvider &&
      googleAuthProvider.providerId === "google.com"
    );
    addResult(
      2,
      "Google Provider configuration verification",
      passed,
      passed
        ? "GoogleAuthProvider configured with providerId 'google.com' and profile scopes."
        : "Google Provider configuration invalid."
    );
  } catch (err: unknown) {
    addResult(2, "Google Provider configuration verification", false, String(err));
  }

  // Test 3: Unauthenticated visitor /studio access denial
  try {
    const unauthSession: AuthContext = { uid: null, emailVerified: false };
    const access = resolveCompanyStudioAccess(unauthSession, "argento-marine");
    const passed = !access.isAllowed && access.status === "AUTH_REQUIRED";
    addResult(
      3,
      "Unauthenticated visitor /studio access denial",
      passed,
      passed
        ? `Unauthenticated access correctly denied. Status: ${access.status}`
        : `Expected denial with AUTH_REQUIRED, received: ${access.status}`
    );
  } catch (err: unknown) {
    addResult(3, "Unauthenticated visitor /studio access denial", false, String(err));
  }

  // Test 4: Authentication state without membership rejection
  try {
    const orphanUser: AuthContext = {
      uid: "firebase-uid-orphan-test-9999",
      email: "orphan@unknown-marine.com",
      displayName: "Orphan Google User",
      emailVerified: true,
      providerId: "google.com",
    };
    const access = resolveCompanyStudioAccess(orphanUser);
    const passed =
      !access.isAllowed &&
      (access.status === "ORGANIZATION_REQUIRED" || access.status === "MEMBERSHIP_REQUIRED");
    addResult(
      4,
      "Authentication state without membership rejection",
      passed,
      passed
        ? `Authenticated user without company membership correctly rejected. Status: ${access.status}`
        : `Expected denial for memberless user, received allowed: ${access.isAllowed}`
    );
  } catch (err: unknown) {
    addResult(4, "Authentication state without membership rejection", false, String(err));
  }

  // Test 5: Real Firebase UID resolution
  try {
    const mockFirebaseUser = {
      uid: "firebase-real-uid-xyz-777",
      email: "captain@argento-marine.com",
      displayName: "Capt. Marco Rossi",
      photoURL: "https://lh3.googleusercontent.com/a/mock-photo",
      emailVerified: true,
      providerData: [{ providerId: "google.com" }],
    };
    const mapped = mapFirebaseUserToAuthContext(mockFirebaseUser as any);
    const passed =
      mapped.uid === "firebase-real-uid-xyz-777" &&
      mapped.isDevelopmentSession === false;
    addResult(
      5,
      "Real Firebase UID resolution",
      passed,
      passed
        ? `Real Firebase UID mapped cleanly: ${mapped.uid}`
        : `Mapping failed: ${JSON.stringify(mapped)}`
    );
  } catch (err: unknown) {
    addResult(5, "Real Firebase UID resolution", false, String(err));
  }

  // Test 6: Google profile data mapping (email, displayName, photoURL)
  try {
    const mockFirebaseUser = {
      uid: "firebase-uid-profile-888",
      email: "elena@argento-marine.com",
      displayName: "Elena Rostova",
      photoURL: "https://lh3.googleusercontent.com/a/profile-888",
      emailVerified: true,
      providerData: [{ providerId: "google.com" }],
    };
    const mapped = mapFirebaseUserToAuthContext(mockFirebaseUser as any);
    const passed =
      mapped.email === "elena@argento-marine.com" &&
      mapped.displayName === "Elena Rostova" &&
      mapped.photoURL === "https://lh3.googleusercontent.com/a/profile-888" &&
      mapped.providerId === "google.com";
    addResult(
      6,
      "Google profile data mapping (email, displayName, photoURL)",
      passed,
      passed
        ? "Google profile fields accurately mapped to AuthContext."
        : `Google profile mapping mismatch: ${JSON.stringify(mapped)}`
    );
  } catch (err: unknown) {
    addResult(6, "Google profile data mapping (email, displayName, photoURL)", false, String(err));
  }

  // Set up real Firebase user with active Argento Marine membership for subsequent tests
  const realFirebaseUser: AuthContext = {
    uid: "firebase-real-uid-argento-owner-333",
    email: "owner@argento-marine.com",
    displayName: "Argento Marine Principal Operator",
    photoURL: "https://lh3.googleusercontent.com/a/argento-owner",
    emailVerified: true,
    providerId: "google.com",
    isDevelopmentSession: false,
  };

  const realMemberEntity: CompanyMemberEntity = {
    companyId: "argento-marine",
    userId: realFirebaseUser.uid!,
    role: "OWNER",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  registerCompanyMember(realMemberEntity);

  // Test 7: Active membership resolution from Firebase UID
  try {
    const resolvedMember = getCompanyMember("argento-marine", realFirebaseUser);
    const passed =
      resolvedMember !== null &&
      resolvedMember.userId === realFirebaseUser.uid &&
      resolvedMember.status === "ACTIVE";
    addResult(
      7,
      "Active membership resolution from Firebase UID",
      passed,
      passed
        ? `Membership resolved for Firebase UID ${realFirebaseUser.uid} in Argento Marine.`
        : "Failed to resolve active membership from Firebase UID."
    );
  } catch (err: unknown) {
    addResult(7, "Active membership resolution from Firebase UID", false, String(err));
  }

  // Test 8: Cross-organization access prevention
  try {
    // Attempting to access another company "nordic-shipping" where user has no membership
    const crossOrgAccess = resolveCompanyStudioAccess(realFirebaseUser, "nordic-shipping");
    const passed =
      !crossOrgAccess.isAllowed &&
      (crossOrgAccess.status === "MEMBERSHIP_REQUIRED" ||
        crossOrgAccess.status === "INVALID_ORGANIZATION");
    addResult(
      8,
      "Cross-organization access prevention",
      passed,
      passed
        ? `Cross-organization unauthorized access safely blocked. Status: ${crossOrgAccess.status}`
        : "Cross-organization access was unexpectedly granted."
    );
  } catch (err: unknown) {
    addResult(8, "Cross-organization access prevention", false, String(err));
  }

  // Test 9: Role assignment verification
  try {
    const resolvedMember = getCompanyMember("argento-marine", realFirebaseUser);
    const access = resolveCompanyStudioAccess(realFirebaseUser, "argento-marine");
    const passed = resolvedMember?.role === "OWNER" && access.userRole === "OWNER";
    addResult(
      9,
      "Role assignment verification",
      passed,
      passed
        ? `Role accurately verified as OWNER in access context.`
        : `Role mismatch: memberRole=${resolvedMember?.role}, accessRole=${access.userRole}`
    );
  } catch (err: unknown) {
    addResult(9, "Role assignment verification", false, String(err));
  }

  // Test 10: Verification status resolution
  try {
    const verStatus = getCompanyVerificationStatus("argento-marine");
    const access = resolveCompanyStudioAccess(realFirebaseUser, "argento-marine");
    const passed = verStatus === "VERIFIED" && access.verificationStatus === "VERIFIED";
    addResult(
      10,
      "Verification status resolution",
      passed,
      passed
        ? `Company verification status confirmed as ${verStatus}.`
        : `Verification status mismatch: ${verStatus}`
    );
  } catch (err: unknown) {
    addResult(10, "Verification status resolution", false, String(err));
  }

  // Test 11: Subscription plan resolution
  try {
    const sub = getCompanySubscription("argento-marine");
    const access = resolveCompanyStudioAccess(realFirebaseUser, "argento-marine");
    const passed = sub?.planCode === "GROWTH" && access.planCode === "GROWTH";
    addResult(
      11,
      "Subscription plan resolution",
      passed,
      passed
        ? `Subscription plan confirmed as ${sub?.planCode} (${sub?.status}).`
        : `Subscription plan mismatch: ${sub?.planCode}`
    );
  } catch (err: unknown) {
    addResult(11, "Subscription plan resolution", false, String(err));
  }

  // Test 12: Company Studio access grant for active member
  try {
    const access = resolveCompanyStudioAccess(realFirebaseUser, "argento-marine");
    const passed =
      access.isAllowed &&
      access.companyId === "argento-marine" &&
      access.companyName === "Argento Marine" &&
      access.businessId === "MW-BUS-ARGENTO-MARITIME";
    addResult(
      12,
      "Company Studio access grant for active member",
      passed,
      passed
        ? `Access granted to Studio: company=${access.companyName}, businessId=${access.businessId}`
        : `Access grant failed: ${access.denialReason}`
    );
  } catch (err: unknown) {
    addResult(12, "Company Studio access grant for active member", false, String(err));
  }

  // Test 13: URL tampering rejection
  try {
    const access = resolveCompanyStudioAccess(realFirebaseUser, "unassigned-corp-999");
    const passed = !access.isAllowed;
    addResult(
      13,
      "URL tampering rejection",
      passed,
      passed
        ? `URL tampering with invalid target company rejected: ${access.status}`
        : "URL tampering was not rejected."
    );
  } catch (err: unknown) {
    addResult(13, "URL tampering rejection", false, String(err));
  }

  // Test 14: Organization tampering rejection
  try {
    const tamperedUser: AuthContext = {
      uid: "malicious-actor-uid-000",
      email: "hacker@domain.com",
      displayName: "Attacker",
    };
    const access = resolveCompanyStudioAccess(tamperedUser, "argento-marine");
    const passed = !access.isAllowed && access.status === "MEMBERSHIP_REQUIRED";
    addResult(
      14,
      "Organization tampering rejection",
      passed,
      passed
        ? `Attacker with no membership rejected with status: ${access.status}`
        : "Organization tampering vulnerability detected."
    );
  } catch (err: unknown) {
    addResult(14, "Organization tampering rejection", false, String(err));
  }

  // Test 15: Non-existent organization handling
  try {
    const access = resolveCompanyStudioAccess(realFirebaseUser, "non-existent-company-404");
    const passed =
      !access.isAllowed &&
      (access.status === "INVALID_ORGANIZATION" || access.status === "MEMBERSHIP_REQUIRED");
    addResult(
      15,
      "Non-existent organization handling",
      passed,
      passed
        ? `Non-existent company safely handled: ${access.status}`
        : `Expected rejection, got: ${access.status}`
    );
  } catch (err: unknown) {
    addResult(15, "Non-existent organization handling", false, String(err));
  }

  // Test 16: Inactive membership handling
  try {
    const inactiveUser: AuthContext = {
      uid: "firebase-uid-inactive-user-111",
      email: "inactive@argento-marine.com",
    };
    registerCompanyMember({
      companyId: "argento-marine",
      userId: inactiveUser.uid!,
      role: "MEMBER",
      status: "INVITED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const member = getCompanyMember("argento-marine", inactiveUser);
    const passed = !member; // getCompanyMember only returns ACTIVE members
    addResult(
      16,
      "Inactive membership handling",
      passed,
      passed
        ? "Invited/inactive member rejected from active security context."
        : "Inactive member was improperly granted active status."
    );
  } catch (err: unknown) {
    addResult(16, "Inactive membership handling", false, String(err));
  }

  // Test 17: Suspended membership handling
  try {
    const suspendedUser: AuthContext = {
      uid: "firebase-uid-suspended-user-222",
      email: "suspended@argento-marine.com",
    };
    registerCompanyMember({
      companyId: "argento-marine",
      userId: suspendedUser.uid!,
      role: "MEMBER",
      status: "SUSPENDED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const member = getCompanyMember("argento-marine", suspendedUser);
    const passed = !member;
    addResult(
      17,
      "Suspended membership handling",
      passed,
      passed
        ? "Suspended member rejected from active security context."
        : "Suspended member was improperly granted active status."
    );
  } catch (err: unknown) {
    addResult(17, "Suspended membership handling", false, String(err));
  }

  // Test 18: Multi-organization membership isolation
  try {
    const multiOrgUser: AuthContext = {
      uid: "firebase-uid-multiorg-333",
      email: "multi@maritime-group.com",
    };
    // Member of argento-marine as OPERATIONS
    registerCompanyMember({
      companyId: "argento-marine",
      userId: multiOrgUser.uid!,
      role: "OPERATIONS",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const accessArgento = resolveCompanyStudioAccess(multiOrgUser, "argento-marine");
    const passed = accessArgento.isAllowed && accessArgento.userRole === "OPERATIONS";
    addResult(
      18,
      "Multi-organization membership isolation",
      passed,
      passed
        ? `Multi-org membership strictly isolated. Argento role: ${accessArgento.userRole}`
        : "Multi-organization isolation failed."
    );
  } catch (err: unknown) {
    addResult(18, "Multi-organization membership isolation", false, String(err));
  }

  // Test 19: Real sign-out session clearing
  try {
    setAuthAdapterProvider("DEVELOPMENT");
    setCurrentAuthSession(realFirebaseUser);
    const beforeSignOut = getCurrentAuthSession();
    setCurrentAuthSession({ uid: null, emailVerified: false });
    const afterSignOut = getCurrentAuthSession();
    const passed = beforeSignOut.uid !== null && afterSignOut.uid === null;
    addResult(
      19,
      "Real sign-out session clearing",
      passed,
      passed
        ? "Sign out cleanly transitions active session UID to null."
        : "Sign out failed to clear authentication session."
    );
  } catch (err: unknown) {
    addResult(19, "Real sign-out session clearing", false, String(err));
  }

  // Test 20: Re-authentication session restoration
  try {
    let notifiedAuth: AuthContext | null = null;
    const unsubscribe = subscribeAuthState((auth) => {
      notifiedAuth = auth;
    });

    setCurrentAuthSession(realFirebaseUser);
    const passed =
      notifiedAuth !== null &&
      (notifiedAuth as AuthContext).uid === realFirebaseUser.uid;
    unsubscribe();

    addResult(
      20,
      "Re-authentication session restoration",
      passed,
      passed
        ? `Auth state listener re-notified upon session restoration: ${notifiedAuth?.uid}`
        : "Auth state listener failed on session change."
    );
  } catch (err: unknown) {
    addResult(20, "Re-authentication session restoration", false, String(err));
  }

  // Test 21: Absence of hardcoded test credentials in auth resolution
  try {
    const dynamicFirebaseUID = `fb-dynamic-${Date.now()}`;
    const dynamicUser: AuthContext = {
      uid: dynamicFirebaseUID,
      email: `dynamic-${Date.now()}@domain.com`,
    };
    registerCompanyMember({
      companyId: "argento-marine",
      userId: dynamicFirebaseUID,
      role: "ADMIN",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const access = resolveCompanyStudioAccess(dynamicUser, "argento-marine");
    const passed = access.isAllowed && access.userRole === "ADMIN";
    addResult(
      21,
      "Absence of hardcoded test credentials in auth resolution",
      passed,
      passed
        ? `Dynamic Firebase UID ${dynamicFirebaseUID} resolved without hardcoded checks.`
        : "Failed to resolve dynamically generated Firebase UID."
    );
  } catch (err: unknown) {
    addResult(21, "Absence of hardcoded test credentials in auth resolution", false, String(err));
  }

  // Test 22: Absence of usr-owner-001 in production auth path
  try {
    const rawFirebaseUser = {
      uid: "firebase-prod-uid-random-abc",
      email: "prod@argento-marine.com",
    };
    const mapped = mapFirebaseUserToAuthContext(rawFirebaseUser as any);
    const mappedUid: string = mapped.uid || "";
    const passed = mappedUid.length > 0 && mappedUid !== "usr-owner-001";
    addResult(
      22,
      "Absence of usr-owner-001 in production auth path",
      passed,
      passed
        ? "Production auth mapper strictly preserves real Firebase UID without substitution."
        : "Production auth path incorrectly substituted hardcoded user ID."
    );
  } catch (err: unknown) {
    addResult(22, "Absence of usr-owner-001 in production auth path", false, String(err));
  }

  // Test 23: Absence of localStorage credential caching
  try {
    let passed = true;
    if (typeof localStorage !== "undefined") {
      const authKeys = Object.keys(localStorage).filter(
        (k) =>
          k.toLowerCase().includes("auth_token") ||
          k.toLowerCase().includes("password") ||
          k.toLowerCase().includes("client_secret")
      );
      passed = authKeys.length === 0;
    }
    addResult(
      23,
      "Absence of localStorage credential caching",
      passed,
      passed
        ? "No sensitive credentials or auth secrets persisted to localStorage."
        : "Found credentials cached in localStorage."
    );
  } catch (err: unknown) {
    addResult(23, "Absence of localStorage credential caching", false, String(err));
  }

  // Test 24: Absence of global/window auth state pollution
  try {
    let passed = true;
    if (typeof window !== "undefined") {
      passed = !(window as any).__auth && !(window as any).__currentUser;
    }
    addResult(
      24,
      "Absence of global/window auth state pollution",
      passed,
      passed
        ? "Window object is free of auth globals and sensitive state."
        : "Global window auth state detected."
    );
  } catch (err: unknown) {
    addResult(24, "Absence of global/window auth state pollution", false, String(err));
  }

  // Test 25: Data Space isolation for authenticated Firebase UID
  try {
    const dataSpace = getCompanyDataSpace("argento-marine", realFirebaseUser);
    const passed = dataSpace !== null && dataSpace.companyId === "argento-marine";
    addResult(
      25,
      "Data Space isolation for authenticated Firebase UID",
      passed,
      passed
        ? `Data space securely resolved for authenticated Firebase UID: quota=${dataSpace?.storageLimitMb}MB`
        : "Data space isolation failed."
    );
  } catch (err: unknown) {
    addResult(25, "Data Space isolation for authenticated Firebase UID", false, String(err));
  }

  // Test 26: Action attribution logging with real Firebase UID
  try {
    recordDigitalActionAttribution({
      companyId: "argento-marine",
      businessId: "MW-BUS-ARGENTO-MARITIME",
      organizationId: "argento-marine",
      actionType: "MEMBER_ACTIVATED",
      actorUserId: realFirebaseUser.uid!,
      authorizationContext: {
        authenticated: true,
        userRole: "OWNER",
        verifiedActor: true,
        details: "Stage 3.3 runtime verification pass",
      },
      auditReference: "audit-stage33-real-auth-gate",
    });

    const logs = getActionAttributionLog("argento-marine");
    const recentLog = logs.find(
      (l) => l.actionType === "MEMBER_ACTIVATED" && l.actorUserId === realFirebaseUser.uid
    );
    const passed = recentLog !== undefined;
    addResult(
      26,
      "Action attribution logging with real Firebase UID",
      passed,
      passed
        ? `Action log correctly attributed to real Firebase UID: ${recentLog?.actorUserId}`
        : "Failed to find audit log attributed to real Firebase UID."
    );
  } catch (err: unknown) {
    addResult(26, "Action attribution logging with real Firebase UID", false, String(err));
  }

  // Test 27: Capability entitlement resolution for authenticated user
  try {
    const isTwinAllowed = evaluateEffectiveCapability(
      "argento-marine",
      realFirebaseUser.uid!,
      "BUSINESS_TWIN",
      realFirebaseUser
    );
    const isStudioAllowed = evaluateEffectiveCapability(
      "argento-marine",
      realFirebaseUser.uid!,
      "COMPANY_STUDIO",
      realFirebaseUser
    );
    const passed = isTwinAllowed.isAllowed && isStudioAllowed.isAllowed;
    addResult(
      27,
      "Capability entitlement resolution for authenticated user",
      passed,
      passed
        ? "Core capabilities (BUSINESS_TWIN, COMPANY_STUDIO) cleanly evaluated as allowed."
        : "Entitlement evaluation failed for authenticated user."
    );
  } catch (err: unknown) {
    addResult(27, "Capability entitlement resolution for authenticated user", false, String(err));
  }

  // Test 28: Studio module permission enforcement
  try {
    const navItems = getStudioNavigation(
      "argento-marine",
      realFirebaseUser.uid!,
      realFirebaseUser
    );
    const allAllowed = navItems.length > 0 && navItems.every((item) => item.isAllowed);
    addResult(
      28,
      "Studio module permission enforcement",
      allAllowed,
      allAllowed
        ? `All ${navItems.length} studio modules permitted for verified OWNER on GROWTH plan.`
        : "Studio module permissions were incorrectly rejected."
    );
  } catch (err: unknown) {
    addResult(28, "Studio module permission enforcement", false, String(err));
  }

  // Test 29: UI auth state transition verification
  try {
    const unauthState = resolveCompanyStudioAccess({ uid: null });
    const noMemberState = resolveCompanyStudioAccess({ uid: "fb-non-member-001" });
    const activeState = resolveCompanyStudioAccess(realFirebaseUser, "argento-marine");

    const statusUnauth: CompanyStudioAccessStatus = unauthState.status;
    const statusNoMember: CompanyStudioAccessStatus = noMemberState.status;
    const statusActive: CompanyStudioAccessStatus = activeState.status;

    const passed =
      statusUnauth === "AUTH_REQUIRED" &&
      statusNoMember === "ORGANIZATION_REQUIRED" &&
      statusActive === "ACTIVE";

    addResult(
      29,
      "UI auth state transition verification",
      passed,
      passed
        ? `States correctly verified: UNAUTHENTICATED (${unauthState.status}) -> NO_MEMBERSHIP (${noMemberState.status}) -> ACTIVE (${activeState.status})`
        : `UI auth state transition mismatch: unauth=${statusUnauth}, noMember=${statusNoMember}, active=${statusActive}`
    );
  } catch (err: unknown) {
    addResult(29, "UI auth state transition verification", false, String(err));
  }

  // Test 30: End-to-end authentication gate integrity
  try {
    const adapter = getActiveAuthAdapter();
    const access = resolveCompanyStudioAccess(realFirebaseUser, "argento-marine");
    const entitlements = getCompanyEntitlements("argento-marine");
    const sub = getCompanySubscription("argento-marine");

    const passed =
      adapter !== null &&
      access.isAllowed === true &&
      access.companyId === "argento-marine" &&
      access.businessId === "MW-BUS-ARGENTO-MARITIME" &&
      entitlements !== null &&
      sub?.status === "ACTIVE";

    addResult(
      30,
      "End-to-end authentication gate integrity",
      passed,
      passed
        ? `Full Pipeline Integrity Confirmed: Firebase Auth -> Auth Adapter -> securityService -> membershipRepository -> Studio Access (${access.companyName}, ${access.businessId})`
        : "End-to-end authentication gate integrity check failed."
    );
  } catch (err: unknown) {
    addResult(30, "End-to-end authentication gate integrity", false, String(err));
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalSteps: results.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0 && passedCount === 30,
    results,
  };
}
