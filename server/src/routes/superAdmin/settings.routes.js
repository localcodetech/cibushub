import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { updateSettingsSchema } from "../../validators/superAdmin/platformSettings.validator.js";
import {
  changeSettings,
  showSettings,
} from "../../controllers/superAdmin/platformSettings.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// The settings in force, and the latest versions (who, when, why) [AC-SADM-02]
// ─────────────────────────────────────────────
router.get("/", showSettings);

// ─────────────────────────────────────────────
// Change some settings, with a reason: a new version, audited, in force at once [AC-SADM-03]
// ─────────────────────────────────────────────
router.patch("/", validate(updateSettingsSchema), changeSettings);

export default router;
