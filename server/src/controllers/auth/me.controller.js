import { sendSuccess } from "../../utils/response.js";

export const getMe = async (req, res) => {
  return sendSuccess(res, req.user);
};
