import AppError from "../../utils/AppError.js";
import { hashRefreshToken } from "../../utils/tokens.js";
import { findUserById } from "../../repositories/user.repository.js";
import {
  findRefreshTokenByHash,
  markRefreshTokenUsed,
  revokeAllUserTokens,
  revokeTokenFamily,
} from "../../repositories/refreshToken.repository.js";
import { createSession } from "./session.service.js";

const sessionEnded = () => {
  return new AppError(401, "UNAUTHENTICATED", "Your session has ended. Please log in again");
};

export const refreshSession = async (rawRefreshToken, device) => {
  if (!rawRefreshToken) {
    throw sessionEnded();
  }

  const savedToken = await findRefreshTokenByHash(hashRefreshToken(rawRefreshToken));

  if (!savedToken || savedToken.revokedAt) {
    throw sessionEnded();
  }

  if (savedToken.expiresAt < new Date()) {
    throw sessionEnded();
  }

  const weMarkedItUsed = await markRefreshTokenUsed(savedToken.id);

  if (!weMarkedItUsed) {
    await revokeTokenFamily(savedToken.familyId);
    throw sessionEnded();
  }

  const user = await findUserById(savedToken.userId);

  if (!user) {
    throw sessionEnded();
  }

  if (user.status === "SUSPENDED") {
    await revokeAllUserTokens(user.id);
    throw new AppError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended");
  }

  const tokens = await createSession(user, device, savedToken.familyId);

  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};
