import pkg from "../../package.json" with { type: "json" };
import sequelize from "../config/database.js";
import redis from "../config/redis.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";

export const getHealth = async (req, res) => {
  let mysqlStatus = "up";
  let redisStatus = "up";

  try {
    await sequelize.authenticate();
  } catch {
    mysqlStatus = "down";
  }

  try {
    await redis.ping();
  } catch {
    redisStatus = "down";
  }

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
    services: { mysql: mysqlStatus, redis: redisStatus },
  });
};
