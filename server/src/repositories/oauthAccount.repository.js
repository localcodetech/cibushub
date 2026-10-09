import { OAuthAccount } from "../models/index.js";

// The CibusHub link for one Google / Apple person, or null
export const findOAuthAccount = (provider, providerUserId) => {
  return OAuthAccount.findOne({ where: { provider, providerUserId } });
};

export const createOAuthAccount = (data, transaction) => {
  return OAuthAccount.create(data, { transaction });
};
