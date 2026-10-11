import AppError from "../../../utils/AppError.js";
import { findUserById, updateUser } from "../../../repositories/user.repository.js";
import { sendOtp, verifyOtp } from "../otp.service.js";

// Proving the account's email works [AC-AUTH-01]. The phone is checked at sign-up; the email
// is checked after the first login with a 6-digit code sent to it. Not checking it blocks
// nothing: the phone stays the proven contact (password reset codes go to the phone).

const checkNeeded = (user) => {
  if (!user.email) {
    throw new AppError(400, "NO_EMAIL", "Add an email address to your account first");
  }
  if (user.emailVerifiedAt) {
    throw new AppError(409, "EMAIL_ALREADY_VERIFIED", "Your email is already confirmed");
  }
};

// Emails a code (at most one a minute, 5 an hour, like every code)
export const sendEmailVerificationCode = async (userId) => {
  const user = await findUserById(userId);
  checkNeeded(user);

  await sendOtp(user.email, "verifyEmail");

  return { email: user.email };
};

// The right code: the email is confirmed
export const verifyEmail = async (userId, code) => {
  const user = await findUserById(userId);
  checkNeeded(user);

  await verifyOtp(user.email, code, "verifyEmail");

  // A working code also proves an earlier bounce is fixed
  return await updateUser(user, { emailVerifiedAt: new Date(), emailBouncedAt: null });
};
