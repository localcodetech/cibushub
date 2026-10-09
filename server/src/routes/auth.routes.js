import { Router } from "express";
import validate from "../middlewares/validate.js";
import authenticate from "../middlewares/authenticate.js";
import {
  loginAccountLimiter,
  loginIpLimiter,
  otpLimiter,
  registerLimiter,
} from "../middlewares/rateLimit/authLimiters.js";
import { registerSchema } from "../validators/auth/registration/register.validator.js";
import {
  resendOtpSchema,
  verifyPhoneSchema,
} from "../validators/auth/registration/verifyPhone.validator.js";
import { loginSchema } from "../validators/auth/session/login.validator.js";
import { forgotPasswordSchema } from "../validators/auth/password/forgotPassword.validator.js";
import { resetPasswordSchema } from "../validators/auth/password/resetPassword.validator.js";
import { changePasswordSchema } from "../validators/auth/password/changePassword.validator.js";
import { socialSignInSchema } from "../validators/auth/social/socialSignIn.validator.js";
import { addPhoneSchema } from "../validators/auth/registration/addPhone.validator.js";
import { register } from "../controllers/auth/registration/register.controller.js";
import {
  resendOtp,
  verifyPhoneNumber,
} from "../controllers/auth/registration/verifyPhone.controller.js";
import { login } from "../controllers/auth/session/login.controller.js";
import { refresh } from "../controllers/auth/session/refresh.controller.js";
import { logout } from "../controllers/auth/session/logout.controller.js";
import { getMe } from "../controllers/auth/session/me.controller.js";
import { forgotPassword } from "../controllers/auth/password/forgotPassword.controller.js";
import { resetPassword } from "../controllers/auth/password/resetPassword.controller.js";
import { changePassword } from "../controllers/auth/password/changePassword.controller.js";
import { socialSignIn } from "../controllers/auth/social/socialSignIn.controller.js";
import { addPhone } from "../controllers/auth/registration/addPhone.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Register a new customer, restaurant owner or rider
// ─────────────────────────────────────────────
router.post("/register", validate(registerSchema), registerLimiter, register);

// ─────────────────────────────────────────────
// Verify phone number with the OTP code
// ─────────────────────────────────────────────
router.post("/verify-phone", validate(verifyPhoneSchema), otpLimiter, verifyPhoneNumber);

// ─────────────────────────────────────────────
// Send a new OTP code
// ─────────────────────────────────────────────
router.post("/resend-otp", validate(resendOtpSchema), otpLimiter, resendOtp);

// ─────────────────────────────────────────────
// Log in with email or phone and password
// ─────────────────────────────────────────────
router.post("/login", validate(loginSchema), loginIpLimiter, loginAccountLimiter, login);

// ─────────────────────────────────────────────
// Sign in or sign up with a Google / Apple ID token
// ─────────────────────────────────────────────
router.post("/social", validate(socialSignInSchema), loginIpLimiter, socialSignIn);

// ─────────────────────────────────────────────
// Add (or fix) the phone number of a logged-in user who hasn't verified one, and text a code
// ─────────────────────────────────────────────
router.post("/phone", authenticate, validate(addPhoneSchema), otpLimiter, addPhone);

// ─────────────────────────────────────────────
// Swap the refresh cookie for a new pair of tokens
// ─────────────────────────────────────────────
router.post("/refresh", refresh);

// ─────────────────────────────────────────────
// Log out this device: cancel its session and clear cookies
// ─────────────────────────────────────────────
router.post("/logout", logout);

// ─────────────────────────────────────────────
// Get the logged-in user's profile
// ─────────────────────────────────────────────
router.get("/me", authenticate, getMe);

// ─────────────────────────────────────────────
// Forgot password: text a reset code (same reply whether or not the account exists)
// ─────────────────────────────────────────────
router.post("/forgot-password", validate(forgotPasswordSchema), otpLimiter, forgotPassword);

// ─────────────────────────────────────────────
// Reset password with the code, then log out every device
// ─────────────────────────────────────────────
router.post("/reset-password", validate(resetPasswordSchema), otpLimiter, resetPassword);

// ─────────────────────────────────────────────
// Change password while logged in (keeps this device logged in)
// ─────────────────────────────────────────────
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);

export default router;
