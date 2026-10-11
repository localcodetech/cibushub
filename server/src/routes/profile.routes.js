import { Router } from "express";
import validate from "../middlewares/validate.js";
import uploadOneFile from "../middlewares/upload.js";
import { otpLimiter } from "../middlewares/rateLimit/authLimiters.js";
import {
  updatePreferencesSchema,
  updateProfileSchema,
} from "../validators/profile/profile.validator.js";
import {
  changeEmailSchema,
  changePhoneSchema,
  confirmChangeSchema,
} from "../validators/profile/changeContact.validator.js";
import {
  updatePreferences,
  updateProfile,
  uploadAvatar,
} from "../controllers/profile/profile.controller.js";
import {
  finishEmailChange,
  finishPhoneChange,
  startEmailChange,
  startPhoneChange,
} from "../controllers/profile/changeContact.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Change my name (view it with GET /auth/me)
// ─────────────────────────────────────────────
router.patch("/", validate(updateProfileSchema), updateProfile);

// ─────────────────────────────────────────────
// Upload or replace my profile photo (form field "image")
// ─────────────────────────────────────────────
router.put("/avatar", uploadOneFile("image"), uploadAvatar);

// ─────────────────────────────────────────────
// My notification settings: yes or no to offers and news [AC-NOTIF-09]
// ─────────────────────────────────────────────
router.patch("/preferences", validate(updatePreferencesSchema), updatePreferences);

// ─────────────────────────────────────────────
// Change my phone: 1) text a code to the new number, 2) confirm with that code
// ─────────────────────────────────────────────
router.post("/phone", validate(changePhoneSchema), otpLimiter, startPhoneChange);
router.post("/phone/confirm", validate(confirmChangeSchema), otpLimiter, finishPhoneChange);

// ─────────────────────────────────────────────
// Change my email: 1) email a code to the new address, 2) confirm with that code
// ─────────────────────────────────────────────
router.post("/email", validate(changeEmailSchema), otpLimiter, startEmailChange);
router.post("/email/confirm", validate(confirmChangeSchema), otpLimiter, finishEmailChange);

export default router;
