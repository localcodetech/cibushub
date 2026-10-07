import { Router } from "express";
import validate from "../middlewares/validate.js";
import uploadOneFile from "../middlewares/upload.js";
import { updateProfileSchema } from "../validators/profile/profile.validator.js";
import { updateProfile, uploadAvatar } from "../controllers/profile/profile.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Change my name (view it with GET /auth/me)
// ─────────────────────────────────────────────
router.patch("/", validate(updateProfileSchema), updateProfile);

// ─────────────────────────────────────────────
// Upload or replace my profile photo (form field "image")
// ─────────────────────────────────────────────
router.put("/avatar", uploadOneFile("image"), uploadAvatar);

export default router;
