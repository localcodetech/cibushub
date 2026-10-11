import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { listAuditLogsSchema } from "../../validators/admin/auditLogs.validator.js";
import { listActions, listLogs } from "../../controllers/admin/auditLogs.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Every admin action, newest first, with filters [AC-ADM-07]
// ─────────────────────────────────────────────
router.get("/", validate(listAuditLogsSchema, "query"), listLogs);

// ─────────────────────────────────────────────
// The action names used so far (for the filter list)
// ─────────────────────────────────────────────
router.get("/actions", listActions);

export default router;
