import app from "./app.js";
import env from "./config/env/env.js";
import logger from "./config/logger.js";

const server = app.listen(env.PORT, "0.0.0.0", (error) => {
  if (error) throw error;
  logger.info(`CibusHub API is running on ${env.PORT}`);
});

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 8000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
