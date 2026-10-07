import sharp from "sharp";
import cloudinary from "../../config/cloudinary.js";
import logger from "../../config/logger.js";

const MAX_IMAGE_WIDTH = 1600;
const DOCUMENT_LINK_SECONDS = 5 * 60;

// Sends a file (as bytes) to Cloudinary and waits for the answer
const sendToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });

    stream.end(buffer);
  });
};

// Public image: shrink to at most 1600px wide, turn into WebP, then upload [AC-IMG-02]
export const uploadPublicImage = async (buffer, folder) => {
  const smallerImage = await sharp(buffer)
    .rotate() // stand phone photos upright, using the camera's hint
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const result = await sendToCloudinary(smallerImage, {
    folder: `cibushub/${folder}`,
    resource_type: "image",
  });

  return { url: result.secure_url, publicId: result.public_id };
};

// Private document: stored as "authenticated", so it has no public link [AC-IMG-03]
export const uploadPrivateDocument = async (buffer, folder) => {
  const result = await sendToCloudinary(buffer, {
    folder: `cibushub/${folder}`,
    type: "authenticated",
    resource_type: "image", // Cloudinary keeps PDFs under "image" too
  });

  return { publicId: result.public_id, format: result.format };
};

// A link to a private document that stops working after 5 minutes [AC-IMG-03]
export const signedDocumentUrl = (publicId, format) => {
  const expiresAt = Math.floor(Date.now() / 1000) + DOCUMENT_LINK_SECONDS;

  return cloudinary.utils.private_download_url(publicId, format, {
    type: "authenticated",
    resource_type: "image",
    expires_at: expiresAt,
  });
};

// Removes an old file. A failure is only logged: it must never break the user's request [AC-IMG-04]
export const deleteFromCloudinary = async (publicId, type = "upload") => {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, { type, resource_type: "image" });
  } catch (error) {
    logger.warn({ err: error, publicId }, "Cloudinary delete failed");
  }
};
