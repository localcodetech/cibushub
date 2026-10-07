import { updateMyRestaurant } from "../../services/restaurant/updateRestaurant.service.js";
import { replaceOpeningHours } from "../../services/restaurant/updateOpeningHours.service.js";
import { setAcceptingOrders } from "../../services/restaurant/acceptingOrders.service.js";
import { resubmitRestaurant } from "../../services/restaurant/resubmitRestaurant.service.js";
import { sendSuccess } from "../../utils/response.js";

export const updateRestaurant = async (req, res) => {
  const restaurant = await updateMyRestaurant(
    req.params.restaurantId,
    req.user.id,
    req.validated.body,
  );

  return sendSuccess(res, restaurant);
};

export const updateOpeningHours = async (req, res) => {
  const restaurant = await replaceOpeningHours(
    req.params.restaurantId,
    req.user.id,
    req.validated.body.openingHours,
  );

  return sendSuccess(res, restaurant);
};

export const updateAcceptingOrders = async (req, res) => {
  const restaurant = await setAcceptingOrders(
    req.params.restaurantId,
    req.user.id,
    req.validated.body.isAcceptingOrders,
  );

  return sendSuccess(res, restaurant);
};

export const resubmit = async (req, res) => {
  const restaurant = await resubmitRestaurant(req.params.restaurantId, req.user.id);

  return sendSuccess(res, restaurant);
};
