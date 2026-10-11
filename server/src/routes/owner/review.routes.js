import { Router } from "express";
import validate from "../../middlewares/validate.js";
import requireActive from "../../middlewares/requireActive.js";
import { listOwnerReviewsSchema, replySchema } from "../../validators/review/review.validator.js";
import { listReviews, reply } from "../../controllers/review/ownerReviews.controller.js";

const router = Router();

// For approved, active owners only
router.use(requireActive);

// ─────────────────────────────────────────────
// Reviews of my restaurants, newest first (?unanswered=true for the ones to answer)
// ─────────────────────────────────────────────
router.get("/", validate(listOwnerReviewsSchema, "query"), listReviews);

// ─────────────────────────────────────────────
// My one public reply to a review [AC-REV-06]
// ─────────────────────────────────────────────
router.post("/:reviewId/reply", validate(replySchema), reply);

export default router;
