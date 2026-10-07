import { AuditLog } from "../models/index.js";

// Writes one line in the admin history book [AC-ADM-07]
export const saveAuditLog = (data, transaction) => {
  return AuditLog.create(data, { transaction });
};
