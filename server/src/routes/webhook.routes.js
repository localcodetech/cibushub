import express, { Router } from "express";
import { receivePaystackWebhook } from "../controllers/payment/paystackWebhook.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Paystack payment events. express.raw keeps the body as raw bytes for the signature check [AC-PAY-04]
// ─────────────────────────────────────────────
router.post(
  "/paystack",
  express.raw({ type: "application/json", limit: "100kb" }),
  receivePaystackWebhook,
);

export default router;
