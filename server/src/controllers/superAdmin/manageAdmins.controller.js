import {
  changeAdminRole,
  createAdmin,
  listAdmins,
  reactivateAdmin,
  removeAdmin,
  suspendAdmin,
} from "../../services/superAdmin/manageAdmins.service.js";
import { sendSuccess } from "../../utils/response.js";

// Who is acting and from where, for the audit log
const superAdminFrom = (req) => ({ id: req.user.id, ipAddress: req.ip });

export const list = async (req, res) => {
  const admins = await listAdmins();

  return sendSuccess(res, admins);
};

export const create = async (req, res) => {
  const admin = await createAdmin(superAdminFrom(req), req.validated.body);

  return sendSuccess(res, admin, 201);
};

export const suspend = async (req, res) => {
  const admin = await suspendAdmin(
    superAdminFrom(req),
    req.params.userId,
    req.validated.body.reason,
  );

  return sendSuccess(res, admin);
};

export const reactivate = async (req, res) => {
  const admin = await reactivateAdmin(
    superAdminFrom(req),
    req.params.userId,
    req.validated.body.reason,
  );

  return sendSuccess(res, admin);
};

export const changeRole = async (req, res) => {
  const { role, reason } = req.validated.body;
  const admin = await changeAdminRole(superAdminFrom(req), req.params.userId, role, reason);

  return sendSuccess(res, admin);
};

export const remove = async (req, res) => {
  const result = await removeAdmin(
    superAdminFrom(req),
    req.params.userId,
    req.validated.body.reason,
  );

  return sendSuccess(res, result);
};
