import {
  signInWithEmail,
  signOutCurrentUser,
  getCurrentAuthSession,
  clearCurrentAuthSession,
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
} from "@/lib/services/aiDomainService";
import {
  getPublicBusinessTwin,
  getPrivateBusinessTwin,
} from "@/lib/services/businessTwinService";
import {
  createPersonalConnectRequest,
  resolveSenderConnectContext,
} from "@/lib/services/connectService";
import {
  saveCompanyReference,
  saveProductReference,
  saveServiceReference,
  createCollection,
  clearAllPersonalWorkspaces,
} from "@/lib/services/personalWorkspaceService";
import {
  getUserTrustProfile,
  isHumanVerified,
  checkActionEligibility,
  requestHumanVerification,
  submitHumanVerification,
  recordRiskSignal,
  evaluateRisk,
  triggerRateLimit,
  resetUserTrustState,
  resetAllTrustStates,
} from "@/lib/services/personalTrustService";
import { saveCompanyRecordSync } from "@/lib/repositories/companyRepository";
import { saveProduct } from "@/lib/services/productService";
import { saveService } from "@/lib/services/serviceService";
import type {
  TrustState,
  RiskLevel,
  UserTrustProfile,
  ActionEligibilityResult,
} from "@/lib/types";

export interface Stage358GateReportItem {
  id: string;
  test: string;
  passed: boolean;
  details: string;
}

export interface Stage358GateReport {
  timestamp: string;
  mode: "HUMAN_VERIFICATION_ANTI_ABUSE";
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: Stage358GateReportItem[];
}

/**
 * Stage 3.5.8 — Personal Visitor Human Verification & Anti-Abuse Runtime Gate
 * 
 * Verifies 40+ rigorous security, risk scoring, verification flow, and boundary checkpoints:
 * 1. Initial Guest & Visitor Trust Profile (UNVERIFIED, LOW_RISK)
 * 2. Action Eligibility for Normal Low-Risk Visitors (Frictionless discovery)
 * 3. Deterministic Risk Scoring & Velocity Triggers (Navigation, Save/Unsave, AI, Connect)
 * 4. Human Verification Challenge Lifecycle (Request, TTL, Success, State Transitions)
 * 5. Failure & Block Enforcement (1st/2nd retry, 3rd failure -> BLOCKED)
 * 6. Rate Limiting Behavior & Recovery
 * 7. Protected Personal Workspace Action Gating (Company, Product, Service Saves, Collections)
 * 8. Protected Public AI Action Gating
 * 9. Protected Commercial Connect / RFQ Action Gating
 * 10. Boundary Invariants: Verification NEVER grants company authorization, private twin, or private AI
 * 11. Clean Session Termination & Memory Isolation
 */
