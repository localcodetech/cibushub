import pino from "pino";
import env from "./env/env.js";

const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { singleLine: true, ignore: "pid,hostname" },
        }
      : undefined,
});

export default logger;
