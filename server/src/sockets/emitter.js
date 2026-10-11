import { Emitter } from "@socket.io/redis-emitter";
import redis from "../config/redis.js";

// Sends live events through Redis, so it works from the API AND from the worker process:
// every API instance's Socket.IO (Redis adapter) delivers them to the right screens [AC-RT-10].
let emitter = null;

export const getEmitter = () => {
  if (!emitter) {
    emitter = new Emitter(redis);
  }
  return emitter;
};
