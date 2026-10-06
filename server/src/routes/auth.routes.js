import { Router } from "express";
import validate from "../middlewares/validate.js";
import {
  registerSchema,
  resendOtpSchema,
  verifyPhoneSchema,
} from "../validators/auth.validator.js";
import { register, resendOtp, verifyPhoneNumber } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify-phone", validate(verifyPhoneSchema), verifyPhoneNumber);
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);

export default router;
