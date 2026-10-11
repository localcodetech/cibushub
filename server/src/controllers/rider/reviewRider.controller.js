import {
  approveRider,
  getRiderForAdmin,
  listLiveRiders,
  listRiderDocumentsForAdmin,
  revealGhanaCard,
  listRidersForAdmin,
  rejectRider,
  suspendRider,
} from "../../services/rider/reviewRider.service.js";
import { sendSuccess } from "../../utils/response.js";

// Who is acting and from where, for the audit log
const adminFrom = (req) => ({ id: req.user.id, ipAddress: req.ip });

export const listRiders = async (req, res) => {
  const { riders, meta } = await listRidersForAdmin(req.validated.query);

  return sendSuccess(res, riders, 200, meta);
};

export const getRider = async (req, res) => {
  const rider = await getRiderForAdmin(req.params.riderId);

  return sendSuccess(res, rider);
};

export const listDocuments = async (req, res) => {
  const documents = await listRiderDocumentsForAdmin(req.params.riderId);

  return sendSuccess(res, documents);
};

export const approve = async (req, res) => {
  const rider = await approveRider(req.params.riderId, adminFrom(req));

  return sendSuccess(res, rider);
};

export const reject = async (req, res) => {
  const rider = await rejectRider(req.params.riderId, req.validated.body.reason, adminFrom(req));

  return sendSuccess(res, rider);
};

export const suspend = async (req, res) => {
  const rider = await suspendRider(req.params.riderId, req.validated.body.reason, adminFrom(req));

  return sendSuccess(res, rider);
};

export const liveRiders = async (req, res) => {
  const riders = await listLiveRiders();

  return sendSuccess(res, riders);
};

export const revealCard = async (req, res) => {
  const result = await revealGhanaCard(req.params.riderId, adminFrom(req));

  return sendSuccess(res, result);
};
