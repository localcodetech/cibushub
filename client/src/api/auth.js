import { api } from "@/lib/api";

// Every call to the backend's /auth endpoints lives here.
// Pages call these functions; they never write the URL themselves.

// identifier is an email or a Ghana phone number. The server sets the login cookies.
// Returns the logged-in user: { id, fullName, role, status, ... }
export const loginRequest = async (identifier, password) => {
  const result = await api.post("/auth/login", { identifier, password });
  return result.data;
};

// Who is logged in right now? If the 15-minute cookie ran out, lib/api.js renews it first.
export const getMeRequest = async () => {
  const result = await api.get("/auth/me");
  return result.data;
};

// Ends the session: the server cancels the refresh token and clears both cookies [AC-AUTH-16]
export const logoutRequest = async () => {
  await api.post("/auth/logout");
};

// Creates an account and texts a 6-digit code to the phone [AC-AUTH-01, AC-AUTH-05].
// details = { fullName, email, phone, password, role, acceptTerms }. No login cookies yet:
// the user verifies their phone first. Returns the new user.
export const registerRequest = async (details) => {
  const result = await api.post("/auth/register", details);
  return result.data;
};

// Checks the 6-digit code. If it is right, the phone is marked verified.
// Returns the updated user (a customer becomes ACTIVE).
export const verifyPhoneRequest = async (phone, code) => {
  const result = await api.post("/auth/verify-phone", { phone, code });
  return result.data;
};

// Texts a new code. The server allows one every 60 seconds.
export const resendOtpRequest = async (phone) => {
  await api.post("/auth/resend-otp", { phone });
};

// Texts a password reset code if the account exists.
// The answer is the same either way, so no one can test which accounts exist [AC-AUTH-18]
export const forgotPasswordRequest = async (identifier) => {
  await api.post("/auth/forgot-password", { identifier });
};

// Sets the new password with the code. The server then logs out every device [AC-AUTH-19]
export const resetPasswordRequest = async (identifier, code, newPassword) => {
  await api.post("/auth/reset-password", { identifier, code, newPassword });
};

// Signs in (or up) with the ID token from the Google / Apple button. Sets the login cookies.
// details = { provider: "GOOGLE" | "APPLE", idToken, fullName?, role?, acceptTerms? }
export const socialSignInRequest = async (details) => {
  const result = await api.post("/auth/social", details);
  return result.data;
};

// Emails a 6-digit code to my own address, to confirm it [AC-AUTH-01]. Returns { email }.
export const sendEmailCodeRequest = async () => {
  const result = await api.post("/auth/email/send-code");
  return result.data;
};

// The right code confirms the email. Returns the updated user (emailVerifiedAt is set).
export const verifyEmailRequest = async (code) => {
  const result = await api.post("/auth/email/verify", { code });
  return result.data;
};

// Saves the phone of a logged-in user who hasn't verified one, and texts a code.
// Returns the updated user.
export const addPhoneRequest = async (phone) => {
  const result = await api.post("/auth/phone", { phone });
  return result.data;
};

// The current password proves it's really me. This device stays logged in (new cookies);
// every other device is logged out [AC-AUTH-20].
export const changePasswordRequest = async (currentPassword, newPassword) => {
  const result = await api.post("/auth/change-password", { currentPassword, newPassword });
  return result.data;
};

// Delete my account and personal data [AC-CUST-11]. confirmText must be "DELETE";
// password is left out only by a Google / Apple account that never set one.
// The server logs this browser out (clears the cookies).
export const deleteAccountRequest = async (password, confirmText) => {
  const body = { confirmText };
  if (password) body.password = password;
  const result = await api.post("/auth/delete-account", body);
  return result.data;
};
