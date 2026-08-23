import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  isStripeConfigured,
  createStripeCheckoutSession,
  createStripeLeaseCheckoutSession,
  handleStripeWebhookEvent,
  verifyAndSyncStripeSessionStatus,
  verifyAndSyncStripeLeaseSessionStatus,
  getStripeClient,
  getStripeSecretKey,
} from "./src/lib/services/stripeService";
import {
  isEmailDeliveryConfigured,
  sendTransactionalEmail,
} from "./src/lib/services/emailDeliveryService";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Raw body parser for Stripe webhook signature verification
  app.use(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: express.Request, res: express.Response) => {
      try {
        const sig = req.headers["stripe-signature"];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event: any;
        if (webhookSecret && sig) {
          try {
            const stripe = getStripeClient();
            event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
          } catch (err: any) {
            console.error("[Stripe Webhook] Signature verification failed:", err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
          }
        } else {
          // Fallback parsing for test environments
          const bodyString = typeof req.body === "string" ? req.body : req.body.toString("utf8");
          event = JSON.parse(bodyString || "{}");
        }

        const result = await handleStripeWebhookEvent(event);
        res.status(200).json({ received: true, result });
      } catch (err: any) {
        console.error("[Stripe Webhook] Error processing event:", err);
        res.status(500).json({ error: err?.message || "Internal server error" });
      }
    }
  );

  // Standard JSON body parser for all other API endpoints
  app.use(express.json());

  // API Health Endpoint
  app.get("/api/health", (_req, res) => {
    const emailInfo = isEmailDeliveryConfigured();
    res.json({
      status: "ok",
      stripeConfigured: isStripeConfigured(),
      emailConfigured: emailInfo.configured,
      emailProvider: emailInfo.provider,
      timestamp: new Date().toISOString(),
    });
  });

  // Transactional Email Status Endpoint
  app.get("/api/email/status", (_req, res) => {
    const emailInfo = isEmailDeliveryConfigured();
    res.json({
      success: true,
      configured: emailInfo.configured,
      provider: emailInfo.provider,
      fromAddress: emailInfo.fromAddress,
      fromName: emailInfo.fromName,
    });
  });

  // Transactional Email Send Endpoint
  app.post("/api/email/send", async (req, res) => {
    try {
      const { to, toName, subject, html, text, type, referenceId, metadata } = req.body;

      if (!to || !to.includes("@")) {
        res.status(400).json({
          success: false,
          error: "Recipient 'to' email address is required and must be valid.",
          code: "INVALID_RECIPIENT",
        });
        return;
      }

      if (!subject || !html) {
        res.status(400).json({
          success: false,
          error: "Email 'subject' and 'html' body content are required.",
          code: "INVALID_PAYLOAD",
        });
        return;
      }

      const result = await sendTransactionalEmail({
        to,
        toName,
        subject,
        html,
        text,
        type: type || "NEW_INQUIRY",
        referenceId,
        metadata,
      });

      res.status(200).json(result);
    } catch (err: any) {
      console.error("[API] Error handling transactional email send:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Internal server error during email dispatch",
        code: "SERVER_ERROR",
      });
    }
  });

  // Create Stripe Checkout Session
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { subscriptionIntentId, companyId, businessId } = req.body;

      if (!subscriptionIntentId) {
        res.status(400).json({
          success: false,
          error: "subscriptionIntentId is required",
          code: "MISSING_INTENT_ID",
        });
        return;
      }

      const result = await createStripeCheckoutSession({
        subscriptionIntentId,
        companyId,
        businessId,
        appBaseUrl: process.env.APP_URL,
      });

      if (!result.success) {
        const statusCode = result.code === "STRIPE_NOT_CONFIGURED" ? 503 : 400;
        res.status(statusCode).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (err: any) {
      console.error("[API] Error creating checkout session:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Internal server error",
        code: "SERVER_ERROR",
      });
    }
  });

  // Verify and sync Stripe Checkout Session status
  app.get("/api/stripe/session-status", async (req, res) => {
    try {
      const { session_id, intent_id } = req.query;

      if (!session_id || !intent_id) {
        res.status(400).json({
          success: false,
          error: "session_id and intent_id query parameters are required",
        });
        return;
      }

      const result = await verifyAndSyncStripeSessionStatus(
        String(session_id),
        String(intent_id)
      );

      res.status(200).json(result);
    } catch (err: any) {
      console.error("[API] Error verifying session status:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Internal server error",
      });
    }
  });

  // Create Stripe Digital Property Lease Checkout Session
  app.post("/api/stripe/create-lease-checkout", async (req, res) => {
    try {
      const { agreementId, companyId, actorEmail } = req.body;

      if (!agreementId) {
        res.status(400).json({
          success: false,
          error: "agreementId is required",
          code: "MISSING_AGREEMENT_ID",
        });
        return;
      }

      const result = await createStripeLeaseCheckoutSession({
        agreementId,
        companyId,
        actorEmail,
        appBaseUrl: process.env.APP_URL,
      });

      if (!result.success) {
        const statusCode = result.code === "STRIPE_NOT_CONFIGURED" ? 503 : 400;
        res.status(statusCode).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (err: any) {
      console.error("[API] Error creating lease checkout session:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Internal server error",
        code: "SERVER_ERROR",
      });
    }
  });

  // Verify and sync Stripe Property Lease Checkout Session status
  app.get("/api/stripe/lease-session-status", async (req, res) => {
    try {
      const { session_id, agreement_id } = req.query;

      if (!session_id || !agreement_id) {
        res.status(400).json({
          success: false,
          error: "session_id and agreement_id query parameters are required",
        });
        return;
      }

      const result = await verifyAndSyncStripeLeaseSessionStatus(
        String(session_id),
        String(agreement_id)
      );

      res.status(200).json(result);
    } catch (err: any) {
      console.error("[API] Error verifying lease session status:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Internal server error",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MarineWorld Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
