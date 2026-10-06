import { registerUser, resendVerificationOtp, verifyPhone } from "../services/auth.service.js";
import { sendSuccess } from "../utils/response.js";

export const register = async (req, res) => {
  const user = await registerUser(req.validated.body);

  return sendSuccess(res, user, 201);
};

export const verifyPhoneNumber = async (req, res) => {
  const { phone, code } = req.validated.body;

  const user = await verifyPhone(phone, code);

  return sendSuccess(res, user);
};

export const resendOtp = async (req, res) => {
  await resendVerificationOtp(req.validated.body.phone);

  return sendSuccess(res, {
    message: "If this number is waiting for verification, a new code has been sent",
  });
};
