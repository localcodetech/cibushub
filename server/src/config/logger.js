import pino from "pino";
import env from "./env/env.js";

const logger = pino({
  level: "info",
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
});

export default logger;
