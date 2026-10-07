import { IMAGE_MIME_TYPES, checkFileType } from "../../utils/upload/checkFileType.js";
import { deleteFromCloudinary, uploadPublicImage } from "../upload/cloudinary.service.js";
import { findUserById, updateUser } from "../../repositories/user.repository.js";

// [AC-CUST-01]
export const updateMyName = async (userId, fullName) => {
  const user = await findUserById(userId);

  return updateUser(user, { fullName });
};

// Upload a new profile photo, then delete the old one [AC-CUST-01, AC-IMG-01, AC-IMG-04]
export const replaceMyAvatar = async (userId, file) => {
  await checkFileType(file.buffer, IMAGE_MIME_TYPES);

  const user = await findUserById(userId);
  const oldPublicId = user.avatarPublicId;

  const uploaded = await uploadPublicImage(file.buffer, "avatars");

  await updateUser(user, { avatarUrl: uploaded.url, avatarPublicId: uploaded.publicId });

  // Only after the new photo is saved, so a failure never leaves the user without one
  await deleteFromCloudinary(oldPublicId);

  return user;
};
