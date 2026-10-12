import { Op, col, fn } from "sequelize";
import { AuditLog, User } from "../models/index.js";

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

// Admins: the history book, newest first, with filters [AC-ADM-07]
export const findAuditLogs = ({
  action,
  targetType,
  targetId,
  actorId,
  from,
  to,
  limit,
  offset,
}) => {
  const where = {};
  if (action) {
    where.action = action;
  }
  if (targetType) {
    where.targetType = targetType;
  }
  if (targetId) {
    where.targetId = targetId;
  }
  if (actorId) {
    where.actorId = actorId;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt[Op.gte] = from;
    }
    if (to) {
      where.createdAt[Op.lt] = to;
    }
  }
  return AuditLog.findAndCountAll({
    where,
    include: [
      { model: User, as: "actor", attributes: ["id", "fullName", "role"], paranoid: false },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });
};

// Every action name written so far, A to Z (for the filter list)
export const findAuditActions = async () => {
  const rows = await AuditLog.findAll({
    attributes: [[fn("DISTINCT", col("action")), "action"]],
    order: [["action", "ASC"]],
    raw: true,
  });
  return rows.map((row) => row.action);
};
