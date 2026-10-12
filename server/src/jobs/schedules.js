import { QUEUE_NAMES, getQueue } from "./queues.js";

// Jobs that repeat on a timer [AC-JOB-02]. Saved in Redis by id, so restarting the worker
// updates them instead of creating copies.
export const SCHEDULES = [
  {
    id: "sweep-unpaid-orders",
    queue: QUEUE_NAMES.maintenance,
    name: "sweepUnpaidOrders",
    repeat: { every: 60 * 1000 }, // every minute
  },
  {
    id: "sweep-unanswered-orders",
    queue: QUEUE_NAMES.maintenance,
    name: "sweepUnansweredOrders",
    repeat: { every: 60 * 1000 }, // every minute [AC-RORD-04]
  },
  {
    id: "sweep-stale-riders",
    queue: QUEUE_NAMES.maintenance,
    name: "sweepStaleRiders",
    repeat: { every: 60 * 1000 }, // every minute [AC-RIDER-05]
  },
  {
    id: "sweep-searching-deliveries",
    queue: QUEUE_NAMES.assignment,
    name: "sweepSearchingDeliveries",
    repeat: { every: 60 * 1000 }, // every minute [AC-ASSIGN-06, AC-JOB-02]
  },
  {
    id: "sweep-locked-delivery-codes",
    queue: QUEUE_NAMES.maintenance,
    name: "sweepLockedDeliveryCodes",
    repeat: { every: 60 * 1000 }, // every minute [AC-DEL-06]
  },
  {
    id: "sweep-door-waits",
    queue: QUEUE_NAMES.maintenance,
    name: "sweepDoorWaits",
    repeat: { every: 60 * 1000 }, // every minute [AC-DEL-08]
  },
  {
    id: "reconcile-payments",
    queue: QUEUE_NAMES.payments,
    name: "reconcilePayments",
    repeat: { every: 10 * 60 * 1000 }, // every 10 minutes
  },
  {
    id: "process-pending-refunds",
    queue: QUEUE_NAMES.payments,
    name: "processPendingRefunds",
    repeat: { every: 5 * 60 * 1000 }, // every 5 minutes
  },
  {
    id: "cleanup-expired-tokens",
    queue: QUEUE_NAMES.maintenance,
    name: "cleanupExpiredTokens",
    repeat: { pattern: "0 3 * * *", tz: "Africa/Accra" }, // daily at 03:00 Accra time
  },
  {
    id: "daily-admin-summary",
    queue: QUEUE_NAMES.maintenance,
    name: "sendDailySummary",
    repeat: { pattern: "59 23 * * *", tz: "Africa/Accra" }, // daily at 23:59 Accra time [AC-JOB-02]
  },
];

export const registerSchedules = async () => {
  for (const schedule of SCHEDULES) {
    await getQueue(schedule.queue).upsertJobScheduler(schedule.id, schedule.repeat, {
      name: schedule.name,
    });
  }
};
