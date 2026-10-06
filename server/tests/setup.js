import { afterAll, beforeEach, vi } from "vitest";
import env from "../src/config/env/env.js";
import sequelize from "../src/config/database.js";
import redis from "../src/config/redis.js";
import { sentSms } from "./helpers/fakeSms.js";

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
  await redis.flushdb();
  await emptyAllTables();
});

afterAll(async () => {
  await sequelize.close();
  await redis.quit();
});
