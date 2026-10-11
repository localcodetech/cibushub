import {
  sendEmailVerificationCode,
  verifyEmail,
} from "../../../services/auth/registration/verifyEmail.service.js";
import { sendSuccess } from "../../../utils/response.js";

export const sendEmailCode = async (req, res) => {
  const result = await sendEmailVerificationCode(req.user.id);

  return sendSuccess(res, result);
};

export const confirmEmail = async (req, res) => {
  const user = await verifyEmail(req.user.id, req.validated.body.code);

  return sendSuccess(res, user);
};
