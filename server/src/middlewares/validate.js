import AppError from "../utils/AppError.js";

const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", details);
    }

    req.validated = req.validated || {};
    req.validated[source] = result.data;

    next();
  };
};

export default validate;
