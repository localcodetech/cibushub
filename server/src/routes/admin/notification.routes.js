import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { listNotificationLogsSchema } from "../../validators/admin/notificationLog.validator.js";
import { listNotifications } from "../../controllers/admin/adminNotifications.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Every email and SMS sent, newest first (filter e.g. ?status=FAILED)
// ─────────────────────────────────────────────
router.get("/", validate(listNotificationLogsSchema, "query"), listNotifications);

export default router;
