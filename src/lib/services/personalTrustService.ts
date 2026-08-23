import type {
  TrustState,
  RiskLevel,
  ProtectedPersonalAction,
  RiskSignalType,
  HumanVerificationChallenge,
  HumanVerificationResult,
  UserTrustProfile,
  ActionEligibilityResult,
} from "@/lib/types";

/**
 * Stage 3.5.8 — Personal Visitor Human Verification & Anti-Abuse Domain Service
 * 
 * In-memory development anti-abuse, deterministic risk scoring, and human verification gate.
 * 
 * ARCHITECTURAL INVARIANTS:
 * - In-memory / development only (no Firestore, no external persistence, no sensitive localStorage).
 * - Trust status is NOT identity, NOT company authorization, and NOT RBAC.
 * - Human verification NEVER produces companyId, businessId, or company membership.
 * - Verified personal visitor remains strictly a PERSONAL_VISITOR.
 * - Private Company AI, Private Documents, Private Business Twin remain forbidden.
 */

interface InternalTrustRecord {
  userId: string;
  trustState: TrustState;
  riskLevel: RiskLevel;
  challengeFailures: number;
  lastChallengeAt?: string;
  lastVerifiedAt?: string;
  activeChallenge: HumanVerificationChallenge | null;
  rateLimitedUntil: number | null;
  navigationTimestamps: number[];
  saveUnsaveTimestamps: number[];
  aiRequestTimestamps: number[];
  connectAttemptTimestamps: number[];
}

// Single in-memory canonical trust store (never duplicated)
const trustStore = new Map<string, InternalTrustRecord>();

// Listeners for reactive UI state
type TrustListener = () => void;
const trustListeners = new Set<TrustListener>();

export function subscribeToTrustState(listener: TrustListener): () => void {
  trustListeners.add(listener);
  return () => {
    trustListeners.delete(listener);
  };
}

function notifyTrustChange(): void {
  trustListeners.forEach((l) => {
    try {
      l();
    } catch (err) {
      console.error("Error in trust listener:", err);
    }
  });
}

function getOrCreateRecord(userId: string): InternalTrustRecord {
  let record = trustStore.get(userId);
  if (!record) {
    record = {
      userId,
      trustState: "UNVERIFIED",
      riskLevel: "LOW_RISK",
      challengeFailures: 0,
      activeChallenge: null,
      rateLimitedUntil: null,
      navigationTimestamps: [],
      saveUnsaveTimestamps: [],
      aiRequestTimestamps: [],
      connectAttemptTimestamps: [],
    };
    trustStore.set(userId, record);
  }
  return record;
}

/**
 * Clean timestamps older than the sliding analysis window (e.g. 5 seconds)
 */
function pruneTimestamps(timestamps: number[], windowMs = 5000): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

/**
 * Evaluate deterministic risk score and update user trust state
 */
export function evaluateRisk(userId: string): { riskLevel: RiskLevel; trustState: TrustState } {
  if (!userId) {
    return { riskLevel: "LOW_RISK", trustState: "UNVERIFIED" };
  }

  const record = getOrCreateRecord(userId);
  const now = Date.now();

  // 1. Check if user is permanently or repeatedly blocked in current session
  if (record.challengeFailures >= 3) {
    record.trustState = "BLOCKED";
    record.riskLevel = "HIGH_RISK";
    return { riskLevel: record.riskLevel, trustState: record.trustState };
  }

  // 2. Check active rate limit window
  if (record.rateLimitedUntil && now < record.rateLimitedUntil) {
    record.trustState = "RATE_LIMITED";
    record.riskLevel = "HIGH_RISK";
    return { riskLevel: record.riskLevel, trustState: record.trustState };
  } else if (record.rateLimitedUntil && now >= record.rateLimitedUntil) {
    record.rateLimitedUntil = null;
    if (record.trustState === "RATE_LIMITED") {
      record.trustState = record.lastVerifiedAt ? "VERIFIED" : "UNVERIFIED";
    }
  }

  // 3. Prune old timestamps
  record.navigationTimestamps = pruneTimestamps(record.navigationTimestamps, 5000);
  record.saveUnsaveTimestamps = pruneTimestamps(record.saveUnsaveTimestamps, 5000);
  record.aiRequestTimestamps = pruneTimestamps(record.aiRequestTimestamps, 5000);
  record.connectAttemptTimestamps = pruneTimestamps(record.connectAttemptTimestamps, 5000);

  // 4. Calculate weighted deterministic risk score
  let score = 0;

  // Excessive rapid navigation / interaction velocity (e.g. automated scraping)
  if (record.navigationTimestamps.length >= 30) {
    score += 6;
  } else if (record.navigationTimestamps.length >= 15) {
    score += 3;
  }

  // Excessive rapid save / unsave cycling
  if (record.saveUnsaveTimestamps.length >= 30) {
    score += 6;
  } else if (record.saveUnsaveTimestamps.length >= 15) {
    score += 3;
  }

  // Unusually high public AI request frequency
  if (record.aiRequestTimestamps.length >= 25) {
    score += 6;
  } else if (record.aiRequestTimestamps.length >= 12) {
    score += 3;
  }

  // Unusually high Connect / RFQ attempts
  if (record.connectAttemptTimestamps.length >= 25) {
    score += 6;
  } else if (record.connectAttemptTimestamps.length >= 12) {
    score += 3;
  }

  // Verification challenge failures
  if (record.challengeFailures === 2) {
    score += 4;
  } else if (record.challengeFailures === 1) {
    score += 2;
  }

  // 5. Map score to risk level
  if (score >= 6) {
    record.riskLevel = "HIGH_RISK";
    // If not verified, require human verification challenge
    if (record.trustState !== "VERIFIED") {
      record.trustState = "CHALLENGE_REQUIRED";
    }
  } else if (score >= 3) {
    record.riskLevel = "MEDIUM_RISK";
    if (record.trustState !== "VERIFIED" && record.trustState !== "CHALLENGE_REQUIRED") {
      record.trustState = "UNVERIFIED";
    }
  } else {
    record.riskLevel = "LOW_RISK";
    if (record.trustState !== "VERIFIED" && record.trustState !== "CHALLENGE_REQUIRED") {
      record.trustState = "UNVERIFIED";
    }
  }

  return { riskLevel: record.riskLevel, trustState: record.trustState };
}

