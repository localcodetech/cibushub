import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";

// The sums behind the admin charts [AC-ANL-01, AC-ANL-05]. Each one is a single GROUP BY in
// MySQL [AC-ANL-06], never "load every order and add them up in JavaScript".
// Rules (docs/analytics.md):
//   - an order counts on the day it became PAID (order_status_history), so unpaid orders never count
//   - customers paid = order total minus refunds that went through
//   - CibusHub kept = commission + service fee, on DELIVERED orders only
// Ghana is on UTC all year, so a UTC day is a Ghana day.
//   from: first moment of the range; to: first moment AFTER the range

// The orders that became PAID in the range, each with what was refunded on it.
// extraJoin: another table to bring in, e.g. the restaurant's name
const paidInRange = (extraJoin = "") => `
  FROM order_status_history AS h
  JOIN orders AS o ON o.id = h.order_id
  ${extraJoin}
  LEFT JOIN (
    SELECT order_id, SUM(amount_pesewas) AS refunded
    FROM refunds
    WHERE status = 'PROCESSED'
    GROUP BY order_id
  ) AS r ON r.order_id = o.id
  WHERE h.to_status = 'PAID' AND h.created_at >= :from AND h.created_at < :to
`;

const NET_PAID = "o.total_pesewas - COALESCE(r.refunded, 0)";
const CIBUSHUB_KEPT =
  "CASE WHEN o.status = 'DELIVERED' THEN o.commission_pesewas + o.service_fee_pesewas ELSE 0 END";

// MySQL hands SUM back as text; every number leaves here as a whole number
const toNumber = (value) => Number(value || 0);

// [{ day: "2026-10-09", orders, customerPaidPesewas, cibushubPesewas }], only days with orders
export const sumPaidOrdersByDay = async (from, to) => {
  const rows = await sequelize.query(
    `SELECT DATE_FORMAT(h.created_at, '%Y-%m-%d') AS day,
            COUNT(*) AS orders,
            SUM(${NET_PAID}) AS customerPaid,
            SUM(${CIBUSHUB_KEPT}) AS cibushub
     ${paidInRange()}
     GROUP BY day
     ORDER BY day`,
    { replacements: { from, to }, type: QueryTypes.SELECT },
  );
  return rows.map((row) => ({
    day: row.day,
    orders: toNumber(row.orders),
    customerPaidPesewas: toNumber(row.customerPaid),
    cibushubPesewas: toNumber(row.cibushub),
  }));
};

// The restaurants customers paid most at in the range
// [{ restaurantId, name, orders, customerPaidPesewas }]
export const findTopRestaurants = async (from, to, limit) => {
  const rows = await sequelize.query(
    `SELECT o.restaurant_id AS restaurantId,
            rest.name AS name,
            COUNT(*) AS orders,
            SUM(${NET_PAID}) AS customerPaid
     ${paidInRange("JOIN restaurants AS rest ON rest.id = o.restaurant_id")}
     GROUP BY o.restaurant_id, rest.name
     ORDER BY customerPaid DESC, orders DESC
     LIMIT :limit`,
    { replacements: { from, to, limit }, type: QueryTypes.SELECT },
  );
  return rows.map((row) => ({
    restaurantId: row.restaurantId,
    name: row.name,
    orders: toNumber(row.orders),
    customerPaidPesewas: toNumber(row.customerPaid),
  }));
};

// Orders placed in the range by where they are now: { DELIVERED: 12, CANCELLED: 1, ... }
// Unlike the money, this includes orders never paid (PENDING_PAYMENT), so admins see them too.
export const countPlacedOrdersByStatus = async (from, to) => {
  const rows = await sequelize.query(
    `SELECT status, COUNT(*) AS orders
     FROM orders
     WHERE created_at >= :from AND created_at < :to
     GROUP BY status`,
    { replacements: { from, to }, type: QueryTypes.SELECT },
  );
  return Object.fromEntries(rows.map((row) => [row.status, toNumber(row.orders)]));
};

// How fast orders move, for orders that became PAID in the range [AC-ANL-02].
// Each order's first time in each status comes from order_status_history; AVG skips orders
// that never reached a status, so "average delivery" only counts delivered orders.
// Times are in seconds. Rates are worked out from the counts in the service.
export const measureOrderTimes = async (from, to) => {
  const [row] = await sequelize.query(
    `SELECT COUNT(*) AS paidOrders,
            SUM(o.status = 'REJECTED') AS rejected,
            SUM(o.status = 'CANCELLED') AS cancelled,
            AVG(TIMESTAMPDIFF(SECOND, t.paid, t.accepted)) AS acceptSeconds,
            AVG(TIMESTAMPDIFF(SECOND, t.accepted, t.ready)) AS prepareSeconds,
            AVG(TIMESTAMPDIFF(SECOND, t.ready, t.assigned)) AS assignSeconds,
            AVG(TIMESTAMPDIFF(SECOND, t.pickedUp, t.delivered)) AS deliverSeconds,
            AVG(TIMESTAMPDIFF(SECOND, t.paid, t.delivered)) AS totalSeconds
     FROM (
       SELECT h.order_id,
              MIN(CASE WHEN h.to_status = 'PAID' THEN h.created_at END) AS paid,
              MIN(CASE WHEN h.to_status = 'ACCEPTED' THEN h.created_at END) AS accepted,
              MIN(CASE WHEN h.to_status = 'READY_FOR_PICKUP' THEN h.created_at END) AS ready,
              MIN(CASE WHEN h.to_status = 'RIDER_ASSIGNED' THEN h.created_at END) AS assigned,
              MIN(CASE WHEN h.to_status = 'PICKED_UP' THEN h.created_at END) AS pickedUp,
              MIN(CASE WHEN h.to_status = 'DELIVERED' THEN h.created_at END) AS delivered
       FROM order_status_history AS h
       WHERE h.order_id IN (
         SELECT order_id FROM order_status_history
         WHERE to_status = 'PAID' AND created_at >= :from AND created_at < :to
       )
       GROUP BY h.order_id
     ) AS t
     JOIN orders AS o ON o.id = t.order_id`,
    { replacements: { from, to }, type: QueryTypes.SELECT },
  );

  // An average with no orders behind it is null ("no data"), not 0
  const seconds = (value) => (value === null ? null : Math.round(Number(value)));
  return {
    paidOrders: toNumber(row.paidOrders),
    rejected: toNumber(row.rejected),
    cancelled: toNumber(row.cancelled),
    acceptSeconds: seconds(row.acceptSeconds),
    prepareSeconds: seconds(row.prepareSeconds),
    assignSeconds: seconds(row.assignSeconds),
    deliverSeconds: seconds(row.deliverSeconds),
    totalSeconds: seconds(row.totalSeconds),
  };
};
