import { Router } from "express";
import requireVerifiedPhone from "../../middlewares/requireVerifiedPhone.js";
import requireActive from "../../middlewares/requireActive.js";
import validate from "../../middlewares/validate.js";
import uploadOneFile from "../../middlewares/upload.js";
import { createRestaurantSchema } from "../../validators/restaurant/createRestaurant.validator.js";
import { updateRestaurantSchema } from "../../validators/restaurant/updateRestaurant.validator.js";
import { updateOpeningHoursSchema } from "../../validators/restaurant/updateOpeningHours.validator.js";
import { acceptingOrdersSchema } from "../../validators/restaurant/acceptingOrders.validator.js";
import { documentTypeParamsSchema } from "../../validators/restaurant/document.validator.js";
import { createRestaurant } from "../../controllers/restaurant/createRestaurant.controller.js";
import {
  getRestaurant,
  listRestaurants,
} from "../../controllers/restaurant/myRestaurants.controller.js";
import {
  resubmit,
  updateAcceptingOrders,
  updateOpeningHours,
  updateRestaurant,
} from "../../controllers/restaurant/manageRestaurant.controller.js";
import {
  listMyDocuments,
  uploadCover,
  uploadDocument,
  uploadLogo,
} from "../../controllers/restaurant/restaurantUploads.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Submit a new restaurant for admin approval
// ─────────────────────────────────────────────
router.post("/", requireVerifiedPhone, validate(createRestaurantSchema), createRestaurant);

// ─────────────────────────────────────────────
// List my restaurants (any status), newest first
// ─────────────────────────────────────────────
router.get("/", requireVerifiedPhone, listRestaurants);

// ─────────────────────────────────────────────
// View one of my restaurants (404 if it is not mine)
// ─────────────────────────────────────────────
router.get("/:restaurantId", requireVerifiedPhone, getRestaurant);

// ─────────────────────────────────────────────
// Edit profile and delivery settings (legal name change → admin re-review)
// ─────────────────────────────────────────────
router.patch(
  "/:restaurantId",
  requireVerifiedPhone,
  validate(updateRestaurantSchema),
  updateRestaurant,
);

// ─────────────────────────────────────────────
// Replace the opening hours for the whole week
// ─────────────────────────────────────────────
router.put(
  "/:restaurantId/opening-hours",
  requireVerifiedPhone,
  validate(updateOpeningHoursSchema),
  updateOpeningHours,
);

// ─────────────────────────────────────────────
// Open or close for new orders (approved restaurants only)
// ─────────────────────────────────────────────
router.patch(
  "/:restaurantId/accepting-orders",
  requireActive,
  validate(acceptingOrdersSchema),
  updateAcceptingOrders,
);

// ─────────────────────────────────────────────
// Send a rejected restaurant back for approval
// ─────────────────────────────────────────────
router.post("/:restaurantId/resubmit", requireVerifiedPhone, resubmit);

// ─────────────────────────────────────────────
// Upload or replace the logo / cover image (form field "image")
// ─────────────────────────────────────────────
router.put("/:restaurantId/logo", requireVerifiedPhone, uploadOneFile("image"), uploadLogo);
router.put("/:restaurantId/cover", requireVerifiedPhone, uploadOneFile("image"), uploadCover);

// ─────────────────────────────────────────────
// Private verification documents (form field "file"); owners never get a link back
// ─────────────────────────────────────────────
router.get("/:restaurantId/documents", requireVerifiedPhone, listMyDocuments);
router.put(
  "/:restaurantId/documents/:documentType",
  requireVerifiedPhone,
  validate(documentTypeParamsSchema, "params"),
  uploadOneFile("file"),
  uploadDocument,
);

export default router;
