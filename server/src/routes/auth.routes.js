import { Router } from "express";
import validate from "../middlewares/validate.js";
import { registerSchema } from "../validators/auth/register.validator.js";
import { resendOtpSchema, verifyPhoneSchema } from "../validators/auth/verifyPhone.validator.js";
import { register } from "../controllers/auth/register.controller.js";
import { resendOtp, verifyPhoneNumber } from "../controllers/auth/verifyPhone.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify-phone", validate(verifyPhoneSchema), verifyPhoneNumber);
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);

export default router;
