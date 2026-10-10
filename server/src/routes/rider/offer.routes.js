import { Router } from "express";
import requireActive from "../../middlewares/requireActive.js";
import { decline, getCurrentOffer } from "../../controllers/rider/riderOffers.controller.js";

const router = Router();

router.use(requireActive);

// ─────────────────────────────────────────────
// The offer waiting for me right now, or null (after the app reconnects)
// ─────────────────────────────────────────────
router.get("/current", getCurrentOffer);

// ─────────────────────────────────────────────
// Decline an offer: the next rider is asked straight away
// ─────────────────────────────────────────────
router.post("/:offerId/decline", decline);

export default router;
