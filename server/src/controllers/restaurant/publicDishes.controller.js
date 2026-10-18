import { listPublicDishes } from "../../services/restaurant/publicDishes.service.js";
import { sendSuccess } from "../../utils/response.js";

export const searchDishes = async (req, res) => {
  const { dishes, meta } = await listPublicDishes(req.validated.query);

  return sendSuccess(res, dishes, 200, meta);
};
