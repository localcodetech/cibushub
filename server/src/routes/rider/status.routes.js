import { Router } from "express";
import requireActive from "../../middlewares/requireActive.js";
import validate from "../../middlewares/validate.js";
import { goOnlineSchema } from "../../validators/rider/riderPresence.validator.js";
import { getStatus, offline, online } from "../../controllers/rider/riderPresence.controller.js";

const router = Router();

// Working as a rider needs an approved, active account
router.use(requireActive);

// ─────────────────────────────────────────────
// Am I online? When did I last send my location?
// ─────────────────────────────────────────────
router.get("/", getStatus);

// ─────────────────────────────────────────────
// Go online, with my current location (then the phone sends it over the socket)
// ─────────────────────────────────────────────
router.post("/online", validate(goOnlineSchema), online);

// ─────────────────────────────────────────────
// Go offline: no more offers, location sharing stops
// ─────────────────────────────────────────────
router.post("/offline", offline);

export default router;
