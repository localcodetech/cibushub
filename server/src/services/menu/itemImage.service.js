import { IMAGE_MIME_TYPES, checkFileType } from "../../utils/upload/checkFileType.js";
import { deleteFromCloudinary, uploadPublicImage } from "../upload/cloudinary.service.js";
import { updateItem } from "../../repositories/menu.repository.js";
import { getMyItem } from "./item.service.js";
import { clearCachedMenu } from "./menuCache.service.js";

// Upload a new dish photo, then delete the old one [AC-IMG-01, AC-IMG-02, AC-IMG-04]
export const replaceItemImage = async (restaurantId, itemId, ownerId, file) => {
  const item = await getMyItem(restaurantId, itemId, ownerId);
  await checkFileType(file.buffer, IMAGE_MIME_TYPES);

  const oldPublicId = item.imagePublicId;
  const uploaded = await uploadPublicImage(file.buffer, "menu-items");

  await updateItem(item, { imageUrl: uploaded.url, imagePublicId: uploaded.publicId });
  await clearCachedMenu(restaurantId);
  await deleteFromCloudinary(oldPublicId);

  return item;
};
