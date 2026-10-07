import { RestaurantDocument } from "../models/index.js";

export const findDocumentByType = (restaurantId, documentType) => {
  return RestaurantDocument.findOne({ where: { restaurantId, documentType } });
};

export const findDocumentsForRestaurant = (restaurantId) => {
  return RestaurantDocument.findAll({
    where: { restaurantId },
    order: [["documentType", "ASC"]],
  });
};

export const createDocument = (data) => {
  return RestaurantDocument.create(data);
};

export const updateDocument = (document, changes) => {
  return document.update(changes);
};
