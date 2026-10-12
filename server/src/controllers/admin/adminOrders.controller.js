import { adminCancelOrder } from "../../services/order/adminCancelOrder.service.js";
import { getOrderForAdmin, listOrdersForAdmin } from "../../services/order/adminOrders.service.js";
import {
  adminAssignRider,
  adminUnassignRider,
} from "../../services/delivery/manualAssignment.service.js";
import { adminUnlockDeliveryCode } from "../../services/delivery/deliveryFlow.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listOrders = async (req, res) => {
  const { orders, meta } = await listOrdersForAdmin(req.validated.query);

  return sendSuccess(res, orders, 200, meta);
};

export const getOrder = async (req, res) => {
  const order = await getOrderForAdmin(req.params.orderId);

  return sendSuccess(res, order);
};

export const cancelOrderAsAdmin = async (req, res) => {
  const admin = { id: req.user.id, role: req.user.role, ipAddress: req.ip };
  const order = await adminCancelOrder(admin, req.params.orderId, req.validated.body);

  return sendSuccess(res, order);
};

export const assignRiderAsAdmin = async (req, res) => {
  const admin = { id: req.user.id, role: req.user.role, ipAddress: req.ip };
  const result = await adminAssignRider({
    orderId: req.params.orderId,
    riderProfileId: req.validated.body.riderProfileId,
    reason: req.validated.body.reason,
    admin,
  });

  return sendSuccess(res, result);
};

export const unassignRiderAsAdmin = async (req, res) => {
  const admin = { id: req.user.id, role: req.user.role, ipAddress: req.ip };
  const result = await adminUnassignRider({
    orderId: req.params.orderId,
    reason: req.validated.body.reason,
    admin,
  });

  return sendSuccess(res, result);
};

export const unlockDeliveryCodeAsAdmin = async (req, res) => {
  const admin = { id: req.user.id, role: req.user.role, ipAddress: req.ip };
  const result = await adminUnlockDeliveryCode({
    orderId: req.params.orderId,
    reason: req.validated.body.reason,
    admin,
  });

  return sendSuccess(res, result);
};
