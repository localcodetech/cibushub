import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";

// The rows behind the CSV exports [AC-ANL-04], read a batch at a time.
// "after" is the last row of the previous batch ({ createdAt, id }); each batch carries on
// from there (keyset paging), so a long export never skips or repeats a row.
// Times come out as text in Ghana time (= UTC): "2026-10-09 12:00:05".

const afterClause = (alias, after) =>
  after ? `AND (${alias}.created_at, ${alias}.id) > (:afterCreatedAt, :afterId)` : "";

const afterValues = (after) =>
  after ? { afterCreatedAt: after.createdAt, afterId: after.id } : {};

// Orders placed in the range, oldest first, with what was really refunded on each
export const findOrdersForExport = ({ from, to, after, limit }) => {
  return sequelize.query(
    `SELECT o.id, o.created_at AS createdAt,
            o.order_number AS orderNumber,
            DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i:%s') AS placedAt,
            rest.name AS restaurant,
            o.status, o.payment_method AS paymentMethod, o.payment_status AS paymentStatus,
            o.subtotal_pesewas AS subtotal, o.delivery_fee_pesewas AS deliveryFee,
            o.service_fee_pesewas AS serviceFee, o.discount_pesewas AS discount,
            o.total_pesewas AS total,
            COALESCE(r.refunded, 0) AS refunded,
            o.commission_pesewas AS commission,
            o.restaurant_earnings_pesewas AS restaurantEarnings,
            o.rider_earnings_pesewas AS riderEarnings,
            o.delivery_area AS deliveryArea
     FROM orders AS o
     JOIN restaurants AS rest ON rest.id = o.restaurant_id
     LEFT JOIN (
       SELECT order_id, SUM(amount_pesewas) AS refunded
       FROM refunds WHERE status = 'PROCESSED' GROUP BY order_id
     ) AS r ON r.order_id = o.id
     WHERE o.created_at >= :from AND o.created_at < :to ${afterClause("o", after)}
     ORDER BY o.created_at, o.id
     LIMIT :limit`,
    { replacements: { from, to, limit, ...afterValues(after) }, type: QueryTypes.SELECT },
  );
};

// Payment attempts started in the range, oldest first, with what was refunded from each
export const findPaymentsForExport = ({ from, to, after, limit }) => {
  return sequelize.query(
    `SELECT p.id, p.created_at AS createdAt,
            p.reference,
            DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS startedAt,
            DATE_FORMAT(p.paid_at, '%Y-%m-%d %H:%i:%s') AS paidAt,
            o.order_number AS orderNumber,
            p.provider, p.channel, p.status,
            p.amount_pesewas AS amount,
            COALESCE(r.refunded, 0) AS refunded
     FROM payments AS p
     JOIN orders AS o ON o.id = p.order_id
     LEFT JOIN (
       SELECT payment_id, SUM(amount_pesewas) AS refunded
       FROM refunds WHERE status = 'PROCESSED' GROUP BY payment_id
     ) AS r ON r.payment_id = p.id
     WHERE p.created_at >= :from AND p.created_at < :to ${afterClause("p", after)}
     ORDER BY p.created_at, p.id
     LIMIT :limit`,
    { replacements: { from, to, limit, ...afterValues(after) }, type: QueryTypes.SELECT },
  );
};
