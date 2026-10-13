import AppError from "../../../utils/AppError.js";
import { findUserByPhone, updateUser } from "../../../repositories/user.repository.js";
import { sendOtp, verifyOtp } from "../otp.service.js";
import { sendWelcome } from "../../notifications/welcome.service.js";

export const verifyPhone = async (phone, code) => {
  await verifyOtp(phone, code);

  const user = await findUserByPhone(phone);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "Account not found");
  }

  const isFirstVerification = !user.phoneVerifiedAt;
  const changes = { phoneVerifiedAt: new Date() };

  if (user.status === "PENDING_VERIFICATION") {
    changes.status = "ACTIVE";
  }

  const updated = await updateUser(user, changes);

  // The account now really exists: welcome them, by text and email (only the first time)
  if (isFirstVerification) {
    await sendWelcome(updated);
  }

  return updated;
};

export const resendVerificationOtp = async (phone) => {
  const user = await findUserByPhone(phone);

  if (!user || user.phoneVerifiedAt) {
    return;
  }

  await sendOtp(phone);
};
