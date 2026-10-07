import { IMAGE_MIME_TYPES, checkFileType } from "../../utils/upload/checkFileType.js";
import { deleteFromCloudinary, uploadPublicImage } from "../upload/cloudinary.service.js";
import { findRestaurantById, updateRestaurant } from "../../repositories/restaurant.repository.js";
import { getMyEditableRestaurant } from "./myRestaurants.service.js";

// Which columns each kind of restaurant image lives in
const IMAGE_COLUMNS = {
  logo: { url: "logoUrl", publicId: "logoPublicId" },
  cover: { url: "coverImageUrl", publicId: "coverImagePublicId" },
};

// Upload a new logo or cover, then delete the old one [AC-IMG-01, AC-IMG-02, AC-IMG-04]
export const replaceRestaurantImage = async (restaurantId, ownerId, imageKind, file) => {
  const restaurant = await getMyEditableRestaurant(restaurantId, ownerId);
  await checkFileType(file.buffer, IMAGE_MIME_TYPES);

  const columns = IMAGE_COLUMNS[imageKind];
  const oldPublicId = restaurant[columns.publicId];

  const uploaded = await uploadPublicImage(file.buffer, `restaurants/${imageKind}s`);

  await updateRestaurant(restaurant, {
    [columns.url]: uploaded.url,
    [columns.publicId]: uploaded.publicId,
  });

  // Only after the new image is saved, so a failure never leaves the restaurant without one
  await deleteFromCloudinary(oldPublicId);

  return findRestaurantById(restaurantId);
};
