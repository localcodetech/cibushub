import AppError from "../../../utils/AppError.js";
import { verifyPassword } from "../../../utils/auth/password.js";
import {
  findUserById,
  findUserForLogin,
  updateUser,
} from "../../../repositories/user.repository.js";
import { createSession } from "../createSession.service.js";

const DUMMY_PASSWORD_HASH = "$2b$12$OUOm2EihBmFu5FN.MEVdaOp3U9QRmi9SWFMXaLzXHEXxf/dd3rGfK";

export const loginUser = async (identifier, password, device) => {
  const user = await findUserForLogin(identifier);

  // No account, or a Google / Apple account with no password yet: same answer as a wrong password
  if (!user || !user.passwordHash) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  const passwordIsCorrect = await verifyPassword(password, user.passwordHash);
  if (!passwordIsCorrect) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended");
  }

  const tokens = await createSession(user, device);

  await updateUser(user, { lastLoginAt: new Date() });

  return {
    user: await findUserById(user.id),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};
