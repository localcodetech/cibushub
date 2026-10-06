import { RefreshToken } from "../models/index.js";

export const saveRefreshToken = (data, transaction) => {
  return RefreshToken.create(data, { transaction });
};

export const findRefreshTokenByHash = (tokenHash) => {
  return RefreshToken.findOne({ where: { tokenHash } });
};

export const markRefreshTokenUsed = (token, transaction) => {
  return token.update({ usedAt: new Date() }, { transaction });
};

export const revokeTokenFamily = (familyId) => {
  return RefreshToken.update(
    { revokedAt: new Date() },
    { where: { familyId, revokedAt: null } },
  );
};

export const revokeAllUserTokens = (userId) => {
  return RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null } },
  );
};
