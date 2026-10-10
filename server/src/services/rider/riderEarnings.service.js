import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { findRiderProfileByUserId } from "../../repositories/rider.repository.js";
import { findDeliveredForRider, sumRiderEarnings } from "../../repositories/delivery.repository.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// The day, week (Monday to Sunday) or month that contains "2026-10-10", in Ghana time.
// Ghana is on UTC all year, so each one starts at midnight UTC.
export const periodRange = (period, day) => {
  const start = new Date(day + "T00:00:00Z");

  if (period === "week") {
    const daysSinceMonday = (start.getUTCDay() + 6) % 7;
    const from = new Date(start.getTime() - daysSinceMonday * ONE_DAY_MS);
    return { from, to: new Date(from.getTime() + 7 * ONE_DAY_MS) };
  }
  if (period === "month") {
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth();
    return { from: new Date(Date.UTC(year, month, 1)), to: new Date(Date.UTC(year, month + 1, 1)) };
  }
  return { from: start, to: new Date(start.getTime() + ONE_DAY_MS) };
};

// Completed deliveries and what they earned, for a day, week or month [AC-RIDER-07].
// Only DELIVERED counts: each order's rider earnings were fixed when it was placed.
//   query: { period: "day" | "week" | "month", date?: "2026-10-10", page, pageSize }
export const getMyEarnings = async (userId, query, now = new Date()) => {
  const day = query.date || now.toISOString().slice(0, 10);
  const { from, to } = periodRange(query.period, day);
  const range = { period: query.period, from, to };

  const profile = await findRiderProfileByUserId(userId);
  if (!profile) {
    return {
      summary: { ...range, deliveryCount: 0, earningsPesewas: 0 },
      deliveries: [],
      meta: buildPageMeta(query, 0),
    };
  }

  const { limit, offset } = toLimitAndOffset(query);
  const [totals, { rows, count }] = await Promise.all([
    sumRiderEarnings({ riderProfileId: profile.id, from, to }),
    findDeliveredForRider({ riderProfileId: profile.id, from, to, limit, offset }),
  ]);

  const deliveries = rows.map((delivery) => ({
    deliveryId: delivery.id,
    orderNumber: delivery.order.orderNumber,
    restaurantName: delivery.order.restaurant.name,
    restaurantArea: delivery.order.restaurant.area,
    dropoffArea: delivery.order.deliveryArea,
    distanceMetres: delivery.order.deliveryDistanceMeters,
    pickedUpAt: delivery.pickedUpAt,
    deliveredAt: delivery.deliveredAt,
    earningsPesewas: delivery.order.riderEarningsPesewas,
  }));

  return { summary: { ...range, ...totals }, deliveries, meta: buildPageMeta(query, count) };
};
