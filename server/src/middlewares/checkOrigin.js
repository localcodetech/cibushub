import env from "../config/env/env.js";
import AppError from "../utils/AppError.js";

const READ_ONLY_METHODS = ["GET", "HEAD", "OPTIONS"];

const checkOrigin = (req, res, next) => {
  if (READ_ONLY_METHODS.includes(req.method)) {
    return next();
  }

  const origin = req.get("origin");

  if (!origin) {
    return next();
  }

  const apiOwnOrigin = `${req.protocol}://${req.get("host")}`;
  const allowedOrigins = [env.CLIENT_URL, apiOwnOrigin];

  if (!allowedOrigins.includes(origin)) {
    throw new AppError(403, "FORBIDDEN", "This request came from a website that is not allowed");
  }

  next();
};

export default checkOrigin;
