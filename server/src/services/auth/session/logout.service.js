import { hashRefreshToken } from "../../../utils/auth/tokens.js";
import {
  findRefreshTokenByHash,
  revokeTokenFamily,
} from "../../../repositories/refreshToken.repository.js";

export const logoutSession = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    return;
  }

  const savedToken = await findRefreshTokenByHash(hashRefreshToken(rawRefreshToken));

  if (!savedToken) {
    return;
  }

  await revokeTokenFamily(savedToken.familyId);
};
