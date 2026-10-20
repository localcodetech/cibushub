import { replaceRestaurantImage } from "../../services/restaurant/restaurantImages.service.js";
import {
  listDocumentsForAdmin,
  listMyRestaurantDocuments,
  reviewRestaurantDocument,
  saveRestaurantDocument,
} from "../../services/restaurant/restaurantDocuments.service.js";
import { sendSuccess } from "../../utils/response.js";

export const uploadLogo = async (req, res) => {
  const restaurant = await replaceRestaurantImage(
    req.params.restaurantId,
    req.user.id,
    "logo",
    req.file,
  );

  return sendSuccess(res, restaurant);
};

export const uploadCover = async (req, res) => {
  const restaurant = await replaceRestaurantImage(
    req.params.restaurantId,
    req.user.id,
    "cover",
    req.file,
  );

  return sendSuccess(res, restaurant);
};

export const uploadDocument = async (req, res) => {
  const document = await saveRestaurantDocument(
    req.params.restaurantId,
    req.user.id,
    req.validated.params.documentType,
    req.file,
  );

  return sendSuccess(res, document);
};

export const listMyDocuments = async (req, res) => {
  const documents = await listMyRestaurantDocuments(req.params.restaurantId, req.user.id);

  return sendSuccess(res, documents);
};

export const listDocumentsAsAdmin = async (req, res) => {
  const documents = await listDocumentsForAdmin(req.params.restaurantId);

  return sendSuccess(res, documents);
};

export const reviewDocumentAsAdmin = async (req, res) => {
  const document = await reviewRestaurantDocument(
    req.params.restaurantId,
    req.validated.params.documentType,
    req.validated.body,
    { id: req.user.id, ipAddress: req.ip },
  );

  return sendSuccess(res, document);
};
