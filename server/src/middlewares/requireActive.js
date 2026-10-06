import AppError from "../utils/AppError.js";

const requireActive = (req, res, next) => {
  const status = req.user.status;

  if (status === "PENDING_VERIFICATION") {
    throw new AppError(403, "ACCOUNT_NOT_VERIFIED", "Please verify your phone number first");
  }

  if (status === "PENDING_APPROVAL") {
    throw new AppError(
      403,
      "ACCOUNT_PENDING_APPROVAL",
      "Your account is waiting for admin approval",
    );
  }

  if (status !== "ACTIVE") {
    throw new AppError(403, "FORBIDDEN", "Your account cannot do this right now");
  }

  next();
};

export default requireActive;
