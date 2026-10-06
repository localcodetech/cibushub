import { Router } from "express";
import validate from "../middlewares/validate.js";
import { registerSchema } from "../validators/auth/register.validator.js";
import { resendOtpSchema, verifyPhoneSchema } from "../validators/auth/verifyPhone.validator.js";
import { loginSchema } from "../validators/auth/login.validator.js";
import { register } from "../controllers/auth/register.controller.js";
import { resendOtp, verifyPhoneNumber } from "../controllers/auth/verifyPhone.controller.js";
import { login } from "../controllers/auth/login.controller.js";

const router = Router();

// Register a new customer, restaurant owner or rider
router.post("/register", validate(registerSchema), register);




// Verify phone number with the OTP code
router.post("/verify-phone", validate(verifyPhoneSchema), verifyPhoneNumber);




// Send a new OTP code
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);




// Log in with email or phone and password
router.post("/login", validate(loginSchema), login);

export default router;
