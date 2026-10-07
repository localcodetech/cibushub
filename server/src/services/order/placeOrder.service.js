import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { generateOrderNumber } from "../../utils/order/orderNumber.js";
import { buildQuote } from "../checkout/quote.service.js";
import { clearCachedMenu } from "../menu/menuCache.service.js";
import { scheduleUnpaidOrderExpiry } from "../../jobs/enqueue.js";
import { decreaseStock, lockItemsForOrder } from "../../repositories/menu.repository.js";
import {
  addStatusHistory,
  createOrderWithItems,
  findOrderByIdempotencyKey,
  findOrderWithDetails,
} from "../../repositories/order.repository.js";

const MAX_NUMBER_CLASHES = 3;

const blocked = (problems) => {
  return new AppError(
    409,
    "CHECKOUT_BLOCKED",
    "Something in your order changed. Please review it and try again",
    problems,
  );
};

// Every problem in one list: the restaurant's, then each line's with its item [AC-CHK-05]
const allProblems = (quote) => {
  const lineProblems = quote.lines
    .filter((line) => line.problems.length > 0)
    .flatMap((line) =>
      line.problems.map((lineProblem) => ({
        ...lineProblem,
        menuItemId: line.menuItemId,
        name: line.name,
      })),
    );

  return [...quote.problems, ...lineProblems];
};

// The frozen copy of each line and its options [AC-CHK-07]
const toOrderItems = (lines) => {
  return lines.map((line) => ({
    menuItemId: line.menuItemId,
    name: line.name,
    basePricePesewas: line.basePricePesewas,
    unitPricePesewas: line.unitPricePesewas,
    quantity: line.quantity,
    lineTotalPesewas: line.lineTotalPesewas,
    options: line.options.map((option) => ({
      optionId: option.id,
      groupName: option.groupName,
      name: option.name,
      extraPricePesewas: option.extraPricePesewas,
    })),
  }));
};

// Everything inside ONE transaction: if any step fails, nothing is saved [AC-CHK-06]
const createOrder = async (customerId, checkout, idempotencyKey, transaction) => {
  // 1. Lock the dishes first, so nobody else can change their stock until we finish
  const itemIds = [...new Set(checkout.items.map((line) => line.menuItemId))];
  const lockedItems = await lockItemsForOrder(itemIds, transaction);

  // 2. Price everything again from the database, ignoring anything the browser thinks [AC-CHK-02]
  const quote = await buildQuote(customerId, checkout, transaction);

  if (!quote.canPlaceOrder) {
    throw blocked(allProblems(quote));
  }

  // 3. Take the stock; the same dish can be on two lines with different options
  const quantityByItem = {};
  for (const line of quote.lines) {
    quantityByItem[line.menuItemId] = (quantityByItem[line.menuItemId] || 0) + line.quantity;
  }

  let stockChanged = false;
  for (const item of lockedItems) {
    if (item.stockRemaining === null) {
      continue; // not tracked
    }

    const enough = await decreaseStock(item.id, quantityByItem[item.id], transaction);
    if (!enough) {
      throw blocked([
        {
          code: "NOT_ENOUGH_STOCK",
          message: `Only ${item.stockRemaining} left today`,
          menuItemId: item.id,
        },
      ]);
    }
    stockChanged = true;
  }

  // 4. The order, with frozen copies of the items, address and phone
  const address = quote.deliveryAddress;
  const order = await createOrderWithItems(
    {
      orderNumber: generateOrderNumber(),
      customerId,
      restaurantId: quote.restaurant.id,
      subtotalPesewas: quote.subtotalPesewas,
      deliveryFeePesewas: quote.deliveryFeePesewas,
      serviceFeePesewas: quote.serviceFeePesewas,
      discountPesewas: quote.discountPesewas,
      totalPesewas: quote.totalPesewas,
      deliveryDistanceMeters: quote.delivery.roadMeters,
      pricingSnapshot: quote.pricingSnapshot,
      deliveryLabel: address.label,
      deliveryLatitude: address.latitude,
      deliveryLongitude: address.longitude,
      deliveryGhanaPostGps: address.ghanaPostGps,
      deliveryArea: address.area,
      deliveryLandmark: address.landmark,
      contactPhone: quote.contactPhone,
      restaurantNote: checkout.restaurantNote,
      // The rider note falls back to the address's own delivery instructions
      riderNote: checkout.riderNote ?? address.deliveryInstructions,
      idempotencyKey,
      items: toOrderItems(quote.lines),
    },
    transaction,
  );

  // 5. The first line of the order's history [AC-ORD-04]
  await addStatusHistory(
    {
      orderId: order.id,
      fromStatus: null,
      toStatus: "PENDING_PAYMENT",
      actorUserId: customerId,
      actorRole: "CUSTOMER",
    },
    transaction,
  );

  return { orderId: order.id, restaurantId: order.restaurantId, stockChanged };
};

// Returns { order, isNew }. The same key from the same customer always gives the same order [AC-CHK-09]
export const placeOrder = async (customerId, checkout, idempotencyKey) => {
  const earlier = await findOrderByIdempotencyKey(customerId, idempotencyKey);
  if (earlier) {
    return { order: earlier, isNew: false };
  }

  for (let attempt = 1; attempt <= MAX_NUMBER_CLASHES; attempt += 1) {
    try {
      const created = await retryOnDeadlock(() =>
        sequelize.transaction((transaction) =>
          createOrder(customerId, checkout, idempotencyKey, transaction),
        ),
      );

      // The public menu shows stock, so its cached copy must be refreshed
      if (created.stockChanged) {
        await clearCachedMenu(created.restaurantId);
      }

      // Cancel it in 30 minutes if it is still unpaid
      await scheduleUnpaidOrderExpiry(created.orderId);

      return { order: await findOrderWithDetails(created.orderId), isNew: true };
    } catch (error) {
      if (error.name !== "SequelizeUniqueConstraintError") {
        throw error;
      }

      // A double click that arrived at the same moment: the other request saved the order
      const sameKeyOrder = await findOrderByIdempotencyKey(customerId, idempotencyKey);
      if (sameKeyOrder) {
        return { order: sameKeyOrder, isNew: false };
      }

      // Otherwise the random order number was already taken: try again with a new one
      if (attempt === MAX_NUMBER_CLASHES) {
        throw error;
      }
    }
  }
};
