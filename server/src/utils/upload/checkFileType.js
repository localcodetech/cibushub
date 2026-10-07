import { fileTypeFromBuffer } from "file-type";
import AppError from "../AppError.js";

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, "application/pdf"];

// Looks at the first bytes of the file ("magic bytes"), not its name, to find what it really is [AC-IMG-01]
export const checkFileType = async (buffer, allowedTypes) => {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !allowedTypes.includes(detected.mime)) {
    throw new AppError(
      400,
      "UNSUPPORTED_FILE_TYPE",
      `Only these file types are allowed: ${allowedTypes.join(", ")}`,
    );
  }

  return detected;
};
