import { Router } from "express";
import validate from "../../middlewares/validate.js";
import {
  adminActionSchema,
  changeAdminRoleSchema,
  createAdminSchema,
} from "../../validators/superAdmin/manageAdmins.validator.js";
import {
  changeRole,
  create,
  list,
  reactivate,
  remove,
  suspend,
} from "../../controllers/superAdmin/manageAdmins.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Every admin and super admin [AC-SADM-01]
// ─────────────────────────────────────────────
router.get("/", list);

// ─────────────────────────────────────────────
// Create an admin or super admin account
// ─────────────────────────────────────────────
router.post("/", validate(createAdminSchema), create);

// ─────────────────────────────────────────────
// Suspend or reactivate an admin (never the last super admin) [AC-SADM-04]
// ─────────────────────────────────────────────
router.post("/:userId/suspend", validate(adminActionSchema), suspend);
router.post("/:userId/reactivate", validate(adminActionSchema), reactivate);

// ─────────────────────────────────────────────
// Make an admin a super admin, or the other way round
// ─────────────────────────────────────────────
router.patch("/:userId/role", validate(changeAdminRoleSchema), changeRole);

// ─────────────────────────────────────────────
// Remove an admin account (with a reason, so not DELETE: a body is needed)
// ─────────────────────────────────────────────
router.post("/:userId/remove", validate(adminActionSchema), remove);

export default router;
