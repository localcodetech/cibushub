import {
  getMyRiderStatus,
  goOffline,
  goOnline,
} from "../../services/rider/riderPresence.service.js";
import { sendSuccess } from "../../utils/response.js";

export const getStatus = async (req, res) => {
  const status = await getMyRiderStatus(req.user.id);

  return sendSuccess(res, status);
};

export const online = async (req, res) => {
  const status = await goOnline(req.user.id, req.validated.body);

  return sendSuccess(res, status);
};

export const offline = async (req, res) => {
  const status = await goOffline(req.user.id);

  return sendSuccess(res, status);
};
