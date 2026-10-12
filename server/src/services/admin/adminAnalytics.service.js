import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { ORDER_STATUSES } from "../../models/order/order.model.js";
import {
  countPlacedOrdersByStatus,
  findTopRestaurants,
  measureOrderTimes,
  sumPaidOrdersByDay,
} from "../../repositories/adminAnalytics.repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_RESTAURANTS = 5;
// Charts may be up to this old [AC-ANL-06]. Short, so today's numbers still move.
const CACHE_SECONDS = 2 * 60;

// "2026-10-09" -> midnight at the start of that day in Ghana (= UTC)
const startOfDay = (day) => new Date(day + "T00:00:00.000Z");

// Every day from the first to the last, as "2026-10-09" (both ends included)
const listDays = (from, to) => {
  const days = [];
  for (let time = startOfDay(from).getTime(); time <= startOfDay(to).getTime(); time += DAY_MS) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
};

// Part of the paid orders, as a whole-number percentage (null when nothing was paid)
const percentOf = (count, total) => (total === 0 ? null : Math.round((count / total) * 100));

// Average times in seconds, and how many paid orders were rejected or cancelled [AC-ANL-02]
const toOperations = (times) => ({
  averageSeconds: {
    accept: times.acceptSeconds,
    prepare: times.prepareSeconds,
    assignRider: times.assignSeconds,
    deliver: times.deliverSeconds,
    total: times.totalSeconds,
  },
  paidOrders: times.paidOrders,
  rejectedPercent: percentOf(times.rejected, times.paidOrders),
  cancelledPercent: percentOf(times.cancelled, times.paidOrders),
});

// The admin charts for a range of days [AC-ANL-01]. from and to are Ghana days, both included.
// What counts, and what doesn't, is in docs/analytics.md [AC-ANL-05].
export const getAdminAnalytics = async ({ from, to }) => {
  const cacheKey = "analytics:admin:" + from + ":" + to;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn({ err: error }, "Analytics cache unavailable; reading MySQL");
  }

  const rangeStart = startOfDay(from);
  // The first moment after the last day
  const rangeEnd = new Date(startOfDay(to).getTime() + DAY_MS);

  const [paidDays, topRestaurants, placedByStatus, times] = await Promise.all([
    sumPaidOrdersByDay(rangeStart, rangeEnd),
    findTopRestaurants(rangeStart, rangeEnd, TOP_RESTAURANTS),
    countPlacedOrdersByStatus(rangeStart, rangeEnd),
    measureOrderTimes(rangeStart, rangeEnd),
  ]);

  // A day with no orders is a 0 on the chart, not a gap
  const paidByDay = new Map(paidDays.map((row) => [row.day, row]));
  const days = listDays(from, to).map(
    (day) => paidByDay.get(day) || { day, orders: 0, customerPaidPesewas: 0, cibushubPesewas: 0 },
  );

  const totals = { orders: 0, customerPaidPesewas: 0, cibushubPesewas: 0 };
  for (const day of days) {
    totals.orders += day.orders;
    totals.customerPaidPesewas += day.customerPaidPesewas;
    totals.cibushubPesewas += day.cibushubPesewas;
  }

  const result = {
    from,
    to,
    totals,
    days,
    // Every status, 0 when none
    ordersByStatus: Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, placedByStatus[status] || 0]),
    ),
    topRestaurants,
    operations: toOperations(times),
  };

  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_SECONDS);
  } catch {
    // Asking MySQL again next time is fine
  }
  return result;
};
