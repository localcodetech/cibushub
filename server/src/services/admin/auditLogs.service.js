import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { findAuditActions, findAuditLogs } from "../../repositories/auditLog.repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-10-11" -> midnight that day in Ghana (UTC all year)
const startOfDay = (dayText) => new Date(`${dayText}T00:00:00Z`);

// Every admin action: who, what, on what, before and after, why, from where, when [AC-ADM-07].
// Read-only: the log itself can never be changed.
export const listAuditLogs = async (query) => {
  const { limit, offset } = toLimitAndOffset(query);
  const { rows, count } = await findAuditLogs({
    action: query.action,
    targetType: query.targetType,
    targetId: query.targetId,
    actorId: query.actorId,
    from: query.from ? startOfDay(query.from) : null,
    // "to" includes that whole day
    to: query.to ? new Date(startOfDay(query.to).getTime() + DAY_MS) : null,
    limit,
    offset,
  });

  return { logs: rows, meta: buildPageMeta(query, count) };
};

// The action names in use, for the filter list
export const listAuditActions = () => findAuditActions();
