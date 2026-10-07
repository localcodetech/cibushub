import {
  addCategory,
  editCategory,
  removeCategory,
  setCategoryAvailability,
} from "../../services/menu/category.service.js";
import { sendSuccess } from "../../utils/response.js";

export const createCategory = async (req, res) => {
  const category = await addCategory(req.params.restaurantId, req.user.id, req.validated.body);

  return sendSuccess(res, category, 201);
};

export const updateCategory = async (req, res) => {
  const category = await editCategory(
    req.params.restaurantId,
    req.params.categoryId,
    req.user.id,
    req.validated.body,
  );

  return sendSuccess(res, category);
};

export const deleteCategory = async (req, res) => {
  await removeCategory(req.params.restaurantId, req.params.categoryId, req.user.id);

  return sendSuccess(res, null);
};

export const updateCategoryAvailability = async (req, res) => {
  const result = await setCategoryAvailability(
    req.params.restaurantId,
    req.params.categoryId,
    req.user.id,
    req.validated.body.isAvailable,
  );

  return sendSuccess(res, result);
};
