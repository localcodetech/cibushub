import AppError from "../../utils/AppError.js";
import { DOCUMENT_MIME_TYPES, checkFileType } from "../../utils/upload/checkFileType.js";
import {
  deleteFromCloudinary,
  signedDocumentUrl,
  uploadPrivateDocument,
} from "../upload/cloudinary.service.js";
import { findRestaurantById } from "../../repositories/restaurant.repository.js";
import {
  createDocument,
  findDocumentByType,
  findDocumentsForRestaurant,
  updateDocument,
} from "../../repositories/restaurantDocument.repository.js";
import { getMyEditableRestaurant } from "./myRestaurants.service.js";

// What an owner gets back: never the Cloudinary ID, never a link
const toOwnerView = (document) => ({
  id: document.id,
  documentType: document.documentType,
  format: document.format,
  updatedAt: document.updatedAt,
});

// Owner uploads (or replaces) one verification document [AC-REST-01, AC-IMG-03, AC-IMG-04]
export const saveRestaurantDocument = async (restaurantId, ownerId, documentType, file) => {
  await getMyEditableRestaurant(restaurantId, ownerId);
  await checkFileType(file.buffer, DOCUMENT_MIME_TYPES);

  const uploaded = await uploadPrivateDocument(
    file.buffer,
    `restaurants/${restaurantId}/documents`,
  );
  const existing = await findDocumentByType(restaurantId, documentType);

  if (!existing) {
    const created = await createDocument({ restaurantId, documentType, ...uploaded });
    return toOwnerView(created);
  }

  const oldPublicId = existing.publicId;
  await updateDocument(existing, uploaded);
  await deleteFromCloudinary(oldPublicId, "authenticated");

  return toOwnerView(existing);
};

export const listMyRestaurantDocuments = async (restaurantId, ownerId) => {
  await getMyEditableRestaurant(restaurantId, ownerId);

  const documents = await findDocumentsForRestaurant(restaurantId);
  return documents.map(toOwnerView);
};

// Admin view: each document with a link that expires in 5 minutes [AC-IMG-03]
export const listDocumentsForAdmin = async (restaurantId) => {
  const restaurant = await findRestaurantById(restaurantId);

  if (!restaurant) {
    throw new AppError(404, "NOT_FOUND", "Restaurant not found");
  }

  const documents = await findDocumentsForRestaurant(restaurantId);

  return documents.map((document) => ({
    ...toOwnerView(document),
    url: signedDocumentUrl(document.publicId, document.format),
  }));
};
