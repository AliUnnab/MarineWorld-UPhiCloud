import Stripe from "stripe";
import type { SubscriptionIntent, Subscription } from "@/lib/types";
import {
  AVAILABLE_PLANS,
  getCommercialPaymentMode,
  setCommercialPaymentMode,
  isCommercialDemoMode,
  type CommercialPaymentMode,
  getSubscriptionIntentById,
  processPayment,
} from "./companyOnboardingService";
import {
  findSubscriptionIntentById,
  saveSubscriptionIntent,
} from "@/lib/repositories/subscriptionRepository";
import {
  getCommercialAgreementById,
  confirmProviderPayment,
  activateCommercialProperty,
  getCommercialPropertyByKey,
  type CommercialAgreement,
} from "./commercialPropertyService";
import {
  saveCommercialAgreement,
  saveCommercialProperty,
} from "@/lib/repositories/commercialRepository";

export {
  getCommercialPaymentMode,
  setCommercialPaymentMode,
  isCommercialDemoMode,
  type CommercialPaymentMode,
};

let stripeClient: Stripe | null = null;

export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY || undefined;
}

export function isStripeConfigured(): boolean {
  const key = getStripeSecretKey();
  return typeof key === "string" && key.trim().length > 0;
}

export function getStripeClient(): Stripe {
  const key = getStripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-01-27.acacia" as any,
    });
  }
  return stripeClient;
}

// -------------------------------------------------------------
// 1. SUBSCRIPTION CHECKOUT SESSIONS
// -------------------------------------------------------------

export interface CreateCheckoutSessionParams {
  subscriptionIntentId: string;
  companyId?: string;
  businessId?: string;
  appBaseUrl?: string;
}

export interface CreateCheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
  code?: string;
}

/**
 * Creates a Stripe Checkout Session for a canonical SubscriptionIntent
 */
export async function createStripeCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CreateCheckoutSessionResult> {
  const { subscriptionIntentId, companyId, businessId, appBaseUrl } = params;

  if (!isStripeConfigured()) {
    return {
      success: false,
      error: "Stripe keys are not configured in environment (STRIPE_SECRET_KEY). Checkout unavailable.",
      code: "STRIPE_NOT_CONFIGURED",
    };
  }

  // Resolve canonical intent
  let intent = getSubscriptionIntentById(subscriptionIntentId);
  if (!intent && companyId) {
    intent = await findSubscriptionIntentById(companyId, subscriptionIntentId);
  }

  if (!intent) {
    return {
      success: false,
      error: `SubscriptionIntent not found for id: ${subscriptionIntentId}`,
      code: "INTENT_NOT_FOUND",
    };
  }

  // Tenant Isolation Check
  if (companyId && intent.companyId.toLowerCase() !== companyId.toLowerCase()) {
    return {
      success: false,
      error: `Tenant mismatch: intent companyId '${intent.companyId}' does not match requested companyId '${companyId}'`,
      code: "TENANT_MISMATCH",
    };
  }

  if (businessId && intent.businessId.toLowerCase() !== businessId.toLowerCase()) {
    return {
      success: false,
      error: `Tenant mismatch: intent businessId '${intent.businessId}' does not match requested businessId '${businessId}'`,
      code: "TENANT_MISMATCH",
    };
  }

  // Determine canonical plan details
  let plan = (Object.values(AVAILABLE_PLANS) as any[]).find(
    (p) => p.id === intent.planId
  );
  if (!plan) {
    plan = AVAILABLE_PLANS.GROWTH;
  }

  const amountCents = Math.round((intent.amount || plan.price) * 100);
  const currency = (intent.currency || plan.currency || "usd").toLowerCase();
  const baseUrl =
    appBaseUrl ||
    process.env.APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  const successUrl = `${baseUrl}/company/onboarding?stripe_status=success&session_id={CHECKOUT_SESSION_ID}&intent_id=${encodeURIComponent(
    intent.id
  )}`;
  const cancelUrl = `${baseUrl}/company/onboarding?stripe_status=canceled&intent_id=${encodeURIComponent(
    intent.id
  )}`;

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `${plan.name} Tier Subscription`,
              description: `MarineWorld.City Subscription for ${intent.companyId} (${intent.businessId})`,
            },
            unit_amount: amountCents,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        subscriptionIntentId: intent.id,
        companyId: intent.companyId,
        businessId: intent.businessId,
        planId: intent.planId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Update SubscriptionIntent with route state
    intent.paymentMethod = "STRIPE";
    intent.paymentState = "READY";
    intent.paymentReference = session.id;
    intent.updatedAt = new Date().toISOString();
    await saveSubscriptionIntent(intent);

    return {
      success: true,
      sessionId: session.id,
      url: session.url || undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to create Stripe Checkout session",
      code: "STRIPE_API_ERROR",
    };
  }
}

// -------------------------------------------------------------
// 2. DIGITAL PROPERTY LEASE CHECKOUT SESSIONS
// -------------------------------------------------------------

