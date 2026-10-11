import { Router } from "express";
import requireActive from "../../middlewares/requireActive.js";
import {
  accept,
  decline,
  getCurrentOffer,
} from "../../controllers/rider/riderOffers.controller.js";

const router = Router();

router.use(requireActive);

// ─────────────────────────────────────────────
// The offer waiting for me right now, or null (after the app reconnects)
// ─────────────────────────────────────────────
router.get("/current", getCurrentOffer);

// ─────────────────────────────────────────────
// Accept an offer: only one rider ever wins a delivery
// ─────────────────────────────────────────────
router.post("/:offerId/accept", accept);

// ─────────────────────────────────────────────
// Decline an offer: the next rider is asked straight away
// ─────────────────────────────────────────────
router.post("/:offerId/decline", decline);

export default router;
