import { getMyMenu } from "../../services/menu/menu.service.js";
import { sendSuccess } from "../../utils/response.js";

export const getMenu = async (req, res) => {
  const categories = await getMyMenu(req.params.restaurantId, req.user.id);

  return sendSuccess(res, categories);
};
