import {
  updatePreferencesSchema,
  updateProfileSchema,
} from "../../validators/profile/profile.validator.js";
import {
  changeEmailSchema,
  changePhoneSchema,
  confirmChangeSchema,
} from "../../validators/profile/changeContact.validator.js";
import { errorResponse, fileBody, jsonBody, successResponse } from "../helpers.js";

const exampleUser = {
  id: "5e17c019-6dbc-43d0-8478-6a2f96e1ab6f",
  fullName: "Ama Serwaa Mensah",
  email: "ama@example.com",
  phone: "+233241234567",
  role: "CUSTOMER",
  status: "ACTIVE",
  emailVerifiedAt: null,
  phoneVerifiedAt: "2026-10-06T10:01:22.000Z",
  avatarUrl: null,
  avatarPublicId: null,
  lastLoginAt: "2026-10-07T10:05:00.000Z",
  createdAt: "2026-10-06T10:01:22.000Z",
  updatedAt: "2026-10-07T10:05:00.000Z",
  deletedAt: null,
};

const tags = ["Profile"];
const loggedIn = [{ cookieAuth: [] }];

const notLoggedIn = errorResponse("Not logged in", "UNAUTHENTICATED", "Please log in to continue");
const validationError = errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data");
const alreadyUsed = errorResponse(
  "Used by another account",
  "ACCOUNT_EXISTS",
  "An account with these details already exists",
);
const wrongCode = errorResponse("Wrong code", "OTP_INVALID", "Incorrect code. 4 attempts left");
const tooMany = errorResponse(
  "Too many requests",
  "RATE_LIMITED",
  "Please wait 45 seconds before requesting a new code",
);

const notVerified = errorResponse(
  "Phone not verified",
  "ACCOUNT_NOT_VERIFIED",
  "Please verify your phone number first",
);

export const profilePaths = {
  "/api/v1/profile/preferences": {
    patch: {
      tags,
      summary: "Yes or no to offers and news",
      description:
        "Off by default. Only messages with a marketing.* template follow this switch; codes, receipts and order updates are always sent [AC-NOTIF-09]. marketingOptInChangedAt records when the choice was made.",
      requestBody: jsonBody(updatePreferencesSchema, { marketingOptIn: true }),
      responses: {
        200: successResponse("Saved", {
          ...exampleUser,
          marketingOptIn: true,
          marketingOptInChangedAt: "2026-10-11T12:00:00.000Z",
        }),
        400: errorResponse("Not a yes or no", "VALIDATION_ERROR", "Invalid request data"),
        401: errorResponse("Not logged in", "UNAUTHENTICATED", "Please log in to continue"),
      },
    },
  },
  "/api/v1/profile": {
    patch: {
      tags,
      summary: "Change my name",
      description:
        "Any logged-in role. View your profile with GET /api/v1/auth/me. Phone and email cannot be changed here: they need a verification code.",
      security: loggedIn,
      requestBody: jsonBody(updateProfileSchema, { fullName: "Ama Serwaa Mensah" }),
      responses: {
        200: successResponse("Saved", exampleUser),
        400: errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data"),
        401: notLoggedIn,
        403: notVerified,
      },
    },
  },

  "/api/v1/profile/avatar": {
    put: {
      tags,
      summary: "Upload or replace my profile photo",
      description: "JPEG, PNG or WebP, at most 5 MB. Saved as WebP. The old photo is deleted.",
      security: loggedIn,
      requestBody: fileBody("image", "The photo"),
      responses: {
        200: successResponse("Saved", {
          ...exampleUser,
          avatarUrl: "https://res.cloudinary.com/demo/image/upload/cibushub/avatars/abc.webp",
          avatarPublicId: "cibushub/avatars/abc",
        }),
        400: errorResponse(
          "Wrong file type, over 5 MB, or no file",
          "UNSUPPORTED_FILE_TYPE",
          "Only these file types are allowed: image/jpeg, image/png, image/webp",
        ),
        401: notLoggedIn,
      },
    },
  },

  "/api/v1/profile/phone": {
    post: {
      tags,
      summary: "Step 1 of changing my phone: text a code to the new number",
      description:
        "Nothing changes on the account yet. The request is remembered for 15 minutes; the code itself expires after 5.",
      security: loggedIn,
      requestBody: jsonBody(changePhoneSchema, { phone: "020 999 8888" }),
      responses: {
        200: successResponse("Code sent", { phone: "+233209998888" }),
        400: validationError,
        409: alreadyUsed,
        429: tooMany,
      },
    },
  },

  "/api/v1/profile/phone/confirm": {
    post: {
      tags,
      summary: "Step 2 of changing my phone: confirm with the code",
      description:
        "The new number is saved and marked verified. The old number gets a warning SMS.",
      security: loggedIn,
      requestBody: jsonBody(confirmChangeSchema, { code: "123456" }),
      responses: {
        200: successResponse("Phone changed", { ...exampleUser, phone: "+233209998888" }),
        400: wrongCode,
        409: alreadyUsed,
        429: tooMany,
      },
    },
  },

  "/api/v1/profile/email": {
    post: {
      tags,
      summary: "Step 1 of changing my email: email a code to the new address",
      description: "Nothing changes on the account yet. The code expires after 15 minutes.",
      security: loggedIn,
      requestBody: jsonBody(changeEmailSchema, { email: "ama.new@example.com" }),
      responses: {
        200: successResponse("Code sent", { email: "ama.new@example.com" }),
        400: validationError,
        409: alreadyUsed,
        429: tooMany,
      },
    },
  },

  "/api/v1/profile/email/confirm": {
    post: {
      tags,
      summary: "Step 2 of changing my email: confirm with the code",
      description: "The new email is saved and marked verified. The old email gets a warning.",
      security: loggedIn,
      requestBody: jsonBody(confirmChangeSchema, { code: "123456" }),
      responses: {
        200: successResponse("Email changed", {
          ...exampleUser,
          email: "ama.new@example.com",
          emailVerifiedAt: "2026-10-08T09:00:00.000Z",
        }),
        400: wrongCode,
        409: alreadyUsed,
        429: tooMany,
      },
    },
  },
};
