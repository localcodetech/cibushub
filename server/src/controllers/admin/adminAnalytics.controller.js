import { getAdminAnalytics } from "../../services/admin/adminAnalytics.service.js";
import { sendSuccess } from "../../utils/response.js";

export const showAnalytics = async (req, res) => {
  const analytics = await getAdminAnalytics(req.validated.query);

  return sendSuccess(res, analytics);
};
