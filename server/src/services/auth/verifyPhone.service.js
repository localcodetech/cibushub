import AppError from "../../utils/AppError.js";
import { findUserByPhone, updateUser } from "../../repositories/user.repository.js";
import { sendOtp, verifyOtp } from "../otp.service.js";

export const verifyPhone = async (phone, code) => {
  await verifyOtp(phone, code);

  const user = await findUserByPhone(phone);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "Account not found");
  }

  const changes = { phoneVerifiedAt: new Date() };

  if (user.status === "PENDING_VERIFICATION") {
    changes.status = "ACTIVE";
  }

  return await updateUser(user, changes);
};

export const resendVerificationOtp = async (phone) => {
  const user = await findUserByPhone(phone);

  if (!user || user.phoneVerifiedAt) {
    return;
  }

  await sendOtp(phone);
};
