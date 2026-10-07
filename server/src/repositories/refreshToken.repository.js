import { Op } from "sequelize";
import { RefreshToken } from "../models/index.js";

export const saveRefreshToken = (data, transaction) => {
  return RefreshToken.create(data, { transaction });
};

export const findRefreshTokenByHash = (tokenHash) => {
  return RefreshToken.findOne({ where: { tokenHash } });
};

export const markRefreshTokenUsed = async (tokenId, transaction) => {
  const [rowsChanged] = await RefreshToken.update(
    { usedAt: new Date() },
    { where: { id: tokenId, usedAt: null }, transaction },
  );

  return rowsChanged === 1;
};

export const findLiveTokensNewestFirst = (userId) => {
  return RefreshToken.findAll({
    where: {
      userId,
      usedAt: null,
      revokedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "DESC"]],
  });
};

export const revokeTokenFamily = (familyId) => {
  return RefreshToken.update({ revokedAt: new Date() }, { where: { familyId, revokedAt: null } });
};

export const revokeAllUserTokens = (userId) => {
  return RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null } });
};

// Login sessions that ended (expired) before a moment can never be used again [AC-JOB-02]
export const deleteExpiredTokens = (expiredBefore) => {
  return RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: expiredBefore } } });
};