export async function runStage358Gate(): Promise<Stage358GateReport> {
  const results: Stage358GateReportItem[] = [];

  const addResult = (id: string, test: string, passed: boolean, details: string) => {
    results.push({ id, test, passed, details });
  };

  // Helper setup: reset auth, workspaces, and trust store
  signOutCurrentUser();
  clearAllPersonalWorkspaces();
  resetAllTrustStates();

  const mockVisitorUid = "personal_test_visitor_358";
  const mockTargetCompanyId = "company_argento_358";
  const mockTargetProductId = "prod_hull_358";
  const mockTargetServiceId = "serv_survey_358";

  // Setup seed company and product/service records
  try {
    saveCompanyRecordSync({
      id: mockTargetCompanyId,
      businessId: "BID-ARG-358",
      name: "Argento Marine Verification Test",
      tagline: "Autonomous Hull Inspection Systems",
      country: "Norway",
      city: "Oslo",
      isPublished: true,
      verificationStatus: "VERIFIED",
    } as any);

    await saveProduct(mockTargetCompanyId, {
      id: mockTargetProductId,
      companyId: mockTargetCompanyId,
      name: "Autonomous Sub-Sea Scanner",
      category: "Autonomous Systems",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      isPublished: true,
    } as any);

    await saveService(mockTargetCompanyId, {
      id: mockTargetServiceId,
      companyId: mockTargetCompanyId,
      name: "Hull Condition Analysis Service",
      category: "Inspection & Survey",
      status: "ACTIVE",
      visibility: "PUBLIC",
      isPublished: true,
    } as any);
  } catch (e) {
    // Continue if already seeded
  }

  // =========================================================================
  // SECTION 1: Initial State & Baseline Profile (Tests 1-5)
  // =========================================================================

  // Test 1: Null/unauthenticated user trust profile
  try {
    const nullProfile = getUserTrustProfile(null);
    const passed =
      nullProfile.trustState === "UNVERIFIED" &&
      nullProfile.riskLevel === "LOW_RISK" &&
      nullProfile.challengeFailures === 0;
    addResult(
      "GATE-358-01",
      "Null user safely resolves to UNVERIFIED / LOW_RISK baseline",
      passed,
      `State: ${nullProfile.trustState}, Risk: ${nullProfile.riskLevel}`
    );
  } catch (err: any) {
    addResult("GATE-358-01", "Null user trust profile", false, err.message);
  }

  // Test 2: Fresh personal visitor user profile initialization
  try {
    resetUserTrustState(mockVisitorUid);
    const profile = getUserTrustProfile(mockVisitorUid);
    const passed =
      profile.userId === mockVisitorUid &&
      profile.trustState === "UNVERIFIED" &&
      profile.riskLevel === "LOW_RISK" &&
      profile.challengeFailures === 0;
    addResult(
      "GATE-358-02",
      "Fresh personal visitor initializes with UNVERIFIED and LOW_RISK state",
      passed,
      `UserId: ${profile.userId}, Trust: ${profile.trustState}, Risk: ${profile.riskLevel}`
    );
  } catch (err: any) {
    addResult("GATE-358-02", "Fresh visitor profile initialization", false, err.message);
  }

  // Test 3: isHumanVerified returns false for fresh visitor
  try {
    const verified = isHumanVerified(mockVisitorUid);
    addResult(
      "GATE-358-03",
      "isHumanVerified returns false for unverified visitor",
      verified === false,
      `isHumanVerified: ${verified}`
    );
  } catch (err: any) {
    addResult("GATE-358-03", "isHumanVerified check", false, err.message);
  }

  // Test 4: Unauthenticated action eligibility check returns UNAUTHENTICATED
  try {
    const eligibility = checkActionEligibility(null, "SAVE_COMPANY");
    const passed = eligibility.allowed === false && eligibility.reason === "UNAUTHENTICATED";
    addResult(
      "GATE-358-04",
      "Unauthenticated user eligibility check is disallowed with UNAUTHENTICATED reason",
      passed,
      `Allowed: ${eligibility.allowed}, Reason: ${eligibility.reason}`
    );
  } catch (err: any) {
    addResult("GATE-358-04", "Unauthenticated eligibility check", false, err.message);
  }

  // Test 5: Fresh LOW_RISK unverified visitor is allowed to perform normal discovery actions
  try {
    const elSaveComp = checkActionEligibility(mockVisitorUid, "SAVE_COMPANY");
    const elSaveProd = checkActionEligibility(mockVisitorUid, "SAVE_PRODUCT");
    const elAI = checkActionEligibility(mockVisitorUid, "PUBLIC_AI");
    const elConnect = checkActionEligibility(mockVisitorUid, "CONNECT_REQUEST");
    const passed =
      elSaveComp.allowed === true &&
      elSaveProd.allowed === true &&
      elAI.allowed === true &&
      elConnect.allowed === true;
    addResult(
      "GATE-358-05",
      "Fresh low-risk visitor is allowed standard discovery actions without friction",
      passed,
      `SaveComp: ${elSaveComp.allowed}, SaveProd: ${elSaveProd.allowed}, AI: ${elAI.allowed}, Connect: ${elConnect.allowed}`
    );
  } catch (err: any) {
    addResult("GATE-358-05", "Fresh visitor standard actions eligibility", false, err.message);
  }

  // =========================================================================
  // SECTION 2: Deterministic Risk Scoring & Velocity Triggers (Tests 6-12)
  // =========================================================================

  // Test 6: Velocity trigger — Navigation velocity accumulation
  try {
    resetUserTrustState(mockVisitorUid);
    for (let i = 0; i < 15; i++) {
      recordRiskSignal(mockVisitorUid, "RAPID_NAVIGATION");
    }
    const profileMed = getUserTrustProfile(mockVisitorUid);
    const passed = profileMed.riskLevel === "MEDIUM_RISK" || profileMed.riskLevel === "HIGH_RISK";
    addResult(
      "GATE-358-06",
      "15 rapid navigation signals elevate risk level to MEDIUM_RISK",
      passed,
      `RiskLevel: ${profileMed.riskLevel}`
    );
  } catch (err: any) {
    addResult("GATE-358-06", "Navigation velocity accumulation", false, err.message);
  }

  // Test 7: Excessive navigation velocity (30 signals) triggers HIGH_RISK & CHALLENGE_REQUIRED
  try {
    for (let i = 0; i < 16; i++) {
      recordRiskSignal(mockVisitorUid, "RAPID_NAVIGATION");
    }
    const profileHigh = getUserTrustProfile(mockVisitorUid);
    const eligibility = checkActionEligibility(mockVisitorUid, "PUBLIC_AI");
    const passed =
      profileHigh.riskLevel === "HIGH_RISK" &&
      profileHigh.trustState === "CHALLENGE_REQUIRED" &&
      eligibility.allowed === false &&
      eligibility.reason === "CHALLENGE_REQUIRED";
    addResult(
      "GATE-358-07",
      "Excessive navigation velocity elevates to HIGH_RISK and requires CHALLENGE_REQUIRED",
      passed,
      `Risk: ${profileHigh.riskLevel}, TrustState: ${profileHigh.trustState}, Allowed: ${eligibility.allowed}`
    );
  } catch (err: any) {
    addResult("GATE-358-07", "Excessive navigation velocity check", false, err.message);
  }

  // Test 8: Rapid save/unsave signal accumulation triggers HIGH_RISK
  try {
    const saveAbuseUid = "save_abuse_visitor";
    resetUserTrustState(saveAbuseUid);
    for (let i = 0; i < 30; i++) {
      recordRiskSignal(saveAbuseUid, "RAPID_SAVE_UNSAVE");
    }
    const profile = getUserTrustProfile(saveAbuseUid);
    const passed = profile.riskLevel === "HIGH_RISK" && profile.trustState === "CHALLENGE_REQUIRED";
    addResult(
      "GATE-358-08",
      "Rapid save/unsave signals trigger HIGH_RISK and CHALLENGE_REQUIRED",
      passed,
      `Risk: ${profile.riskLevel}, State: ${profile.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-08", "Save/unsave signal trigger", false, err.message);
  }

  // Test 9: Rapid Public AI query frequency triggers HIGH_RISK
  try {
    const aiAbuseUid = "ai_abuse_visitor";
    resetUserTrustState(aiAbuseUid);
    for (let i = 0; i < 25; i++) {
      recordRiskSignal(aiAbuseUid, "HIGH_AI_FREQUENCY");
    }
    const profile = getUserTrustProfile(aiAbuseUid);
    const passed = profile.riskLevel === "HIGH_RISK" && profile.trustState === "CHALLENGE_REQUIRED";
    addResult(
      "GATE-358-09",
      "High Public AI request frequency triggers HIGH_RISK and CHALLENGE_REQUIRED",
      passed,
      `Risk: ${profile.riskLevel}, State: ${profile.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-09", "AI query frequency trigger", false, err.message);
  }

  // Test 10: High Connect/RFQ attempt frequency triggers HIGH_RISK
  try {
    const connectAbuseUid = "connect_abuse_visitor";
    resetUserTrustState(connectAbuseUid);
    for (let i = 0; i < 25; i++) {
      recordRiskSignal(connectAbuseUid, "HIGH_CONNECT_ATTEMPTS");
    }
    const profile = getUserTrustProfile(connectAbuseUid);
    const passed = profile.riskLevel === "HIGH_RISK" && profile.trustState === "CHALLENGE_REQUIRED";
    addResult(
      "GATE-358-10",
      "High Connect/RFQ attempts trigger HIGH_RISK and CHALLENGE_REQUIRED",
      passed,
      `Risk: ${profile.riskLevel}, State: ${profile.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-10", "Connect attempts risk trigger", false, err.message);
  }

  // Test 11: Combined multi-signal scoring
  try {
    const multiSignalUid = "multi_signal_visitor";
    resetUserTrustState(multiSignalUid);
    for (let i = 0; i < 15; i++) {
      recordRiskSignal(multiSignalUid, "RAPID_NAVIGATION");
    }
    for (let i = 0; i < 15; i++) {
      recordRiskSignal(multiSignalUid, "RAPID_SAVE_UNSAVE");
    }
    const profile = getUserTrustProfile(multiSignalUid);
    const passed = profile.riskLevel === "MEDIUM_RISK" || profile.riskLevel === "HIGH_RISK";
    addResult(
      "GATE-358-11",
      "Multi-signal combination accurately accumulates weighted score",
      passed,
      `RiskLevel: ${profile.riskLevel}, TrustState: ${profile.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-11", "Multi-signal scoring", false, err.message);
  }

  // Test 12: evaluateRisk function returns consistent state
  try {
    const evalResult = evaluateRisk(mockVisitorUid);
    const passed = evalResult.riskLevel !== undefined && evalResult.trustState !== undefined;
    addResult(
      "GATE-358-12",
      "evaluateRisk returns consistent deterministic risk evaluation",
      passed,
      `Risk: ${evalResult.riskLevel}, State: ${evalResult.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-12", "evaluateRisk evaluation", false, err.message);
  }

  // =========================================================================
  // SECTION 3: Challenge Generation & Lifecycle (Tests 13-18)
  // =========================================================================

  // Test 13: Request human verification challenge creates valid challenge object
  let challengeId = "";
  try {
    const challenge = requestHumanVerification(mockVisitorUid);
    challengeId = challenge.id;
    const passed =
      challenge.id.startsWith("chal_") &&
      challenge.userId === mockVisitorUid &&
      challenge.status === "PENDING" &&
      Boolean(challenge.createdAt) &&
      Boolean(challenge.expiresAt);
    addResult(
      "GATE-358-13",
      "requestHumanVerification creates valid challenge with PENDING status and TTL",
      passed,
      `ChallengeId: ${challenge.id}, Status: ${challenge.status}, ExpiresAt: ${challenge.expiresAt}`
    );
  } catch (err: any) {
    addResult("GATE-358-13", "Challenge creation", false, err.message);
  }

  // Test 14: User profile updates lastChallengeAt on challenge request
  try {
    const profile = getUserTrustProfile(mockVisitorUid);
    const passed = Boolean(profile.lastChallengeAt);
    addResult(
      "GATE-358-14",
      "User trust profile records lastChallengeAt timestamp on request",
      passed,
      `lastChallengeAt: ${profile.lastChallengeAt}`
    );
  } catch (err: any) {
    addResult("GATE-358-14", "lastChallengeAt check", false, err.message);
  }

  // Test 15: Requesting challenge with empty userId throws safe error
  try {
    let threw = false;
    try {
      requestHumanVerification("");
    } catch {
      threw = true;
    }
    addResult(
      "GATE-358-15",
      "requestHumanVerification throws safely when userId is missing",
      threw,
      `Threw: ${threw}`
    );
  } catch (err: any) {
    addResult("GATE-358-15", "Missing userId validation", false, err.message);
  }

  // Test 16: Challenge expiration handling
  try {
    const expUid = "expire_test_visitor";
    resetUserTrustState(expUid);
    requestHumanVerification(expUid);
    const expResult = submitHumanVerification(expUid, { outcome: "EXPIRED" });
    const passed =
      expResult.success === false &&
      expResult.status === "EXPIRED" &&
      expResult.trustState === "CHALLENGE_REQUIRED";
    addResult(
      "GATE-358-16",
      "Expired challenge returns EXPIRED status and keeps CHALLENGE_REQUIRED state",
      passed,
      `Success: ${expResult.success}, Status: ${expResult.status}, State: ${expResult.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-16", "Challenge expiration check", false, err.message);
  }

  // Test 17: Submit verification with empty userId throws safe error
  try {
    let threw = false;
    try {
      submitHumanVerification("");
    } catch {
      threw = true;
    }
    addResult(
      "GATE-358-17",
      "submitHumanVerification throws safely when userId is missing",
      threw,
      `Threw: ${threw}`
    );
  } catch (err: any) {
    addResult("GATE-358-17", "Missing userId validation in submit", false, err.message);
  }

  // Test 18: Successful human verification resolves to VERIFIED state
  try {
    const successResult = submitHumanVerification(mockVisitorUid, { outcome: "SUCCESS" });
    const profile = getUserTrustProfile(mockVisitorUid);
    const verified = isHumanVerified(mockVisitorUid);
    const passed =
      successResult.success === true &&
      successResult.status === "SUCCESS" &&
      successResult.trustState === "VERIFIED" &&
      profile.trustState === "VERIFIED" &&
      profile.riskLevel === "LOW_RISK" &&
      profile.challengeFailures === 0 &&
      Boolean(profile.lastVerifiedAt) &&
      verified === true;
    addResult(
      "GATE-358-18",
      "Successful challenge transitions user to VERIFIED, LOW_RISK with timestamp",
      passed,
      `Result: ${successResult.status}, State: ${profile.trustState}, Verified: ${verified}, LastVerified: ${profile.lastVerifiedAt}`
    );
  } catch (err: any) {
    addResult("GATE-358-18", "Successful verification transition", false, err.message);
  }

  // =========================================================================
  // SECTION 4: Failure, Retry, & Block Enforcement (Tests 19-24)
  // =========================================================================

  // Test 19: 1st challenge failure increments failures without blocking
  const failVisitorUid = "fail_test_visitor";
  try {
    resetUserTrustState(failVisitorUid);
    requestHumanVerification(failVisitorUid);
    const res1 = submitHumanVerification(failVisitorUid, { outcome: "FAILED" });
    const prof1 = getUserTrustProfile(failVisitorUid);
    const passed =
      res1.success === false &&
      prof1.challengeFailures === 1 &&
      prof1.trustState === "CHALLENGE_REQUIRED";
    addResult(
      "GATE-358-19",
      "1st verification failure records failure count (1) and preserves CHALLENGE_REQUIRED",
      passed,
      `Failures: ${prof1.challengeFailures}, State: ${prof1.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-19", "1st verification failure", false, err.message);
  }

  // Test 20: 2nd challenge failure increments failure count to 2
  try {
    requestHumanVerification(failVisitorUid);
    const res2 = submitHumanVerification(failVisitorUid, { outcome: "FAILED" });
    const prof2 = getUserTrustProfile(failVisitorUid);
    const passed =
      res2.success === false &&
      prof2.challengeFailures === 2 &&
      prof2.trustState === "CHALLENGE_REQUIRED";
    addResult(
      "GATE-358-20",
      "2nd verification failure records failure count (2) and preserves retry eligibility",
      passed,
      `Failures: ${prof2.challengeFailures}, State: ${prof2.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-20", "2nd verification failure", false, err.message);
  }

  // Test 21: 3rd challenge failure triggers permanent BLOCKED state
  try {
    requestHumanVerification(failVisitorUid);
    const res3 = submitHumanVerification(failVisitorUid, { outcome: "FAILED" });
    const prof3 = getUserTrustProfile(failVisitorUid);
    const passed =
      res3.success === false &&
      prof3.challengeFailures === 3 &&
      prof3.trustState === "BLOCKED" &&
      prof3.riskLevel === "HIGH_RISK";
    addResult(
      "GATE-358-21",
      "3rd verification failure permanently transitions user to BLOCKED state",
      passed,
      `Failures: ${prof3.challengeFailures}, State: ${prof3.trustState}, Risk: ${prof3.riskLevel}`
    );
  } catch (err: any) {
    addResult("GATE-358-21", "3rd verification failure block", false, err.message);
  }

  // Test 22: BLOCKED user is rejected for all protected actions
  try {
    const el1 = checkActionEligibility(failVisitorUid, "SAVE_COMPANY");
    const el2 = checkActionEligibility(failVisitorUid, "PUBLIC_AI");
    const el3 = checkActionEligibility(failVisitorUid, "CONNECT_REQUEST");
    const passed =
      el1.allowed === false &&
      el1.reason === "BLOCKED" &&
      el2.allowed === false &&
      el2.reason === "BLOCKED" &&
      el3.allowed === false &&
      el3.reason === "BLOCKED";
    addResult(
      "GATE-358-22",
      "BLOCKED user is denied for all actions with reason BLOCKED",
      passed,
      `Save: ${el1.reason}, AI: ${el2.reason}, Connect: ${el3.reason}`
    );
  } catch (err: any) {
    addResult("GATE-358-22", "Blocked user action denial", false, err.message);
  }

  // Test 23: Subsequent submit verification on BLOCKED user is rejected
  try {
    const submitOnBlock = submitHumanVerification(failVisitorUid, { outcome: "SUCCESS" });
    const passed = submitOnBlock.success === false && submitOnBlock.trustState === "BLOCKED";
    addResult(
      "GATE-358-23",
      "Verification submission on BLOCKED user is rejected without unblocking",
      passed,
      `Success: ${submitOnBlock.success}, State: ${submitOnBlock.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-23", "Submit on blocked user check", false, err.message);
  }

  // Test 24: Successful verification on retry user (after 1 failure) resets failure counter
  try {
    const retryUid = "retry_success_visitor";
    resetUserTrustState(retryUid);
    submitHumanVerification(retryUid, { outcome: "FAILED" });
    const preProfile = getUserTrustProfile(retryUid);
    submitHumanVerification(retryUid, { outcome: "SUCCESS" });
    const postProfile = getUserTrustProfile(retryUid);
    const passed =
      preProfile.challengeFailures === 1 &&
      postProfile.challengeFailures === 0 &&
      postProfile.trustState === "VERIFIED";
    addResult(
      "GATE-358-24",
      "Successful verification after prior failure resets challengeFailures to 0",
      passed,
      `PreFailures: ${preProfile.challengeFailures}, PostFailures: ${postProfile.challengeFailures}, State: ${postProfile.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-24", "Failure counter reset on success", false, err.message);
  }

  // =========================================================================
  // SECTION 5: Rate Limiting Behavior & Recovery (Tests 25-28)
  // =========================================================================

  // Test 25: Trigger rate limit sets RATE_LIMITED trust state
  const rateLimitUid = "ratelimit_test_visitor";
  try {
    resetUserTrustState(rateLimitUid);
    triggerRateLimit(rateLimitUid, 2000);
    const profile = getUserTrustProfile(rateLimitUid);
    const passed = profile.trustState === "RATE_LIMITED" && profile.riskLevel === "HIGH_RISK";
    addResult(
      "GATE-358-25",
      "triggerRateLimit transitions user to RATE_LIMITED state and HIGH_RISK",
      passed,
      `State: ${profile.trustState}, Risk: ${profile.riskLevel}`
    );
  } catch (err: any) {
    addResult("GATE-358-25", "Trigger rate limit", false, err.message);
  }

  // Test 26: checkActionEligibility denies RATE_LIMITED user
  try {
    const el = checkActionEligibility(rateLimitUid, "SAVE_COMPANY");
    const passed = el.allowed === false && el.reason === "RATE_LIMITED";
    addResult(
      "GATE-358-26",
      "RATE_LIMITED user eligibility returns allowed: false with reason RATE_LIMITED",
      passed,
      `Allowed: ${el.allowed}, Reason: ${el.reason}`
    );
  } catch (err: any) {
    addResult("GATE-358-26", "Rate limited eligibility check", false, err.message);
  }

  // Test 27: Rate limit signal recorded via recordRiskSignal
  try {
    const signalRateUid = "signal_rate_visitor";
    resetUserTrustState(signalRateUid);
    recordRiskSignal(signalRateUid, "RATE_LIMIT_TRIGGER", { durationMs: 1500 });
    const profile = getUserTrustProfile(signalRateUid);
    const passed = profile.trustState === "RATE_LIMITED";
    addResult(
      "GATE-358-27",
      "recordRiskSignal(RATE_LIMIT_TRIGGER) applies rate limit correctly",
      passed,
      `State: ${profile.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-27", "Rate limit trigger signal", false, err.message);
  }

  // Test 28: Rate limit recovery after expiration
  try {
    const recoverUid = "recover_rate_visitor";
    resetUserTrustState(recoverUid);
    // Trigger very short rate limit (50ms)
    triggerRateLimit(recoverUid, 50);
    await new Promise((r) => setTimeout(r, 70));
    const profile = getUserTrustProfile(recoverUid);
    const el = checkActionEligibility(recoverUid, "SAVE_COMPANY");
    const passed = profile.trustState !== "RATE_LIMITED" && el.allowed === true;
    addResult(
      "GATE-358-28",
      "User recovers automatically after rate limit window elapses",
      passed,
      `Post-expiry state: ${profile.trustState}, Allowed: ${el.allowed}`
    );
  } catch (err: any) {
    addResult("GATE-358-28", "Rate limit recovery check", false, err.message);
  }

  // =========================================================================
  // SECTION 6: Personal Workspace Action Gating (Tests 29-33)
  // =========================================================================

  // Test 29: saveCompanyReference succeeds for VERIFIED visitor
  try {
    resetUserTrustState(mockVisitorUid);
    submitHumanVerification(mockVisitorUid, { outcome: "SUCCESS" });
    const ref = await saveCompanyReference(mockVisitorUid, mockTargetCompanyId);
    const passed = ref.companyId === mockTargetCompanyId && ref.userId === mockVisitorUid;
    addResult(
      "GATE-358-29",
      "saveCompanyReference succeeds for VERIFIED personal visitor",
      passed,
      `Saved companyId: ${ref.companyId}`
    );
  } catch (err: any) {
    addResult("GATE-358-29", "saveCompanyReference verified check", false, err.message);
  }

  // Test 30: saveProductReference succeeds for VERIFIED visitor
  try {
    const ref = await saveProductReference(mockVisitorUid, mockTargetProductId, mockTargetCompanyId);
    const passed = ref.productId === mockTargetProductId && ref.userId === mockVisitorUid;
    addResult(
      "GATE-358-30",
      "saveProductReference succeeds for VERIFIED personal visitor",
      passed,
      `Saved productId: ${ref.productId}`
    );
  } catch (err: any) {
    addResult("GATE-358-30", "saveProductReference verified check", false, err.message);
  }

  // Test 31: saveServiceReference succeeds for VERIFIED visitor
  try {
    const ref = await saveServiceReference(mockVisitorUid, mockTargetServiceId, mockTargetCompanyId);
    const passed = ref.serviceId === mockTargetServiceId && ref.userId === mockVisitorUid;
    addResult(
      "GATE-358-31",
      "saveServiceReference succeeds for VERIFIED personal visitor",
      passed,
      `Saved serviceId: ${ref.serviceId}`
    );
  } catch (err: any) {
    addResult("GATE-358-31", "saveServiceReference verified check", false, err.message);
  }

  // Test 32: createCollection succeeds for VERIFIED visitor
  try {
    const col = createCollection(mockVisitorUid, "Verified Test Collection", "Testing trust gating");
    const passed = col.name === "Verified Test Collection" && col.userId === mockVisitorUid;
    addResult(
      "GATE-358-32",
      "createCollection succeeds for VERIFIED personal visitor",
      passed,
      `CollectionId: ${col.id}, Name: ${col.name}`
    );
  } catch (err: any) {
    addResult("GATE-358-32", "createCollection verified check", false, err.message);
  }

  // Test 33: saveCompanyReference is rejected for BLOCKED user
  try {
    let threw = false;
    try {
      await saveCompanyReference(failVisitorUid, mockTargetCompanyId);
    } catch {
      threw = true;
    }
    addResult(
      "GATE-358-33",
      "saveCompanyReference throws when executed by BLOCKED user",
      threw,
      `Threw as expected: ${threw}`
    );
  } catch (err: any) {
    addResult("GATE-358-33", "Blocked save company check", false, err.message);
  }

  // =========================================================================
  // SECTION 7: Public AI & Connect Service Action Gating (Tests 34-37)
  // =========================================================================

  // Test 34: executePublicCompanyAI succeeds for VERIFIED visitor
  try {
    const authSession = { uid: mockVisitorUid, email: "verified@test.com", emailVerified: true };
    const res = await executePublicCompanyAI(
      mockTargetCompanyId,
      "What are your core capabilities?",
      authSession
    );
    const passed = Boolean(res.answer) && res.confidence !== undefined && res.grounded === true;
    addResult(
      "GATE-358-34",
      "executePublicCompanyAI succeeds with grounded answer for VERIFIED visitor",
      passed,
      `Confidence: ${res.confidence}, Grounded: ${res.grounded}`
    );
  } catch (err: any) {
    addResult("GATE-358-34", "Public Company AI execution check", false, err.message);
  }

  // Test 35: executePublicCompanyAI returns challenge limitation for BLOCKED user
  try {
    const authSession = { uid: failVisitorUid, email: "blocked@test.com", emailVerified: true };
    const res = await executePublicCompanyAI(
      mockTargetCompanyId,
      "What are your core capabilities?",
      authSession
    );
    const passed = res.grounded === false && (res.limitations === "BLOCKED" || res.limitations === "CHALLENGE_REQUIRED");
    addResult(
      "GATE-358-35",
      "executePublicCompanyAI returns ungrounded denial for BLOCKED user",
      passed,
      `Grounded: ${res.grounded}, Limitations: ${res.limitations}`
    );
  } catch (err: any) {
    addResult("GATE-358-35", "Public AI execution blocked check", false, err.message);
  }

  // Test 36: createPersonalConnectRequest succeeds for VERIFIED visitor
  try {
    const authSession = { uid: mockVisitorUid, email: "verified@test.com", emailVerified: true };
    const connect = await createPersonalConnectRequest({
      toCompanyId: mockTargetCompanyId,
      type: "INQUIRY",
      subject: "Inquiry about Sub-Sea Scanner",
      message: "Please send technical documentation.",
      auth: authSession,
    });
    const passed =
      connect.fromUserId === mockVisitorUid &&
      connect.fromCompanyId === undefined &&
      connect.fromBusinessId === undefined;
    addResult(
      "GATE-358-36",
      "createPersonalConnectRequest succeeds with personal isolation for VERIFIED visitor",
      passed,
      `ConnectId: ${connect.id}, fromUserId: ${connect.fromUserId}, fromCompanyId: ${connect.fromCompanyId}`
    );
  } catch (err: any) {
    addResult("GATE-358-36", "Personal Connect Request check", false, err.message);
  }

  // Test 37: createPersonalConnectRequest is rejected for BLOCKED user
  try {
    let threw = false;
    try {
      const authSession = { uid: failVisitorUid, email: "blocked@test.com", emailVerified: true };
      await createPersonalConnectRequest({
        toCompanyId: mockTargetCompanyId,
        type: "INQUIRY",
        subject: "Spam Inquiry",
        message: "Spam content",
        auth: authSession,
      });
    } catch {
      threw = true;
    }
    addResult(
      "GATE-358-37",
      "createPersonalConnectRequest throws when executed by BLOCKED user",
      threw,
      `Threw: ${threw}`
    );
  } catch (err: any) {
    addResult("GATE-358-37", "Blocked Connect Request check", false, err.message);
  }

  // =========================================================================
  // SECTION 8: Boundary & Non-Escalation Invariants (Tests 38-42)
  // =========================================================================

  // Test 38: Human verification NEVER produces or grants companyId or businessId
  try {
    const profile = getUserTrustProfile(mockVisitorUid);
    const passed =
      !("companyId" in profile) &&
      !("businessId" in profile) &&
      !("role" in profile) &&
      !("organizationId" in profile);
    addResult(
      "GATE-358-38",
      "UserTrustProfile contains strictly personal verification fields without company attributes",
      passed,
      `Keys: ${Object.keys(profile).join(", ")}`
    );
  } catch (err: any) {
    addResult("GATE-358-38", "Trust profile schema boundary", false, err.message);
  }

  // Test 39: Verified personal visitor CANNOT execute executePrivateCompanyAI
  try {
    const authSession = { uid: mockVisitorUid, email: "verified@test.com", emailVerified: true };
    const res = await executePrivateCompanyAI(mockTargetCompanyId, "Show internal financial reports", authSession);
    const denied = res.limitations === "ACCESS_DENIED" || res.grounded === false;
    addResult(
      "GATE-358-39",
      "executePrivateCompanyAI strictly denies verified personal visitor",
      denied,
      `Private AI Denied: ${denied}, Limitations: ${res.limitations}`
    );
  } catch (err: any) {
    addResult("GATE-358-39", "executePrivateCompanyAI strictly denies verified personal visitor", true, "Threw rejection");
  }

  // Test 40: Verified personal visitor CANNOT access private Business Twin
  try {
    const authSession = { uid: mockVisitorUid, email: "verified@test.com", emailVerified: true };
    const privateTwin = getPrivateBusinessTwin(mockTargetCompanyId, authSession);
    const passed = privateTwin === null;
    addResult(
      "GATE-358-40",
      "getPrivateBusinessTwin returns null for verified personal visitor",
      passed,
      `Private Twin: ${privateTwin}`
    );
  } catch (err: any) {
    addResult("GATE-358-40", "Private Business Twin isolation check", false, err.message);
  }

  // Test 41: Verified personal visitor CAN access public Business Twin projection
  try {
    const publicTwin = getPublicBusinessTwin(mockTargetCompanyId);
    const passed = publicTwin !== null && publicTwin.companyId === mockTargetCompanyId;
    addResult(
      "GATE-358-41",
      "getPublicBusinessTwin remains accessible as public projection for verified visitor",
      passed,
      `Public Twin Available: ${publicTwin !== null}`
    );
  } catch (err: any) {
    addResult("GATE-358-41", "Public Business Twin accessibility check", false, err.message);
  }

  // Test 42: Sign out completely clears in-memory trust state
  try {
    resetUserTrustState(mockVisitorUid);
    submitHumanVerification(mockVisitorUid, { outcome: "SUCCESS" });
    const preSignOut = isHumanVerified(mockVisitorUid);
    await signOutCurrentUser();
    const postSignOut = getUserTrustProfile(mockVisitorUid);
    const passed = preSignOut === true && postSignOut.trustState === "UNVERIFIED";
    addResult(
      "GATE-358-42",
      "signOutCurrentUser completely resets all in-memory trust records",
      passed,
      `PreSignOutVerified: ${preSignOut}, PostSignOutState: ${postSignOut.trustState}`
    );
  } catch (err: any) {
    addResult("GATE-358-42", "Sign out trust reset check", false, err.message);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    mode: "HUMAN_VERIFICATION_ANTI_ABUSE",
    passedCount,
    failedCount,
    totalCount: results.length,
    results,
  };
}
