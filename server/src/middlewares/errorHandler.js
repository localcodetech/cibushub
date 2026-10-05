import AppError from "../utils/AppError.js";
import env from "../config/env/env.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err.type === "entity.parse.failed") {
    error = new AppError(400, "INVALID_JSON", "Request body is not valid JSON");
  } else if (err.type === "entity.too.large") {
    error = new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  if (!(error instanceof AppError)) {
    req.log.error({ err }, "Unhandled error");

    const message = env.NODE_ENV === "production" ? "Something went wrong" : err.message;
    error = new AppError(500, "INTERNAL_ERROR", message);
  }

  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  });
};

export default errorHandler;
