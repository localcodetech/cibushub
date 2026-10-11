import redis from "../../config/redis.js";
import AppError from "../../utils/AppError.js";
import { sendOtp, verifyOtp } from "../auth/otp.service.js";
import {
  findUserByEmail,
  findUserById,
  findUserByPhone,
  updateUser,
} from "../../repositories/user.repository.js";
import { notify } from "../notifications/notify.service.js";

// How long the new phone/email waits for its code before the request is forgotten
const PENDING_SECONDS = 15 * 60;

const pendingKey = (kind, userId) => `profile:pending-${kind}:${userId}`;

const alreadyUsed = () => {
  return new AppError(409, "ACCOUNT_EXISTS", "An account with these details already exists");
};

// ─────────────────────────────────────────────
// Phone [AC-CUST-02]
// ─────────────────────────────────────────────

// Step 1: remember the new number and text it a code. Nothing changes on the account yet.
export const requestPhoneChange = async (userId, newPhone) => {
  const user = await findUserById(userId);

  if (newPhone === user.phone) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
      { field: "phone", message: "This is already your phone number" },
    ]);
  }

  if (await findUserByPhone(newPhone)) {
    throw alreadyUsed();
  }

  await sendOtp(newPhone, "changePhone");
  await redis.set(pendingKey("phone", userId), newPhone, "EX", PENDING_SECONDS);

  return { phone: newPhone };
};

// Step 2: the right code proves the user owns the new number, so it is saved now
export const confirmPhoneChange = async (userId, code) => {
  const newPhone = await redis.get(pendingKey("phone", userId));

  if (!newPhone) {
    throw new AppError(400, "OTP_EXPIRED", "This code has expired. Please request a new code");
  }

  await verifyOtp(newPhone, code, "changePhone");

  const user = await findUserById(userId);
  const oldPhone = user.phone;

  try {
    await updateUser(user, { phone: newPhone, phoneVerifiedAt: new Date() });
  } catch (error) {
    // Someone else took the number while the code was on its way
    if (error.name === "SequelizeUniqueConstraintError") {
      throw alreadyUsed();
    }
    throw error;
  }

  await redis.del(pendingKey("phone", userId));

  // Warn the old number, in case this was not the real owner
  await notify({
    channel: "SMS",
    to: oldPhone,
    template: "account.phone-changed",
    text: "Your CibusHub phone number was just changed. If this was not you, contact support now.",
  });

  return user;
};

// ─────────────────────────────────────────────
// Email [AC-CUST-02]
// ─────────────────────────────────────────────

export const requestEmailChange = async (userId, newEmail) => {
  const user = await findUserById(userId);

  if (newEmail === user.email) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
      { field: "email", message: "This is already your email" },
    ]);
  }

  if (await findUserByEmail(newEmail)) {
    throw alreadyUsed();
  }

  await sendOtp(newEmail, "changeEmail");
  await redis.set(pendingKey("email", userId), newEmail, "EX", PENDING_SECONDS);

  return { email: newEmail };
};

export const confirmEmailChange = async (userId, code) => {
  const newEmail = await redis.get(pendingKey("email", userId));

  if (!newEmail) {
    throw new AppError(400, "OTP_EXPIRED", "This code has expired. Please request a new code");
  }

  await verifyOtp(newEmail, code, "changeEmail");

  const user = await findUserById(userId);
  const oldEmail = user.email;

  try {
    await updateUser(user, { email: newEmail, emailVerifiedAt: new Date() });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      throw alreadyUsed();
    }
    throw error;
  }

  await redis.del(pendingKey("email", userId));

  await notify({
    channel: "EMAIL",
    to: oldEmail,
    template: "account.email-changed",
    subject: "Your CibusHub email was changed",
    text: `Your CibusHub email was just changed to ${newEmail}. If this was not you, contact support now.`,
  });

  return user;
};
