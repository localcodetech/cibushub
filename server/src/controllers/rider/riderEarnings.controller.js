import { getMyEarnings } from "../../services/rider/riderEarnings.service.js";
import { sendSuccess } from "../../utils/response.js";

export const earnings = async (req, res) => {
  const { summary, deliveries, meta } = await getMyEarnings(req.user.id, req.validated.query);

  return sendSuccess(res, { summary, deliveries }, 200, meta);
};
