import { randomUUID } from "node:crypto";
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_LIFETIME_SECONDS,
  signAccessToken,
} from "../../utils/auth/tokens.js";
import { saveRefreshToken } from "../../repositories/refreshToken.repository.js";

export const createSession = async (user, device, familyId = randomUUID()) => {
  const refreshToken = generateRefreshToken();

  await saveRefreshToken({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_SECONDS * 1000),
    userAgent: device.userAgent ? device.userAgent.slice(0, 255) : null,
    ipAddress: device.ipAddress || null,
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
  };
};
