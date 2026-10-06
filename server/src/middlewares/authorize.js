import AppError from "../utils/AppError.js";

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to do this");
    }

    next();
  };
};

export default authorize;
