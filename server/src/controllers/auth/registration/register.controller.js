import { registerUser } from "../../../services/auth/registration/register.service.js";
import { sendSuccess } from "../../../utils/response.js";

export const register = async (req, res) => {
  const user = await registerUser(req.validated.body);

  return sendSuccess(res, user, 201);
};