/**
 * Record a deterministic risk signal for a personal session
 */
export function recordRiskSignal(
  userId: string | null | undefined,
  signalType: RiskSignalType,
  metadata?: any
): UserTrustProfile {
  if (!userId) {
    return {
      userId: "",
      trustState: "UNVERIFIED",
      riskLevel: "LOW_RISK",
      humanVerificationStatus: "UNVERIFIED",
      challengeFailures: 0,
    };
  }

  const record = getOrCreateRecord(userId);
  const now = Date.now();

  switch (signalType) {
    case "RAPID_NAVIGATION":
      record.navigationTimestamps.push(now);
      break;
    case "RAPID_SAVE_UNSAVE":
      record.saveUnsaveTimestamps.push(now);
      break;
    case "HIGH_AI_FREQUENCY":
      record.aiRequestTimestamps.push(now);
      break;
    case "HIGH_CONNECT_ATTEMPTS":
      record.connectAttemptTimestamps.push(now);
      break;
    case "CHALLENGE_FAILURE":
      record.challengeFailures += 1;
      break;
    case "RATE_LIMIT_TRIGGER":
      record.rateLimitedUntil = now + (metadata?.durationMs || 3000);
      record.trustState = "RATE_LIMITED";
      record.riskLevel = "HIGH_RISK";
      break;
    case "FAILED_VERIFICATION":
      record.challengeFailures += 1;
      break;
  }

  evaluateRisk(userId);
  notifyTrustChange();

  return getUserTrustProfile(userId);
}

/**
 * Retrieve the current trust profile for a user
 */
export function getUserTrustProfile(userId: string | null | undefined): UserTrustProfile {
  if (!userId) {
    return {
      userId: "",
      trustState: "UNVERIFIED",
      riskLevel: "LOW_RISK",
      humanVerificationStatus: "UNVERIFIED",
      challengeFailures: 0,
    };
  }

  const record = getOrCreateRecord(userId);
  // Re-evaluate in case rate limit or window elapsed
  evaluateRisk(userId);

  return {
    userId: record.userId,
    trustState: record.trustState,
    riskLevel: record.riskLevel,
    humanVerificationStatus: record.trustState,
    challengeFailures: record.challengeFailures,
    lastChallengeAt: record.lastChallengeAt,
    lastVerifiedAt: record.lastVerifiedAt,
  };
}

/**
 * Check if the user is verified as human
 */
export function isHumanVerified(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const profile = getUserTrustProfile(userId);
  return profile.trustState === "VERIFIED";
}

/**
 * Check eligibility for a protected personal action
 */
