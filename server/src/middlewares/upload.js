import multer from "multer";
import AppError from "../utils/AppError.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB [AC-IMG-01]

// Keeps the file in memory (req.file.buffer) so we can check and resize it before it goes anywhere
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
});

// Reads one file from the form field `fieldName`, and turns multer's errors into our error format
const uploadOneFile = (fieldName) => {
  const readFile = memoryUpload.single(fieldName);

  return (req, res, next) => {
    readFile(req, res, (error) => {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return next(new AppError(400, "FILE_TOO_LARGE", "The file must be 5 MB or smaller"));
      }

      if (error instanceof multer.MulterError) {
        return next(
          new AppError(400, "INVALID_UPLOAD", `Send one file in the "${fieldName}" field`),
        );
      }

      if (error) {
        return next(error);
      }

      if (!req.file) {
        return next(new AppError(400, "FILE_REQUIRED", `Send a file in the "${fieldName}" field`));
      }

      next();
    });
  };
};

export default uploadOneFile;
