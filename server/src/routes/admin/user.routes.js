import { Router } from "express";
import validate from "../../middlewares/validate.js";
import {
  adminListUsersSchema,
  userActionSchema,
} from "../../validators/admin/adminUsers.validator.js";
import {
  getUser,
  listUsers,
  reactivate,
  suspend,
} from "../../controllers/admin/adminUsers.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Every account, newest first: search by name, email or phone; filter by role and status
// ─────────────────────────────────────────────
router.get("/", validate(adminListUsersSchema, "query"), listUsers);

// ─────────────────────────────────────────────
// One account, with its orders, restaurants or rider application
// ─────────────────────────────────────────────
router.get("/:userId", getUser);

// ─────────────────────────────────────────────
// Suspend an account (signed out everywhere), with a reason (audited) [AC-ADM-02]
// ─────────────────────────────────────────────
router.post("/:userId/suspend", validate(userActionSchema), suspend);

// ─────────────────────────────────────────────
// Reactivate a suspended account, with a reason (audited)
// ─────────────────────────────────────────────
router.post("/:userId/reactivate", validate(userActionSchema), reactivate);

export default router;
