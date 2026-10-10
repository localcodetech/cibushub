import { riderGiveUpDelivery } from "../../services/delivery/manualAssignment.service.js";
import {
  completeDelivery,
  confirmPickup,
  getMyCurrentDelivery,
  recordCallAttempt,
  reportCustomerUnreachable,
} from "../../services/delivery/deliveryFlow.service.js";
import { sendSuccess } from "../../utils/response.js";

export const current = async (req, res) => {
  const delivery = await getMyCurrentDelivery(req.user.id);

  return sendSuccess(res, delivery);
};

export const pickUp = async (req, res) => {
  const delivery = await confirmPickup({
    userId: req.user.id,
    confirmFarAway: req.validated.body.confirmFarAway,
  });

  return sendSuccess(res, delivery);
};

export const complete = async (req, res) => {
  const result = await completeDelivery({ userId: req.user.id, code: req.validated.body.code });

  return sendSuccess(res, result);
};

export const call = async (req, res) => {
  const result = await recordCallAttempt({ userId: req.user.id });

  return sendSuccess(res, result);
};

export const unreachable = async (req, res) => {
  const delivery = await reportCustomerUnreachable({
    userId: req.user.id,
    note: req.validated.body.note,
    ipAddress: req.ip,
  });

  return sendSuccess(res, delivery);
};

export const giveUp = async (req, res) => {
  const result = await riderGiveUpDelivery({
    userId: req.user.id,
    reason: req.validated.body.reason,
    ipAddress: req.ip,
  });

  return sendSuccess(res, result);
};
