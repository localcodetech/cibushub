import AppError from "../utils/AppError.js";

const notFound = (req, res, next) => {

  next(new AppError(404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`));
  
};

export default notFound;
