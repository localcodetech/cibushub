import { registerSchema } from "../../validators/auth/registration/register.validator.js";
import {
  resendOtpSchema,
  verifyPhoneSchema,
} from "../../validators/auth/registration/verifyPhone.validator.js";
import { loginSchema } from "../../validators/auth/session/login.validator.js";
import { forgotPasswordSchema } from "../../validators/auth/password/forgotPassword.validator.js";
import { resetPasswordSchema } from "../../validators/auth/password/resetPassword.validator.js";
import { changePasswordSchema } from "../../validators/auth/password/changePassword.validator.js";
import { socialSignInSchema } from "../../validators/auth/social/socialSignIn.validator.js";
import { addPhoneSchema } from "../../validators/auth/registration/addPhone.validator.js";
import { verifyEmailSchema } from "../../validators/auth/registration/verifyEmail.validator.js";
import { errorResponse, jsonBody, successResponse } from "../helpers.js";

const exampleUser = {
  id: "5e17c019-6dbc-43d0-8478-6a2f96e1ab6f",
  fullName: "Ama Mensah",
  email: "ama@example.com",
  phone: "+233241234567",
  role: "CUSTOMER",
  status: "ACTIVE",
  emailVerifiedAt: null,
  phoneVerifiedAt: "2026-10-06T10:01:22.000Z",
  avatarUrl: null,
  lastLoginAt: "2026-10-06T10:05:00.000Z",
  termsAcceptedAt: "2026-10-06T10:01:22.000Z",
  termsVersion: "2026-10-09",
  createdAt: "2026-10-06T10:01:22.000Z",
  updatedAt: "2026-10-06T10:05:00.000Z",
  deletedAt: null,
};

const tags = ["Auth"];
const loggedIn = [{ cookieAuth: [] }];

const validationError = errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data");
const rateLimited = errorResponse(
  "Too many attempts",
  "RATE_LIMITED",
  "Too many attempts. Please try again later",
);
const notLoggedIn = errorResponse("Not logged in", "UNAUTHENTICATED", "Please log in to continue");

