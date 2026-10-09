import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { createRateLimiter } from "../../middlewares/rateLimit/createRateLimiter.js";
import { placeSearchSchema, reverseGeocodeSchema } from "../../validators/maps/maps.validator.js";
import { findPlaces, getPlaceForPin } from "../../controllers/maps/maps.controller.js";

const router = Router();

// The free geocoder allows 1 request a second for the whole app, so each customer gets a fair share
const mapsLimiter = createRateLimiter({
  name: "maps",
  windowSeconds: 60,
  limit: 30,
  keyBy: (req) => `user:${req.user.id}`,
});

// ─────────────────────────────────────────────
// Map pin -> area name (never fails: area is null if the geocoder is down)
// ─────────────────────────────────────────────
router.get("/reverse", mapsLimiter, validate(reverseGeocodeSchema, "query"), getPlaceForPin);

// ─────────────────────────────────────────────
// Search a place in Ghana, Kumasi first
// ─────────────────────────────────────────────
router.get("/search", mapsLimiter, validate(placeSearchSchema, "query"), findPlaces);

export default router;
