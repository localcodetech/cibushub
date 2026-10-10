import { Router } from "express";
import validate from "../../middlewares/validate.js";
import {
  adminListRidersSchema,
  rejectRiderSchema,
  suspendRiderSchema,
} from "../../validators/rider/reviewRider.validator.js";
import {
  approve,
  getRider,
  listDocuments,
  listRiders,
  reject,
  suspend,
} from "../../controllers/rider/reviewRider.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// List rider applications, oldest submission first (the review queue)
// ─────────────────────────────────────────────
router.get("/", validate(adminListRidersSchema, "query"), listRiders);

// ─────────────────────────────────────────────
// One rider's application and account
// ─────────────────────────────────────────────
router.get("/:riderId", getRider);

// ─────────────────────────────────────────────
// A rider's Ghana Card and licence, each with a 5-minute link
// ─────────────────────────────────────────────
router.get("/:riderId/documents", listDocuments);

// ─────────────────────────────────────────────
// Approve a pending rider, or reinstate a suspended one
// ─────────────────────────────────────────────
router.post("/:riderId/approve", approve);

// ─────────────────────────────────────────────
// Reject a pending rider (reason required)
// ─────────────────────────────────────────────
router.post("/:riderId/reject", validate(rejectRiderSchema), reject);

// ─────────────────────────────────────────────
// Suspend an approved rider (reason required)
// ─────────────────────────────────────────────
router.post("/:riderId/suspend", validate(suspendRiderSchema), suspend);

export default router;
