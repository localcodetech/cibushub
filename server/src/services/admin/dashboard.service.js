import { ASSIGNMENT_RULES } from "../../utils/delivery/assignmentRules.js";
import { UNPAID_ORDER_MINUTES } from "../../jobs/enqueue.js";
import {
  countFailedNotificationsSince,
  countOnlineRiders,
  countOrdersByStatus,
  countPaymentsWithStatus,
  countPendingRestaurants,
  countPendingRiders,
  countRefundsWithStatus,
  countSearchingSince,
  sumOrdersPaidSince,
} from "../../repositories/adminDashboard.repository.js";

// Orders still moving through the kitchen or on the road
const ACTIVE_STATUSES = [
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
];

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Midnight today in Ghana. Ghana is on UTC all year, so it is midnight UTC.
const startOfTodayInGhana = (now) => {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

// What an admin sees first [AC-ADM-01]. All the counts run at the same time.
export const getDashboard = async (now = new Date()) => {
  const todayStart = startOfTodayInGhana(now);

  const [
    paidToday,
    activeOrders,
    onlineRiders,
    pendingRestaurants,
    pendingRiders,
    ordersWithoutRider,
    amountMismatches,
    stuckPayments,
    failedRefunds,
    failedMessages,
  ] = await Promise.all([
    sumOrdersPaidSince(todayStart),
    countOrdersByStatus(ACTIVE_STATUSES),
    countOnlineRiders(),
    countPendingRestaurants(),
    countPendingRiders(),
    countSearchingSince(new Date(now.getTime() - ASSIGNMENT_RULES.alertAfterMs)),
    countPaymentsWithStatus("AMOUNT_MISMATCH"),
    // Still PENDING after the order would have expired: Paystack never answered
    countPaymentsWithStatus("PENDING", new Date(now.getTime() - UNPAID_ORDER_MINUTES * MINUTE_MS)),
    countRefundsWithStatus("FAILED"),
    countFailedNotificationsSince(new Date(now.getTime() - DAY_MS)),
  ]);

  return {
    today: {
      // From midnight in Ghana: orders paid, and their total (GMV, before any refunds)
      from: todayStart,
      paidOrders: paidToday.count,
      gmvPesewas: paidToday.totalPesewas,
    },
    activeOrders,
    onlineRiders,
    pendingApprovals: { restaurants: pendingRestaurants, riders: pendingRiders },
    alerts: {
      ordersWithoutRider,
      amountMismatches,
      stuckPayments,
      failedRefunds,
      failedMessages,
    },
  };
};
