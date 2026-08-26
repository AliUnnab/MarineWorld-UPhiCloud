/**
 * MarineWorld.City — Public Form Abuse Protection & Client-Side Rate Limiting
 * Enforces submission cooldowns, honeypot traps, and payload sanitization
 * across all public intake forms (RFQs, Connect inquiries, City entrance, Ecosystem enrollment).
 */

interface RateLimitRecord {
  count: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Default rate limit parameters
const DEFAULT_MAX_SUBMISSIONS = 5;
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_COOLDOWN_MS = 3000; // 3 seconds between successive clicks

export interface AbuseCheckOptions {
  formId: string;
  honeypotValue?: string;
  maxSubmissions?: number;
  windowMs?: number;
  cooldownMs?: number;
}

export interface AbuseCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * Validates a form submission against abuse heuristics.
 */
export function checkFormAbuse(options: AbuseCheckOptions): AbuseCheckResult {
  const {
    formId,
    honeypotValue,
    maxSubmissions = DEFAULT_MAX_SUBMISSIONS,
    windowMs = DEFAULT_WINDOW_MS,
    cooldownMs = DEFAULT_COOLDOWN_MS,
  } = options;

  // 1. Honeypot check (Bots fill hidden fields)
  if (honeypotValue && honeypotValue.trim().length > 0) {
    console.warn(`[AbuseProtection] Honeypot triggered for form '${formId}'`);
    return {
      allowed: false,
      reason: "Automated submission rejected. Please try again or contact support.",
      retryAfterSeconds: 30,
    };
  }

  const now = Date.now();
  const record = rateLimitStore.get(formId);

  if (!record) {
    rateLimitStore.set(formId, {
      count: 1,
      firstTimestamp: now,
      lastTimestamp: now,
    });
    return { allowed: true };
  }

  // 2. Cooldown check between rapid successive clicks
  if (now - record.lastTimestamp < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - (now - record.lastTimestamp)) / 1000);
    return {
      allowed: false,
      reason: `Please wait ${waitSec} second${waitSec > 1 ? "s" : ""} before submitting again.`,
      retryAfterSeconds: waitSec,
    };
  }

  // 3. Sliding window reset
  if (now - record.firstTimestamp > windowMs) {
    rateLimitStore.set(formId, {
      count: 1,
      firstTimestamp: now,
      lastTimestamp: now,
    });
    return { allowed: true };
  }

  // 4. Rate limit check within active window
  if (record.count >= maxSubmissions) {
    const remainingMs = windowMs - (now - record.firstTimestamp);
    const retrySec = Math.ceil(remainingMs / 1000);
    return {
      allowed: false,
      reason: `Submission rate limit exceeded. Please wait ${retrySec} seconds before trying again.`,
      retryAfterSeconds: retrySec,
    };
  }

  // Update record
  record.count += 1;
  record.lastTimestamp = now;
  rateLimitStore.set(formId, record);

  return { allowed: true };
}

/**
 * Sanitizes input text to prevent XSS and script injection.
 */
export function sanitizeInputString(input?: string): string {
  if (!input) return "";
  return input
    .replace(/[<>]/g, "") // Strip raw HTML tags
    .trim();
}

/**
 * Validates standard email address format.
 */
export function isValidEmailAddress(email?: string): boolean {
  if (!email) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}
