import { declineOffer, getMyPendingOffer } from "../../services/delivery/assignment.service.js";
import { sendSuccess } from "../../utils/response.js";

export const getCurrentOffer = async (req, res) => {
  const offer = await getMyPendingOffer(req.user.id);

  return sendSuccess(res, offer);
};

export const decline = async (req, res) => {
  await declineOffer(req.user.id, req.params.offerId);

  return sendSuccess(res, { declined: true });
};
