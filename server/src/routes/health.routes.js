import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Report API, MySQL and Redis status
// ─────────────────────────────────────────────
router.get("/", getHealth);

export default router;
