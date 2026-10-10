import { Router } from "express";
import requireVerifiedPhone from "../../middlewares/requireVerifiedPhone.js";
import validate from "../../middlewares/validate.js";
import uploadOneFile from "../../middlewares/upload.js";
import {
  riderDetailsSchema,
  riderDocumentParamsSchema,
} from "../../validators/rider/riderApplication.validator.js";
import {
  getApplication,
  saveDetails,
  submit,
  uploadDocument,
  uploadPhoto,
} from "../../controllers/rider/riderApplication.controller.js";

const router = Router();

// Riders fill this in while their account waits for approval, so no requireActive here
router.use(requireVerifiedPhone);

// ─────────────────────────────────────────────
// My application: details, photo, which documents are in, what is missing
// ─────────────────────────────────────────────
router.get("/", getApplication);

// ─────────────────────────────────────────────
// Vehicle type, plate number, Ghana Card number (creates the application the first time)
// ─────────────────────────────────────────────
router.put("/", validate(riderDetailsSchema), saveDetails);

// ─────────────────────────────────────────────
// My photo (becomes my profile photo)
// ─────────────────────────────────────────────
router.put("/photo", uploadOneFile("image"), uploadPhoto);

// ─────────────────────────────────────────────
// Ghana Card or driver's licence image (private)
// ─────────────────────────────────────────────
router.put(
  "/documents/:documentType",
  validate(riderDocumentParamsSchema, "params"),
  uploadOneFile("document"),
  uploadDocument,
);

// ─────────────────────────────────────────────
// Submit for admin review
// ─────────────────────────────────────────────
router.post("/submit", submit);

export default router;
