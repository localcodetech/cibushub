import { afterAll, beforeEach, vi } from "vitest";
import env from "../src/config/env/env.js";
import sequelize from "../src/config/database.js";
import redis from "../src/config/redis.js";
import { sentSms } from "./helpers/fakeSms.js";
import { scheduledJobs } from "./helpers/fakeJobs.js";

if (env.NODE_ENV !== "test" || !env.MYSQL_DATABASE.endsWith("_test")) {
  throw new Error("Tests must run with NODE_ENV=test on a *_test database. Use: npm test");
}

vi.mock("../src/services/notifications/sms.service.js", async () => {
  const { sentSms: inbox } = await import("./helpers/fakeSms.js");

  return {
    sendSms: async (phone, message) => {
      inbox.push({ phone, message });
    },
  };
});

// Scheduling a background job is only recorded in tests; job logic is tested by calling it directly
vi.mock("../src/jobs/enqueue.js", async () => {
  const { scheduledJobs: list } = await import("./helpers/fakeJobs.js");

  return {
    UNPAID_ORDER_MINUTES: 30,
    RESTAURANT_RESPONSE_MINUTES: 5,
    scheduleRestaurantTimeout: async (orderId) => {
      list.push({ name: "rejectUnansweredOrder", orderId });
    },
    scheduleUnpaidOrderExpiry: async (orderId) => {
      list.push({ name: "expireUnpaidOrder", orderId });
    },
    scheduleRefund: async (refundId) => {
      list.push({ name: "processRefund", refundId });
    },
    scheduleDeliverySearch: async (deliveryId) => {
      list.push({ name: "offerDelivery", deliveryId });
    },
    scheduleOfferExpiry: async (deliveryId, offerId, delayMs) => {
      list.push({ name: "offerDelivery", deliveryId, offerId, delayMs });
    },
  };
});

const emptyAllTables = async () => {
  const [rows] = await sequelize.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> 'SequelizeMeta'",
  );

  await sequelize.transaction(async (transaction) => {
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0", { transaction });
    for (const row of rows) {
      await sequelize.query(`TRUNCATE TABLE \`${row.name}\``, { transaction });
    }
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1", { transaction });
  });
};

beforeEach(async () => {
  sentSms.length = 0;
  scheduledJobs.length = 0;
  await redis.flushdb();
  await emptyAllTables();
});

afterAll(async () => {
  await sequelize.close();
  await redis.quit();
});
