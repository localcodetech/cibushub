import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";

// The sums behind one restaurant's charts [AC-ANL-03]. Every query is limited to ONE
// restaurant (:restaurantId), which the service has already checked belongs to the owner.
// Same rules as the admin charts (docs/analytics.md): an order counts on the day it became PAID.
//   from: first moment of the range; to: first moment AFTER the range

// This restaurant's orders that became PAID in the range.
// extraJoin: another table to bring in, e.g. the order lines
const paidHere = (extraJoin = "") => `
  FROM order_status_history AS h
  JOIN orders AS o ON o.id = h.order_id
  ${extraJoin}
  WHERE h.to_status = 'PAID' AND h.created_at >= :from AND h.created_at < :to
    AND o.restaurant_id = :restaurantId
`;

const toNumber = (value) => Number(value || 0);

// [{ day, orders, earningsPesewas }], only days with orders.
// Earnings: the restaurant's share (food minus commission), on DELIVERED orders only
export const sumRestaurantOrdersByDay = async (restaurantId, from, to) => {
  const rows = await sequelize.query(
    `SELECT DATE_FORMAT(h.created_at, '%Y-%m-%d') AS day,
            COUNT(*) AS orders,
            SUM(CASE WHEN o.status = 'DELIVERED' THEN o.restaurant_earnings_pesewas ELSE 0 END)
              AS earnings
     ${paidHere()}
     GROUP BY day
     ORDER BY day`,
    { replacements: { restaurantId, from, to }, type: QueryTypes.SELECT },
  );
  return rows.map((row) => ({
    day: row.day,
    orders: toNumber(row.orders),
    earningsPesewas: toNumber(row.earnings),
  }));
};

// The dishes sold most, from paid orders that weren't rejected or cancelled.
// Grouped by menu item, under the dish's name on the menu today (or, if the dish was removed,
// the name it was sold under). [{ menuItemId, name, quantity, salesPesewas }]
export const findBestSellers = async (restaurantId, from, to, limit) => {
  const rows = await sequelize.query(
    `SELECT i.menu_item_id AS menuItemId,
            COALESCE(m.name, MAX(i.name)) AS name,
            SUM(i.quantity) AS quantity,
            SUM(i.line_total_pesewas) AS sales
     ${paidHere(`JOIN order_items AS i ON i.order_id = o.id
                 LEFT JOIN menu_items AS m ON m.id = i.menu_item_id`)}
       AND o.status NOT IN ('REJECTED', 'CANCELLED')
     GROUP BY i.menu_item_id, m.name
     ORDER BY quantity DESC, sales DESC
     LIMIT :limit`,
    { replacements: { restaurantId, from, to, limit }, type: QueryTypes.SELECT },
  );
  return rows.map((row) => ({
    menuItemId: row.menuItemId,
    name: row.name,
    quantity: toNumber(row.quantity),
    salesPesewas: toNumber(row.sales),
  }));
};

// Stars per day from visible reviews written in the range
// [{ day, reviews, stars }]: stars is the total, so averages over any period stay exact
export const sumRatingsByDay = async (restaurantId, from, to) => {
  const rows = await sequelize.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
            COUNT(*) AS reviews,
            SUM(rating) AS stars
     FROM reviews
     WHERE restaurant_id = :restaurantId AND hidden_at IS NULL
       AND created_at >= :from AND created_at < :to
     GROUP BY day
     ORDER BY day`,
    { replacements: { restaurantId, from, to }, type: QueryTypes.SELECT },
  );
  return rows.map((row) => ({
    day: row.day,
    reviews: toNumber(row.reviews),
    stars: toNumber(row.stars),
  }));
};
