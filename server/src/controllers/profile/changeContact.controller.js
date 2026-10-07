import {
  confirmEmailChange,
  confirmPhoneChange,
  requestEmailChange,
  requestPhoneChange,
} from "../../services/profile/changeContact.service.js";
import { sendSuccess } from "../../utils/response.js";

export const startPhoneChange = async (req, res) => {
  const pending = await requestPhoneChange(req.user.id, req.validated.body.phone);

  return sendSuccess(res, pending);
};

export const finishPhoneChange = async (req, res) => {
  const user = await confirmPhoneChange(req.user.id, req.validated.body.code);

  return sendSuccess(res, user);
};

export const startEmailChange = async (req, res) => {
  const pending = await requestEmailChange(req.user.id, req.validated.body.email);

  return sendSuccess(res, pending);
};

export const finishEmailChange = async (req, res) => {
  const user = await confirmEmailChange(req.user.id, req.validated.body.code);

  return sendSuccess(res, user);
};