export const authPaths = {
  "/api/v1/auth/register": {
    post: {
      tags,
      summary: "Register a new customer, restaurant owner or rider",
      description:
        "Texts a 6-digit verification code. acceptTerms must be true; the time and Terms version are saved. Admin roles can never be registered here.",
      requestBody: jsonBody(registerSchema, {
        fullName: "Ama Mensah",
        email: "ama@example.com",
        phone: "024 123 4567",
        password: "Kofi2026",
        role: "CUSTOMER",
        acceptTerms: true,
      }),
      responses: {
        201: successResponse("Account created", { ...exampleUser, status: "PENDING_VERIFICATION" }),
        400: validationError,
        409: errorResponse(
          "Email or phone already used",
          "ACCOUNT_EXISTS",
          "An account with these details already exists",
        ),
        429: rateLimited,
      },
    },
  },

  "/api/v1/auth/verify-phone": {
    post: {
      tags,
      summary: "Verify the phone number with the OTP code",
      requestBody: jsonBody(verifyPhoneSchema, { phone: "0241234567", code: "482913" }),
      responses: {
        200: successResponse("Phone verified", exampleUser),
        400: errorResponse(
          "Wrong or expired code",
          "OTP_INVALID",
          "Incorrect code. 4 attempts left",
        ),
        429: errorResponse(
          "Too many wrong codes",
          "OTP_ATTEMPTS_EXCEEDED",
          "Too many wrong attempts. Please request a new code",
        ),
      },
    },
  },

  "/api/v1/auth/resend-otp": {
    post: {
      tags,
      summary: "Send a new verification code",
      requestBody: jsonBody(resendOtpSchema, { phone: "0241234567" }),
      responses: {
        200: successResponse("Same reply whether or not a code was sent", {
          message: "If this number is waiting for verification, a new code has been sent",
        }),
        429: rateLimited,
      },
    },
  },

  "/api/v1/auth/login": {
    post: {
      tags,
      summary: "Log in with email or phone and password",
      description:
        "Sets HttpOnly access_token and refresh_token cookies. Tokens are never in the body.",
      requestBody: jsonBody(loginSchema, { identifier: "ama@example.com", password: "Kofi2026" }),
      responses: {
        200: successResponse("Logged in, cookies set", exampleUser),
        401: errorResponse(
          "Wrong email, phone or password",
          "INVALID_CREDENTIALS",
          "Invalid credentials",
        ),
        403: errorResponse(
          "Account suspended",
          "ACCOUNT_SUSPENDED",
          "Your account has been suspended",
        ),
        429: rateLimited,
      },
    },
  },

  "/api/v1/auth/social": {
    post: {
      tags,
      summary: "Sign in or sign up with Google or Apple",
      description:
        "Send the ID token the Google / Apple button gave the browser. A linked account logs in; an account with the same verified email is linked; otherwise a new account is created (only with acceptTerms: true), with no phone yet. Sets the same HttpOnly cookies as /login.",
      requestBody: jsonBody(socialSignInSchema, {
        provider: "GOOGLE",
        idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
        role: "CUSTOMER",
        acceptTerms: true,
      }),
      responses: {
        200: successResponse("Returning user logged in, cookies set", exampleUser),
        201: successResponse("New account created and logged in", {
          ...exampleUser,
          phone: null,
          status: "PENDING_VERIFICATION",
          phoneVerifiedAt: null,
        }),
        400: errorResponse(
          "New account without accepting the Terms",
          "TERMS_NOT_ACCEPTED",
          "No account yet. Sign up first and accept the Terms and Privacy Policy",
        ),
        401: errorResponse(
          "The token failed the signature, audience or expiry check",
          "INVALID_SOCIAL_TOKEN",
          "Sign-in failed. Please try again",
        ),
        403: errorResponse(
          "Account suspended",
          "ACCOUNT_SUSPENDED",
          "Your account has been suspended",
        ),
        503: errorResponse(
          "That provider's client ID is not set on the server",
          "SOCIAL_LOGIN_UNAVAILABLE",
          "This sign-in option is not available yet",
        ),
        429: rateLimited,
      },
    },
  },

  "/api/v1/auth/phone": {
    post: {
      tags,
      summary: "Add or fix the phone of a logged-in user who hasn't verified one",
      description:
        "Used after Google / Apple sign-in. Saves the phone and texts a code; then call /verify-phone.",
      requestBody: jsonBody(addPhoneSchema, { phone: "054 111 2222" }),
      responses: {
        200: successResponse("Phone saved, code sent", { ...exampleUser, phoneVerifiedAt: null }),
        400: validationError,
        401: errorResponse("Not logged in", "UNAUTHENTICATED", "Please log in to continue"),
        409: errorResponse(
          "Phone used by another account, or already verified (PHONE_ALREADY_VERIFIED)",
          "PHONE_TAKEN",
          "This phone number is already used by another account",
        ),
        429: rateLimited,
      },
    },
  },

  "/api/v1/auth/email/send-code": {
    post: {
      tags,
      summary: "Email a 6-digit code to my own address, to confirm it",
      description:
        "Logged in. The code lasts 15 minutes; a new one can be asked for once a minute (5 an hour). Then call /email/verify.",
      responses: {
        200: successResponse("Code sent", { email: "ama@example.com" }),
        400: errorResponse(
          "No email on the account",
          "NO_EMAIL",
          "Add an email address to your account first",
        ),
        401: errorResponse("Not logged in", "UNAUTHENTICATED", "Please log in to continue"),
        409: errorResponse(
          "Already confirmed",
          "EMAIL_ALREADY_VERIFIED",
          "Your email is already confirmed",
        ),
        429: rateLimited,
      },
    },
  },

  "/api/v1/auth/email/verify": {
    post: {
      tags,
      summary: "Confirm my email with the emailed code",
      description:
        "The right code sets emailVerifiedAt. Wrong codes count like every code (5 tries).",
      requestBody: jsonBody(verifyEmailSchema, { code: "482913" }),
      responses: {
        200: successResponse("Email confirmed", {
          ...exampleUser,
          emailVerifiedAt: "2026-10-11T12:00:00.000Z",
        }),
        400: errorResponse(
          "Wrong or expired code",
          "OTP_INVALID",
          "Incorrect code. 4 attempts left",
        ),
        401: errorResponse("Not logged in", "UNAUTHENTICATED", "Please log in to continue"),
        409: errorResponse(
          "Already confirmed",
          "EMAIL_ALREADY_VERIFIED",
          "Your email is already confirmed",
        ),
        429: rateLimited,
      },
    },
  },

  "/api/v1/auth/refresh": {
    post: {
      tags,
      summary: "Swap the refresh cookie for new tokens",
      description: "Uses the refresh_token cookie. Reusing an old refresh token ends that session.",
      responses: {
        200: successResponse("New cookies set", exampleUser),
        401: errorResponse(
          "Session ended",
          "UNAUTHENTICATED",
          "Your session has ended. Please log in again",
        ),
      },
    },
  },

  "/api/v1/auth/logout": {
    post: {
      tags,
      summary: "Log out this device",
      responses: {
        200: successResponse("Always succeeds", { message: "You have been logged out" }),
      },
    },
  },

  "/api/v1/auth/me": {
    get: {
      tags,
      summary: "Get the logged-in user's profile",
      security: loggedIn,
      responses: {
        200: successResponse("The logged-in user", exampleUser),
        401: notLoggedIn,
        403: errorResponse(
          "Account suspended",
          "ACCOUNT_SUSPENDED",
          "Your account has been suspended",
        ),
      },
    },
  },

  "/api/v1/auth/forgot-password": {
    post: {
      tags,
      summary: "Text a password reset code",
      description: "Same reply whether or not the account exists. The code lasts 15 minutes.",
      requestBody: jsonBody(forgotPasswordSchema, { identifier: "ama@example.com" }),
      responses: {
        200: successResponse("Same reply for every request", {
          message: "If an account matches, a password reset code has been sent to its phone number",
        }),
        429: rateLimited,
      },
    },
  },

  "/api/v1/auth/reset-password": {
    post: {
      tags,
      summary: "Reset the password with the code",
      description: "Logs out every device and texts a 'password changed' notice.",
      requestBody: jsonBody(resetPasswordSchema, {
        identifier: "ama@example.com",
        code: "482913",
        newPassword: "NewPass1",
      }),
      responses: {
        200: successResponse("Password reset", {
          message: "Your password has been reset. Please log in with your new password",
        }),
        400: validationError,
        429: rateLimited,
      },
    },
  },

  "/api/v1/auth/change-password": {
    post: {
      tags,
      summary: "Change the password while logged in",
      description: "Keeps this device logged in and logs out every other device.",
      security: loggedIn,
      requestBody: jsonBody(changePasswordSchema, {
        currentPassword: "Kofi2026",
        newPassword: "NewPass1",
      }),
      responses: {
        200: successResponse("Password changed", {
          message: "Your password has been changed. Other devices have been logged out",
        }),
        400: validationError,
        401: notLoggedIn,
      },
    },
  },
};