export interface CreateLeaseCheckoutSessionParams {
  agreementId: string;
  companyId?: string;
  actorEmail?: string;
  appBaseUrl?: string;
}

export async function createStripeLeaseCheckoutSession(
  params: CreateLeaseCheckoutSessionParams
): Promise<CreateCheckoutSessionResult> {
  const { agreementId, companyId, appBaseUrl } = params;

  if (!isStripeConfigured()) {
    return {
      success: false,
      error: "Stripe keys are not configured in environment (STRIPE_SECRET_KEY). Checkout unavailable in current environment.",
      code: "STRIPE_NOT_CONFIGURED",
    };
  }

  const agreement = getCommercialAgreementById(agreementId);
  if (!agreement) {
    return {
      success: false,
      error: `Commercial Agreement not found for id: ${agreementId}`,
      code: "AGREEMENT_NOT_FOUND",
    };
  }

  // Tenant Isolation Check
  if (companyId && agreement.companyId.toLowerCase() !== companyId.toLowerCase()) {
    return {
      success: false,
      error: `Tenant mismatch: agreement companyId '${agreement.companyId}' does not match requested companyId '${companyId}'`,
      code: "TENANT_MISMATCH",
    };
  }

  if (agreement.contractStatus === "PAYMENT_CONFIRMED" || agreement.contractStatus === "ACTIVE") {
    return {
      success: false,
      error: "Commercial lease is already paid and active.",
      code: "ALREADY_ACTIVE",
    };
  }

  const amountCents = Math.round(agreement.totalContractValue * 100);
  const currency = (agreement.currency || "usd").toLowerCase();
  const baseUrl =
    appBaseUrl ||
    process.env.APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  const successUrl = `${baseUrl}/company/studio?tab=properties&property_stripe_status=success&session_id={CHECKOUT_SESSION_ID}&agreement_id=${encodeURIComponent(
    agreement.agreementId
  )}`;
  const cancelUrl = `${baseUrl}/company/studio?tab=properties&property_stripe_status=canceled&agreement_id=${encodeURIComponent(
    agreement.agreementId
  )}`;

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `MarineWorld Digital Property Lease: ${agreement.canonicalPropertyKey}`,
              description: `${agreement.tier} Tier Lease (${agreement.termMonths} Months) for ${agreement.companyName || agreement.companyId}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "COMMERCIAL_PROPERTY_LEASE",
        agreementId: agreement.agreementId,
        companyId: agreement.companyId,
        canonicalPropertyKey: agreement.canonicalPropertyKey,
        propertyKey: agreement.propertyKey,
        cityId: agreement.cityId,
        regionCode: agreement.regionCode,
        slotId: agreement.slotId,
        offerId: agreement.offerId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    agreement.billingSubscriptionRef = session.id;
    agreement.billingStatus = "PENDING";
    agreement.contractStatus = "PAYMENT_PENDING";
    await saveCommercialAgreement(agreement);

    return {
      success: true,
      sessionId: session.id,
      url: session.url || undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to create Stripe Property Lease Checkout session",
      code: "STRIPE_API_ERROR",
    };
  }
}

// -------------------------------------------------------------
// 3. AUTHORITATIVE WEBHOOK PROCESSING
// -------------------------------------------------------------

export interface WebhookProcessingResult {
  success: boolean;
  duplicate?: boolean;
  eventStatus?: string;
  intent?: SubscriptionIntent | null;
  subscription?: Subscription | null;
  agreement?: CommercialAgreement | null;
  error?: string;
}

/**
 * Authoritative Webhook Event Handler
 */
export async function handleStripeWebhookEvent(
  event: any
): Promise<WebhookProcessingResult> {
  if (!event || !event.type) {
    return { success: false, error: "Invalid Stripe event structure" };
  }

  const eventType = event.type;
  const session = event.data?.object;
  const metadata = session?.metadata || {};

  // Case A: Commercial Digital Property Lease Checkout
  if (metadata.type === "COMMERCIAL_PROPERTY_LEASE" || metadata.agreementId) {
    const agreementId = metadata.agreementId;
    const agreement = getCommercialAgreementById(agreementId);

    if (!agreement) {
      return { success: false, error: `Commercial Agreement not found: ${agreementId}` };
    }

    if (
      eventType === "checkout.session.completed" ||
      eventType === "checkout.session.async_payment_succeeded"
    ) {
      // Idempotency check
      if (agreement.contractStatus === "PAYMENT_CONFIRMED" || agreement.contractStatus === "ACTIVE") {
        return {
          success: true,
          duplicate: true,
          eventStatus: "ALREADY_PROCESSED",
          agreement,
        };
      }

      // Authoritative payment confirmation
      const confirmRes = confirmProviderPayment({
        agreementId,
        actor: "stripe-webhook",
        providerEventRef: session?.id || session?.payment_intent,
      });

      // Automated Activation
      const activateRes = activateCommercialProperty({
        agreementId,
        operatorActor: "stripe-webhook-activation",
      });

      return {
        success: true,
        duplicate: false,
        eventStatus: "COMPLETED",
        agreement: activateRes.agreement || confirmRes.agreement || agreement,
      };
    }

    if (eventType === "checkout.session.async_payment_failed") {
      agreement.contractStatus = "PAYMENT_PENDING";
      agreement.billingStatus = "PAST_DUE";
      await saveCommercialAgreement(agreement);
      return {
        success: true,
        eventStatus: "FAILED",
        agreement,
      };
    }

    return { success: true, eventStatus: "IGNORED_EVENT_TYPE" };
  }

  // Case B: Subscription Plan Checkout
  if (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded"
  ) {
    const intentId = metadata.subscriptionIntentId;
    const companyId = metadata.companyId;

    let intent = getSubscriptionIntentById(intentId);
    if (!intent && companyId) {
      intent = await findSubscriptionIntentById(companyId, intentId);
    }

    if (!intent) {
      return { success: false, error: `SubscriptionIntent not found: ${intentId}` };
    }

    // Idempotency Check: Duplicate webhook event ignored
    if (intent.status === "SUCCEEDED" && intent.paymentState === "SUCCEEDED") {
      return {
        success: true,
        duplicate: true,
        eventStatus: "ALREADY_PROCESSED",
        intent,
      };
    }

    // Process Authoritative Payment Success
    intent.paymentMethod = "STRIPE";
    intent.paymentState = "SUCCEEDED";
    const result = processPayment(intent.id, true, session?.id || session?.payment_intent);

    return {
      success: true,
      duplicate: false,
      eventStatus: "COMPLETED",
      intent: result.intent,
      subscription: result.subscription,
    };
  }

  if (eventType === "checkout.session.async_payment_failed") {
    const intentId = metadata.subscriptionIntentId;
    let intent = getSubscriptionIntentById(intentId);
    if (intent) {
      intent.paymentMethod = "STRIPE";
      intent.paymentState = "FAILED";
      const result = processPayment(intent.id, false);
      return { success: true, eventStatus: "FAILED", intent: result.intent };
    }
  }

  if (eventType === "checkout.session.expired") {
    const intentId = metadata.subscriptionIntentId;
    let intent = getSubscriptionIntentById(intentId);
    if (intent) {
      intent.paymentMethod = "STRIPE";
      intent.paymentState = "CANCELED";
      intent.status = "FAILED";
      intent.updatedAt = new Date().toISOString();
      await saveSubscriptionIntent(intent);
      return { success: true, eventStatus: "EXPIRED", intent };
    }
  }

  return { success: true, eventStatus: "IGNORED_EVENT_TYPE" };
}

// -------------------------------------------------------------
// 4. SESSION STATUS SYNCS
// -------------------------------------------------------------

export async function verifyAndSyncStripeSessionStatus(
  sessionId: string,
  intentId: string
): Promise<{ success: boolean; intent: SubscriptionIntent | null; subscription: Subscription | null; status: string }> {
  let intent = getSubscriptionIntentById(intentId);

  if (isStripeConfigured()) {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid") {
        const metadata = session.metadata || {};
        if (metadata.subscriptionIntentId && metadata.subscriptionIntentId !== intentId) {
          throw new Error("Intent ID mismatch in session metadata");
        }
        const result = processPayment(intentId, true, session.id);
        return {
          success: true,
          intent: result.intent,
          subscription: result.subscription || null,
          status: "PAID",
        };
      } else if (session.status === "expired") {
        const result = processPayment(intentId, false);
        return {
          success: false,
          intent: result.intent,
          subscription: null,
          status: "EXPIRED",
        };
      }
    } catch (err) {
      console.warn("[StripeService] Session retrieval check failed:", err);
    }
  }

  return {
    success: intent?.status === "SUCCEEDED",
    intent: intent || null,
    subscription: null,
    status: intent?.status || "PENDING",
  };
}

export async function verifyAndSyncStripeLeaseSessionStatus(
  sessionId: string,
  agreementId: string
): Promise<{ success: boolean; agreement: CommercialAgreement | null; status: string }> {
  let agreement = getCommercialAgreementById(agreementId);

  if (isStripeConfigured()) {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid") {
        const metadata = session.metadata || {};
        if (metadata.agreementId && metadata.agreementId !== agreementId) {
          throw new Error("Agreement ID mismatch in session metadata");
        }
        const confirmRes = confirmProviderPayment({
          agreementId,
          actor: "stripe-sync",
          providerEventRef: session.id,
        });
        const activateRes = activateCommercialProperty({
          agreementId,
          operatorActor: "stripe-sync-activation",
        });
        return {
          success: true,
          agreement: activateRes.agreement || confirmRes.agreement || agreement,
          status: "PAID",
        };
      }
    } catch (err) {
      console.warn("[StripeService] Lease session retrieval check failed:", err);
    }
  }

  return {
    success: agreement?.contractStatus === "ACTIVE" || agreement?.contractStatus === "PAYMENT_CONFIRMED",
    agreement: agreement || null,
    status: agreement?.contractStatus || "PENDING",
  };
}
