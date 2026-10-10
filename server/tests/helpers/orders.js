import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../../src/app.js";
import { Address, MenuCategory, MenuItem, Order } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { changeOrderStatus } from "../../src/services/order/changeOrderStatus.service.js";
import { createTestUser } from "./users.js";
import { createOwner, createTestRestaurant } from "./restaurants.js";

// A paid order, ready for the kitchen: owner, approved restaurant (Adum), customer and address.
// Place it while the restaurant is open: fake the clock to e.g. Saturday 12:00 Accra first.
// Marked PAID straight away (no Paystack payment), so nothing here ever triggers a refund.
// For a second, independent order in the same test, pass a different number: createPaidOrder(2)
export const createPaidOrder = async (number = 1) => {
  const owner = await createOwner({
    status: "ACTIVE",
    email: `owner${number}@example.com`,
    phone: `+23320111222${number}`,
  });
  const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
  const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Rice" });
  const waakye = await MenuItem.create({
    restaurantId: restaurant.id,
    categoryId: category.id,
    name: "Waakye",
    pricePesewas: 3000,
  });
  const customer = await createTestUser({
    fullName: "Ama Owusu",
    email: `ama${number}@example.com`,
    phone: `+23355123456${number}`,
  });
  // About 2 km from the restaurant
  const address = await Address.create({
    userId: customer.id,
    label: "HOME",
    latitude: 6.7045,
    longitude: -1.6155,
    landmark: "Blue gate opposite the pharmacy",
  });

  const placed = await request(app)
    .post("/api/v1/customer/orders")
    .set("Cookie", `access_token=${signAccessToken(customer)}`)
    .set("Idempotency-Key", randomUUID())
    .send({
      restaurantId: restaurant.id,
      addressId: address.id,
      items: [{ menuItemId: waakye.id, quantity: 2, optionIds: [], seenUnitPricePesewas: 3000 }],
    });
  if (placed.status !== 201) {
    throw new Error("Test order not placed: " + JSON.stringify(placed.body));
  }

  await changeOrderStatus({
    orderId: placed.body.data.id,
    toStatus: "PAID",
    actor: { userId: null, role: "SYSTEM" },
    extraChanges: { paymentStatus: "PAID" },
    isAllowedFor: () => true,
  });

  const order = await Order.findByPk(placed.body.data.id);
  return { order, customer, owner, restaurant, address };
};
