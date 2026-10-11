import { riderGiveUpDelivery } from "../../services/delivery/manualAssignment.service.js";
import {
  completeDelivery,
  confirmPickup,
  getMyCurrentDelivery,
  recordCallAttempt,
} from "../../services/delivery/deliveryFlow.service.js";
import { confirmReturned, reportDoorProblem } from "../../services/delivery/doorProblem.service.js";
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

export const problem = async (req, res) => {
  const delivery = await reportDoorProblem({
    userId: req.user.id,
    problemType: req.validated.body.problemType,
    note: req.validated.body.note,
    ipAddress: req.ip,
  });

  return sendSuccess(res, delivery);
};

export const returned = async (req, res) => {
  const result = await confirmReturned({
    userId: req.user.id,
    confirmFarAway: req.validated.body.confirmFarAway,
  });

  return sendSuccess(res, result);
};

export const giveUp = async (req, res) => {
  const result = await riderGiveUpDelivery({
    userId: req.user.id,
    reason: req.validated.body.reason,
    ipAddress: req.ip,
  });

  return sendSuccess(res, result);
};
