import { AuditLog } from "../models/index.js";

// Writes one line in the admin history book [AC-ADM-07]
export const saveAuditLog = (data, transaction) => {
  return AuditLog.create(data, { transaction });
};

// The newest line for one target and action, e.g. the last time this user was suspended
export const findLatestAudit = ({ targetType, targetId, action }, transaction) => {
  return AuditLog.findOne({
    where: { targetType, targetId, action },
    order: [["createdAt", "DESC"]],
    transaction,
  });
};
