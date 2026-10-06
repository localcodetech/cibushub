import {
  approveRestaurant,
  rejectRestaurant,
  suspendRestaurant,
} from "../../services/restaurant/reviewRestaurant.service.js";
import { sendSuccess } from "../../utils/response.js";

export const approve = async (req, res) => {
  const restaurant = await approveRestaurant(req.params.restaurantId);

  return sendSuccess(res, restaurant);
};

export const reject = async (req, res) => {
  const restaurant = await rejectRestaurant(req.params.restaurantId, req.validated.body.reason);

  return sendSuccess(res, restaurant);
};

export const suspend = async (req, res) => {
  const restaurant = await suspendRestaurant(req.params.restaurantId, req.validated.body.reason);

  return sendSuccess(res, restaurant);
};
