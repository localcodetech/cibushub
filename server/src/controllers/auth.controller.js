import { registerUser } from "../services/auth.service.js";
import { sendSuccess } from "../utils/response.js";

export const register = async (req, res) => {
  const user = await registerUser(req.validated.body);

  return sendSuccess(res, user, 201);
};