export function checkActionEligibility(
  userId: string | null | undefined,
  action: ProtectedPersonalAction
): ActionEligibilityResult {
  if (!userId) {
    return {
      allowed: false,
      reason: "UNAUTHENTICATED",
      trustState: "UNVERIFIED",
      riskLevel: "LOW_RISK",
      message: "Authentication required to perform this action.",
    };
  }

  const record = getOrCreateRecord(userId);
  evaluateRisk(userId);

  if (record.trustState === "BLOCKED") {
    return {
      allowed: false,
      reason: "BLOCKED",
      trustState: "BLOCKED",
      riskLevel: "HIGH_RISK",
      message: "Action blocked due to repeated verification failures.",
    };
  }

  if (record.trustState === "RATE_LIMITED") {
    return {
      allowed: false,
      reason: "RATE_LIMITED",
      trustState: "RATE_LIMITED",
      riskLevel: "HIGH_RISK",
      message: "Please slow down and try again shortly.",
    };
  }

  if (record.trustState === "CHALLENGE_REQUIRED") {
    return {
      allowed: false,
      reason: "CHALLENGE_REQUIRED",
      trustState: "CHALLENGE_REQUIRED",
      riskLevel: "HIGH_RISK",
      message: "Human verification required to perform this action.",
    };
  }

  if (record.trustState === "VERIFIED") {
    return {
      allowed: true,
      trustState: "VERIFIED",
      riskLevel: record.riskLevel,
    };
  }

  // UNVERIFIED user:
  // Low and Medium risk are allowed without challenge friction for normal visitors
  if (record.riskLevel === "LOW_RISK" || record.riskLevel === "MEDIUM_RISK") {
    return {
      allowed: true,
      trustState: "UNVERIFIED",
      riskLevel: record.riskLevel,
    };
  }

  // High risk requires challenge
  record.trustState = "CHALLENGE_REQUIRED";
  notifyTrustChange();
  return {
    allowed: false,
    reason: "CHALLENGE_REQUIRED",
    trustState: "CHALLENGE_REQUIRED",
    riskLevel: "HIGH_RISK",
    message: "Human verification required to perform this action.",
  };
}

/**
 * Generate a development human verification challenge
 */
export function requestHumanVerification(userId: string): HumanVerificationChallenge {
  if (!userId) {
    throw new Error("User ID is required to request human verification challenge.");
  }

  const record = getOrCreateRecord(userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes TTL

  const challenge: HumanVerificationChallenge = {
    id: `chal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "PENDING",
  };

  record.activeChallenge = challenge;
  record.lastChallengeAt = challenge.createdAt;
  notifyTrustChange();

  return challenge;
}

/**
 * Submit and process a human verification challenge solution
 */
export function submitHumanVerification(
  userId: string,
  solution?: { outcome?: "SUCCESS" | "FAILED" | "EXPIRED"; token?: string }
): HumanVerificationResult {
  if (!userId) {
    throw new Error("User ID is required to submit human verification.");
  }

  const record = getOrCreateRecord(userId);

  if (record.trustState === "BLOCKED") {
    return {
      success: false,
      status: "FAILED",
      message: "Action blocked due to repeated verification failures.",
      trustState: "BLOCKED",
    };
  }

  const outcome = solution?.outcome || "SUCCESS";

  if (outcome === "FAILED") {
    record.challengeFailures += 1;
    if (record.challengeFailures >= 3) {
      record.trustState = "BLOCKED";
      record.riskLevel = "HIGH_RISK";
    } else {
      record.trustState = "CHALLENGE_REQUIRED";
      record.riskLevel = "HIGH_RISK";
    }
    if (record.activeChallenge) {
      record.activeChallenge.status = "FAILED";
    }
    notifyTrustChange();
    return {
      success: false,
      status: "FAILED",
      message: record.trustState === "BLOCKED"
        ? "Action blocked due to repeated verification failures."
        : "Human verification failed. Please try again.",
      trustState: record.trustState,
    };
  }

  if (outcome === "EXPIRED") {
    record.trustState = "CHALLENGE_REQUIRED";
    if (record.activeChallenge) {
      record.activeChallenge.status = "EXPIRED";
    }
    notifyTrustChange();
    return {
      success: false,
      status: "EXPIRED",
      message: "Verification challenge expired. Please request a new challenge.",
      trustState: "CHALLENGE_REQUIRED",
    };
  }

  // SUCCESS outcome
  record.challengeFailures = 0;
  record.trustState = "VERIFIED";
  record.riskLevel = "LOW_RISK";
  record.lastVerifiedAt = new Date().toISOString();
  record.navigationTimestamps = [];
  record.saveUnsaveTimestamps = [];
  record.aiRequestTimestamps = [];
  record.connectAttemptTimestamps = [];
  record.rateLimitedUntil = null;
  if (record.activeChallenge) {
    record.activeChallenge.status = "SUCCESS";
  }

  notifyTrustChange();

  return {
    success: true,
    status: "SUCCESS",
    message: "Human verification successful.",
    trustState: "VERIFIED",
  };
}

/**
 * Trigger temporary rate limit (development helper)
 */
export function triggerRateLimit(userId: string, durationMs = 3000): void {
  if (!userId) return;
  const record = getOrCreateRecord(userId);
  record.rateLimitedUntil = Date.now() + durationMs;
  record.trustState = "RATE_LIMITED";
  record.riskLevel = "HIGH_RISK";
  notifyTrustChange();
}

/**
 * Reset a user's trust and anti-abuse state (e.g. on sign out)
 */
export function resetUserTrustState(userId: string): void {
  trustStore.delete(userId);
  notifyTrustChange();
}

/**
 * Reset all trust states (e.g. for test cleanup)
 */
export function resetAllTrustStates(): void {
  trustStore.clear();
  notifyTrustChange();
}
