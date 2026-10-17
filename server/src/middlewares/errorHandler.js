import AppError from "../utils/AppError.js";
import env from "../config/env/env.js";
import { reportError } from "../config/sentry.js";

// What Sentry is told about the request: who (an ID only) and which route
const sentryDetails = (req) => ({
  userId: req.user?.id,
  tags: { method: req.method, route: req.route?.path || req.path },
});

const errorHandler = (err, req, res, next) => {
  // Part of the answer has already gone (e.g. a CSV download failed halfway): no error
  // envelope can follow it. Express's own handler cuts the connection, so the download
  // fails visibly instead of leaving a file that looks complete.
  if (res.headersSent) {
    req.log.error({ err }, "Error after the response started");
    reportError(err, sentryDetails(req));
    return next(err);
  }

  let error = err;

  if (err.type === "entity.parse.failed") {
    error = new AppError(400, "INVALID_JSON", "Request body is not valid JSON");
  } else if (err.type === "entity.too.large") {
    error = new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  // An unexpected error (a bug, a database down...): logged, and sent to Sentry.
  // Our own AppErrors (wrong password, not found...) are normal answers, so they're not sent.
  if (!(error instanceof AppError)) {
    req.log.error({ err }, "Unhandled error");
    reportError(err, sentryDetails(req));

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
