import { Router } from "express";
import validate from "../../middlewares/validate.js";
import {
  adminListReviewsSchema,
  moderateReviewSchema,
} from "../../validators/review/review.validator.js";
import { hide, listReviews, show } from "../../controllers/review/adminReviews.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Every review, hidden ones too (?hidden=true, ?restaurantId=, ?maxRating=2)
// ─────────────────────────────────────────────
router.get("/", validate(adminListReviewsSchema, "query"), listReviews);

// ─────────────────────────────────────────────
// Hide an abusive review, with a reason (audited) [AC-REV-07]
// ─────────────────────────────────────────────
router.post("/:reviewId/hide", validate(moderateReviewSchema), hide);

// ─────────────────────────────────────────────
// Show a hidden review again, with a reason (audited)
// ─────────────────────────────────────────────
router.post("/:reviewId/show", validate(moderateReviewSchema), show);

export default router;
