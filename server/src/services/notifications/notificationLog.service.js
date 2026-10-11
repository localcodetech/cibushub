import { NotificationLog } from "../../models/index.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";

// Admins: every email and SMS sent, newest first, e.g. only the FAILED ones
// [AC-NOTIF-03, AC-NOTIF-08]. Recipients are masked; message texts are never stored.
export const listNotificationLogs = async (query) => {
  const { limit, offset } = toLimitAndOffset(query);
  const where = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.channel) {
    where.channel = query.channel;
  }

  const { rows, count } = await NotificationLog.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return { logs: rows, meta: buildPageMeta(query, count) };
};
