import { addPhone as savePhone } from "../../../services/auth/registration/addPhone.service.js";
import { sendSuccess } from "../../../utils/response.js";

export const addPhone = async (req, res) => {
  const user = await savePhone(req.user, req.validated.body.phone);

  return sendSuccess(res, user);
};
