// Sentry first, so it is running before anything else can crash
import "./config/sentry.js";
import app from "./app.js";
import env from "./config/env/env.js";
import logger from "./config/logger.js";
import sequelize from "./config/database.js";
import redis from "./config/redis.js";
import { createSocketServer } from "./sockets/socketServer.js";
import { flushErrors } from "./config/sentry.js";

// ─────────────────────────────────────────────
// Start the API on the port from .env
// ─────────────────────────────────────────────
const server = app.listen(env.PORT, "0.0.0.0", (error) => {
  if (error) throw error;
  logger.info(`CibusHub API is running on ${env.PORT}`);
});

// ─────────────────────────────────────────────
// Live updates: Socket.IO on the same server and port [AC-RT-01]
// ─────────────────────────────────────────────
const sockets = createSocketServer(server);

// ─────────────────────────────────────────────
// Graceful shutdown: finish requests, then close MySQL and Redis
// ─────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);

  // Closing Socket.IO also closes the HTTP server: open requests finish first
  sockets.close().then(async () => {
    logger.info("Server and sockets closed");

    await sequelize.close();
    logger.info("MySQL connection closed");

    await redis.quit();
    logger.info("Redis connection closed");

    await flushErrors();
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 8000).unref();
};

// ─────────────────────────────────────────────
// Docker stop (SIGTERM) or Ctrl+C (SIGINT) → shut down gracefully
// ─────────────────────────────────────────────
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
