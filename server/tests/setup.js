import { afterAll, beforeEach, vi } from "vitest";
import env from "../src/config/env/env.js";
import sequelize from "../src/config/database.js";
import redis from "../src/config/redis.js";
import { sentSms } from "./helpers/fakeSms.js";
import { emailFailures, sentEmails } from "./helpers/fakeEmail.js";
import { scheduledJobs } from "./helpers/fakeJobs.js";

if (env.NODE_ENV !== "test" || !env.MYSQL_DATABASE.endsWith("_test")) {
  throw new Error("Tests must run with NODE_ENV=test on a *_test database. Use: npm test");
}

vi.mock("../src/services/notifications/sms.service.js", async () => {
  const { sentSms: inbox } = await import("./helpers/fakeSms.js");

  return {
    maskPhone: (phone) => phone,
    sendSms: async (phone, message) => {
      inbox.push({ phone, message });
      return { ok: true, id: "test-sms-" + inbox.length };
    },
  };
});

// Emails are only collected in tests: a real RESEND_API_KEY in .env must never send from a test
vi.mock("../src/services/notifications/email.service.js", async () => {
  const { sentEmails: inbox, emailFailures: failures } = await import("./helpers/fakeEmail.js");

  return {
    maskEmail: (email) => email.slice(0, 2) + "***@" + email.split("@")[1],
    sendEmail: async (to, subject, text, options = {}) => {
      if (failures.length > 0) {
        return failures.shift();
      }
      inbox.push({ to, subject, text, ...options });
      return { ok: true, id: "test-email-" + inbox.length };
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
    // Emails and SMS are "sent" at once in tests (into the fake inboxes), so a test can read
    // the code it just asked for. The real queue's retries are tested on processNotification.
    scheduleNotification: async (logId, payload) => {
      list.push({ name: "sendNotification", logId });
      const { processNotification } =
        await import("../src/services/notifications/notify.service.js");
      // Like the real queue, a failed first try doesn't reach the caller
      try {
        await processNotification({
          data: { logId, payload },
          attemptsMade: 0,
          opts: { attempts: 3 },
        });
      } catch {
        // "queued for another try"
      }
      return true;
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
  sentEmails.length = 0;
  emailFailures.length = 0;
  scheduledJobs.length = 0;
  await redis.flushdb();
  await emptyAllTables();
});

afterAll(async () => {
  await sequelize.close();
  await redis.quit();
});
