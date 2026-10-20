import AppError from "../../utils/AppError.js";
import { DOCUMENT_MIME_TYPES, checkFileType } from "../../utils/upload/checkFileType.js";
import {
  deleteFromCloudinary,
  signedDocumentUrl,
  uploadPrivateDocument,
} from "../upload/cloudinary.service.js";
import sequelize from "../../config/database.js";
import { findRestaurantById } from "../../repositories/restaurant.repository.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import {
  createDocument,
  findDocumentByType,
  findDocumentsForRestaurant,
  updateDocument,
} from "../../repositories/restaurantDocument.repository.js";
import { REQUIRED_DOCUMENT_TYPES } from "../../models/restaurant/restaurantDocument.model.js";
import { getMyEditableRestaurant } from "./myRestaurants.service.js";

// What an owner gets back: never the Cloudinary ID, never a link
const toOwnerView = (document) => ({
  id: document.id,
  documentType: document.documentType,
  format: document.format,
  verificationStatus: document.verificationStatus,
  rejectionReason: document.rejectionReason,
  updatedAt: document.updatedAt,
});

// A new file has not been checked yet, so any old verdict is wiped
const NOT_CHECKED_YET = {
  verificationStatus: "PENDING",
  rejectionReason: null,
  reviewedBy: null,
  reviewedAt: null,
};

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
  await updateDocument(existing, { ...uploaded, ...NOT_CHECKED_YET });
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

// Admin marks one document VERIFIED or REJECTED (a rejection needs a reason the owner will read)
export const reviewRestaurantDocument = async (restaurantId, documentType, verdict, admin) => {
  const document = await findDocumentByType(restaurantId, documentType);

  if (!document) {
    throw new AppError(404, "NOT_FOUND", "This document has not been uploaded");
  }

  const previousStatus = document.verificationStatus;

  await sequelize.transaction(async (transaction) => {
    await updateDocument(
      document,
      {
        verificationStatus: verdict.status,
        rejectionReason: verdict.status === "REJECTED" ? verdict.reason : null,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
      transaction,
    );

    // One line in the admin history book [AC-ADM-07]
    await saveAuditLog(
      {
        actorId: admin.id,
        action: `RESTAURANT_DOCUMENT_${verdict.status}`,
        targetType: "restaurant",
        targetId: restaurantId,
        before: { documentType, verificationStatus: previousStatus },
        after: { documentType, verificationStatus: verdict.status },
        reason: verdict.reason || null,
        ipAddress: admin.ipAddress,
      },
      transaction,
    );
  });

  return toOwnerView(document);
};

// The required documents that are missing or not VERIFIED yet, e.g. ["TAX_CERTIFICATE"]
export const findUnverifiedRequiredDocuments = async (restaurantId) => {
  const documents = await findDocumentsForRestaurant(restaurantId);

  return REQUIRED_DOCUMENT_TYPES.filter((documentType) => {
    const document = documents.find((each) => each.documentType === documentType);
    return !document || document.verificationStatus !== "VERIFIED";
  });
};
