import {
  approveRestaurant,
  rejectRestaurant,
  suspendRestaurant,
} from "../../services/restaurant/reviewRestaurant.service.js";
import { sendSuccess } from "../../utils/response.js";

// Who is acting and from where, for the audit log
const adminFrom = (req) => ({ id: req.user.id, ipAddress: req.ip });

export const approve = async (req, res) => {
  const restaurant = await approveRestaurant(req.params.restaurantId, adminFrom(req));

  return sendSuccess(res, restaurant);
};

export const reject = async (req, res) => {
  const restaurant = await rejectRestaurant(
    req.params.restaurantId,
    req.validated.body.reason,
    adminFrom(req),
  );

  return sendSuccess(res, restaurant);
};

export const suspend = async (req, res) => {
  const restaurant = await suspendRestaurant(
    req.params.restaurantId,
    req.validated.body.reason,
    adminFrom(req),
  );

  return sendSuccess(res, restaurant);
};
