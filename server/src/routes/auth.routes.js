import { Router } from "express";
import validate from "../middlewares/validate.js";
import { registerSchema } from "../validators/auth/register.validator.js";
import { resendOtpSchema, verifyPhoneSchema } from "../validators/auth/verifyPhone.validator.js";
import { loginSchema } from "../validators/auth/login.validator.js";
import { register } from "../controllers/auth/register.controller.js";
import { resendOtp, verifyPhoneNumber } from "../controllers/auth/verifyPhone.controller.js";
import { login } from "../controllers/auth/login.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify-phone", validate(verifyPhoneSchema), verifyPhoneNumber);
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);
router.post("/login", validate(loginSchema), login);

export default router;
