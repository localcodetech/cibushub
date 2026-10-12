import { Router } from "express";
import { showDashboard } from "../../controllers/admin/adminDashboard.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Today's orders and GMV, active orders, riders online, approvals waiting, alerts [AC-ADM-01]
// ─────────────────────────────────────────────
router.get("/", showDashboard);

export default router;
