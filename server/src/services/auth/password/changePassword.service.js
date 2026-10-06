import AppError from "../../../utils/AppError.js";
import { hashPassword, verifyPassword } from "../../../utils/auth/password.js";
import { findUserByIdWithPassword, updateUser } from "../../../repositories/user.repository.js";
import { revokeAllUserTokens } from "../../../repositories/refreshToken.repository.js";
import { createSession } from "../createSession.service.js";
import { notifyPasswordChanged } from "../../notifications/passwordChanged.service.js";

export const changePassword = async (userId, currentPassword, newPassword, device) => {
  const user = await findUserByIdWithPassword(userId);

  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please log in to continue");
  }

  const currentIsCorrect = await verifyPassword(currentPassword, user.passwordHash);

  if (!currentIsCorrect) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
      { field: "currentPassword", message: "Current password is incorrect" },
    ]);
  }

  const passwordHash = await hashPassword(newPassword);
  await updateUser(user, { passwordHash });

  await revokeAllUserTokens(user.id);

  const tokens = await createSession(user, device);

  await notifyPasswordChanged(user);

  return tokens;
};
