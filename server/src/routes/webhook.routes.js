import express, { Router } from "express";
import { receivePaystackWebhook } from "../controllers/payment/paystackWebhook.controller.js";
import { receiveResendWebhook } from "../controllers/notification/resendWebhook.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Paystack payment events. express.raw keeps the body as raw bytes for the signature check [AC-PAY-04]
// ─────────────────────────────────────────────
router.post(
  "/paystack",
  express.raw({ type: "application/json", limit: "100kb" }),
  receivePaystackWebhook,
);

// ─────────────────────────────────────────────
// Resend email events (bounces). Raw body again, for the Svix signature check [AC-NOTIF-08]
// ─────────────────────────────────────────────
router.post(
  "/resend",
  express.raw({ type: "application/json", limit: "100kb" }),
  receiveResendWebhook,
);

export default router;
