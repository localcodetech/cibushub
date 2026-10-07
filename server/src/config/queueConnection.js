import { Redis } from "ioredis";
import env from "./env/env.js";

// BullMQ needs its own Redis connections, and they must wait for Redis instead of giving up
// (maxRetriesPerRequest: null), so a short Redis hiccup never loses a job
export const createQueueConnection = () => {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
};
