import sequelize from "../../../config/database.js";
import env from "../../../config/env/env.js";
import AppError from "../../../utils/AppError.js";
import {
  verifyAppleToken,
  verifyFacebookToken,
  verifyGoogleToken,
} from "../../../utils/auth/socialTokens.js";
import { TERMS_VERSION } from "../../../utils/legal.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
} from "../../../repositories/user.repository.js";
import {
  createOAuthAccount,
  findOAuthAccount,
} from "../../../repositories/oauthAccount.repository.js";
import { createSession } from "../createSession.service.js";

// Each provider: how to check its token, and whether it is set up
const PROVIDERS = {
  GOOGLE: { verify: verifyGoogleToken, isConfigured: () => Boolean(env.GOOGLE_CLIENT_ID) },
  APPLE: { verify: verifyAppleToken, isConfigured: () => Boolean(env.APPLE_SERVICE_ID) },
  FACEBOOK: {
    verify: verifyFacebookToken,
    isConfigured: () => Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
  },
};

const PROVIDER_NAMES = { GOOGLE: "Google", APPLE: "Apple", FACEBOOK: "Facebook" };

// Asks Google / Apple / Facebook "who is this?". Any problem = 401.
const checkToken = async (provider, idToken) => {
  const settings = PROVIDERS[provider];

  if (!settings.isConfigured()) {
    throw new AppError(503, "SOCIAL_LOGIN_UNAVAILABLE", "This sign-in option is not available yet");
  }

  try {
    return await settings.verify(idToken);
  } catch {
    throw new AppError(401, "INVALID_SOCIAL_TOKEN", "Sign-in failed. Please try again");
  }
};

// A brand-new CibusHub user from a Google / Apple / Facebook account. No phone and no password yet:
// they add their phone next and verify it by SMS, like everyone else.
const createSocialUser = async (provider, identity, details) => {
  // The Terms checkbox is on the sign-up page, so new accounts must start there
  if (details.acceptTerms !== true) {
    throw new AppError(
      400,
      "TERMS_NOT_ACCEPTED",
      "No account yet. Sign up first and accept the Terms and Privacy Policy",
    );
  }

  // Name: from Google or Facebook, or from the browser (Apple sends it once), or the start of the email
  let fullName = identity.fullName || details.fullName;
  if (!fullName) {
    fullName = identity.email.split("@")[0];
  }

  const role = details.role || "CUSTOMER";
  const status = role === "CUSTOMER" ? "PENDING_VERIFICATION" : "PENDING_APPROVAL";

  try {
    // Both rows or neither: never a user without its Google / Apple / Facebook link
    return await sequelize.transaction(async (transaction) => {
      const user = await createUser(
        {
          fullName: fullName.slice(0, 100),
          email: identity.email,
          phone: null,
          passwordHash: null,
          role,
          status,
          // Google / Apple / Facebook already checked this email address
          emailVerifiedAt: new Date(),
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
        },
        transaction,
      );

      await createOAuthAccount(
        {
          userId: user.id,
          provider,
          providerUserId: identity.providerUserId,
          email: identity.email,
        },
        transaction,
      );

      return user;
    });
  } catch (error) {
    // Two sign-ins at the same moment: the second one loses the race
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new AppError(409, "ACCOUNT_EXISTS", "An account with these details already exists");
    }
    throw error;
  }
};

// Their Google or Facebook picture becomes their CibusHub photo, refreshed at every such sign-in,
// unless they uploaded their own photo (that one has a Cloudinary ID and always wins)
const pictureChange = (user, identity) => {
  if (!identity.pictureUrl || user.avatarPublicId || user.avatarUrl === identity.pictureUrl) {
    return {};
  }
  return { avatarUrl: identity.pictureUrl };
};

// Sign in (or sign up) with Google, Apple or Facebook.
// details = { provider, idToken, fullName?, role?, acceptTerms? }
export const socialSignIn = async (details, device) => {
  const identity = await checkToken(details.provider, details.idToken);

  let user = null;
  let isNewUser = false;

  // 1. This Google / Apple account is already linked: that's the user
  const linkedAccount = await findOAuthAccount(details.provider, identity.providerUserId);
  if (linkedAccount) {
    user = await findUserById(linkedAccount.userId);
  }

  // From here we need an email the provider has confirmed
  if (!user && (!identity.email || !identity.emailVerified)) {
    // (A Facebook account opened with a phone number has no email at all)
    throw new AppError(
      400,
      "SOCIAL_EMAIL_UNVERIFIED",
      `Your ${PROVIDER_NAMES[details.provider]} account has no verified email. Sign up with your phone instead`,
    );
  }

  // 2. Someone already signed up with this email (with a password): link and log in
  if (!user) {
    user = await findUserByEmail(identity.email);
    if (user) {
      await createOAuthAccount({
        userId: user.id,
        provider: details.provider,
        providerUserId: identity.providerUserId,
        email: identity.email,
      });
    }
  }

  // 3. Nobody yet: create the account
  if (!user) {
    user = await createSocialUser(details.provider, identity, details);
    isNewUser = true;
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended");
  }

  // Same session as a password login: the same cookies, refresh and logout work
  const tokens = await createSession(user, device);
  await updateUser(user, { lastLoginAt: new Date(), ...pictureChange(user, identity) });

  return {
    user: await findUserById(user.id),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    isNewUser,
  };
};
