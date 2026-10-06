import AppError from "../utils/AppError.js";

// For onboarding routes: lets in users still waiting for approval, as long as their phone is verified
const ONBOARDING_STATUSES = ["ACTIVE", "PENDING_APPROVAL"];

const requireVerifiedPhone = (req, res, next) => {
  if (!req.user.phoneVerifiedAt) {
    throw new AppError(403, "ACCOUNT_NOT_VERIFIED", "Please verify your phone number first");
  }

  if (!ONBOARDING_STATUSES.includes(req.user.status)) {
    throw new AppError(403, "FORBIDDEN", "Your account cannot do this right now");
  }

  next();
};

export default requireVerifiedPhone;
