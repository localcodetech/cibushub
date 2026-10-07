import { replaceItemImage } from "../../services/menu/itemImage.service.js";
import {
  addItem,
  editItem,
  removeItem,
  setItemAvailability,
} from "../../services/menu/item.service.js";
import { sendSuccess } from "../../utils/response.js";

export const createItem = async (req, res) => {
  const item = await addItem(req.params.restaurantId, req.user.id, req.validated.body);

  return sendSuccess(res, item, 201);
};

export const updateItem = async (req, res) => {
  const item = await editItem(
    req.params.restaurantId,
    req.params.itemId,
    req.user.id,
    req.validated.body,
  );

  return sendSuccess(res, item);
};

export const deleteItem = async (req, res) => {
  await removeItem(req.params.restaurantId, req.params.itemId, req.user.id);

  return sendSuccess(res, null);
};

export const updateItemAvailability = async (req, res) => {
  const item = await setItemAvailability(
    req.params.restaurantId,
    req.params.itemId,
    req.user.id,
    req.validated.body.isAvailable,
  );

  return sendSuccess(res, item);
};

export const uploadItemImage = async (req, res) => {
  const item = await replaceItemImage(
    req.params.restaurantId,
    req.params.itemId,
    req.user.id,
    req.file,
  );

  return sendSuccess(res, item);
};
