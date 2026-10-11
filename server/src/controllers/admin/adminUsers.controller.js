import {
  getUserForAdmin,
  listUsersForAdmin,
  reactivateUser,
  suspendUser,
} from "../../services/admin/adminUsers.service.js";
import { sendSuccess } from "../../utils/response.js";

// Who is acting and from where, for the audit log
const adminFrom = (req) => ({ id: req.user.id, ipAddress: req.ip });

export const listUsers = async (req, res) => {
  const { users, meta } = await listUsersForAdmin(req.validated.query);

  return sendSuccess(res, users, 200, meta);
};

export const getUser = async (req, res) => {
  const user = await getUserForAdmin(req.params.userId);

  return sendSuccess(res, user);
};

export const suspend = async (req, res) => {
  const user = await suspendUser(adminFrom(req), req.params.userId, req.validated.body.reason);

  return sendSuccess(res, user);
};

export const reactivate = async (req, res) => {
  const user = await reactivateUser(adminFrom(req), req.params.userId, req.validated.body.reason);

  return sendSuccess(res, user);
};
