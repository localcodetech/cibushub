import { beforeEach, describe, expect, it, vi } from "vitest";
import { Delivery, DeliveryOffer, RiderProfile } from "../../src/models/index.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

const SATURDAY_NOON = new Date("2026-10-10T12:00:00Z");

let order;
let rider;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SATURDAY_NOON);
  ({ order } = await createPaidOrder());
  vi.useRealTimers();

  const user = await createTestUser({
    role: "RIDER",
    email: "yaw.rider@example.com",
    phone: "+233241110000",
  });
  rider = await RiderProfile.create({
    userId: user.id,
    vehicleType: "MOTORBIKE",
    plateNumber: "M-21-GR 1234",
    ghanaCardNumber: "GHA-123456789-0",
    status: "APPROVED",
  });
});

const newDelivery = () =>
  Delivery.create({ orderId: order.id, searchRadiusKm: 5, searchStartedAt: new Date() });

describe("Delivery tables (plan-review C15, §2)", () => {
  it("starts a delivery as SEARCHING, with the radius as a number", async () => {
    const delivery = await newDelivery();
    const saved = await Delivery.findByPk(delivery.id);

    expect(saved.status).toBe("SEARCHING");
    expect(saved.searchRadiusKm).toBe(5);
    expect(saved.riderProfileId).toBeNull();
  });

  it("allows only one delivery per order", async () => {
    await newDelivery();

    await expect(newDelivery()).rejects.toThrow();
  });

  it("never offers the same delivery to the same rider twice [AC-ASSIGN-04]", async () => {
    const delivery = await newDelivery();
    const offer = () =>
      DeliveryOffer.create({
        deliveryId: delivery.id,
        riderProfileId: rider.id,
        pickupDistanceMetres: 800,
        offeredAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      });

    await offer();

    await expect(offer()).rejects.toThrow();
  });

  it("keeps the delivery code's hash out of normal reads", async () => {
    const delivery = await newDelivery();
    await Delivery.update({ deliveryCodeHash: "hashed-code" }, { where: { id: delivery.id } });

    const normal = await Delivery.findByPk(delivery.id);
    const withCode = await Delivery.scope("withCode").findByPk(delivery.id);

    expect(normal.toJSON()).not.toHaveProperty("deliveryCodeHash");
    expect(withCode.deliveryCodeHash).toBe("hashed-code");
  });
});
