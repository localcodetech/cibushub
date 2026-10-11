import { listAuditActions, listAuditLogs } from "../../services/admin/auditLogs.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listLogs = async (req, res) => {
  const { logs, meta } = await listAuditLogs(req.validated.query);

  return sendSuccess(res, logs, 200, meta);
};

export const listActions = async (req, res) => {
  const actions = await listAuditActions();

  return sendSuccess(res, actions);
};
