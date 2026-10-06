import AppError from "../../../utils/AppError.js";
import { hashPassword } from "../../../utils/auth/password.js";
import { findUserByEmailOrPhone, updateUser } from "../../../repositories/user.repository.js";
import { revokeAllUserTokens } from "../../../repositories/refreshToken.repository.js";
import { verifyOtp } from "../otp.service.js";
import { notifyPasswordChanged } from "../../notifications/passwordChanged.service.js";

export const resetPassword = async (identifier, code, newPassword) => {
  const user = await findUserByEmailOrPhone(identifier, identifier);

  if (!user) {
    throw new AppError(400, "OTP_EXPIRED", "This code has expired. Please request a new code");
  }

  await verifyOtp(user.phone, code, "reset");

  const passwordHash = await hashPassword(newPassword);
  await updateUser(user, { passwordHash });

  await revokeAllUserTokens(user.id);

  await notifyPasswordChanged(user);
};
