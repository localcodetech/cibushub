import { Redis } from "ioredis";
import env from "./env/env.js";
import logger from "./logger.js";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (error) => logger.error({ err: error }, "Redis error"));

export default redis;
