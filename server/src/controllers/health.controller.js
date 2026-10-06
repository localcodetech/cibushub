import pkg from "../../package.json" with { type: "json" };
import sequelize from "../config/database.js";
import redis from "../config/redis.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), ms)),
  ]);

const checkService = async (check) => {
  try {
    await withTimeout(check(), 2000);
    return "up";
  } catch {
    return "down";
  }
};

export const getHealth = async (req, res) => {
  const [mysqlStatus, redisStatus] = await Promise.all([
    checkService(() => sequelize.authenticate()),
    checkService(() => redis.ping()),
  ]);

  const services = { mysql: mysqlStatus, redis: redisStatus };

  if (mysqlStatus === "down" || redisStatus === "down") {
    throw new AppError(503, "SERVICE_UNAVAILABLE", "One or more services are unavailable", [
      { service: "mysql", status: mysqlStatus },
      { service: "redis", status: redisStatus },
    ]);
  }

  return sendSuccess(res, {
    status: "ok",
    version: pkg.version,
    uptime: Math.floor(process.uptime()),
    services,
  });
};
