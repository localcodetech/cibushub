import { QUEUE_NAMES, getQueue } from "./queues.js";

// Jobs that repeat on a timer [AC-JOB-02]. Saved in Redis by id, so restarting the worker
// updates them instead of creating copies.
const SCHEDULES = [
  {
    id: "sweep-unpaid-orders",
    queue: QUEUE_NAMES.maintenance,
    name: "sweepUnpaidOrders",
    repeat: { every: 60 * 1000 }, // every minute
  },
  {
    id: "reconcile-payments",
    queue: QUEUE_NAMES.payments,
    name: "reconcilePayments",
    repeat: { every: 10 * 60 * 1000 }, // every 10 minutes
  },
  {
    id: "cleanup-expired-tokens",
    queue: QUEUE_NAMES.maintenance,
    name: "cleanupExpiredTokens",
    repeat: { pattern: "0 3 * * *", tz: "Africa/Accra" }, // daily at 03:00 Accra time
  },
];

export const registerSchedules = async () => {
  for (const schedule of SCHEDULES) {
    await getQueue(schedule.queue).upsertJobScheduler(schedule.id, schedule.repeat, {
      name: schedule.name,
    });
  }
};
