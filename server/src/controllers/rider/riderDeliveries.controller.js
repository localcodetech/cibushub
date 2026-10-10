import { riderGiveUpDelivery } from "../../services/delivery/manualAssignment.service.js";
import { sendSuccess } from "../../utils/response.js";

export const giveUp = async (req, res) => {
  const result = await riderGiveUpDelivery({
    userId: req.user.id,
    reason: req.validated.body.reason,
    ipAddress: req.ip,
  });

  return sendSuccess(res, result);
};
