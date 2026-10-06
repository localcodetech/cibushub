import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./config/env/env.js";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";
import { randomUUID } from "node:crypto";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

// Log every request on one line, with a unique request ID
app.use(
  pinoHttp({
    logger,
    genReqId: () => randomUUID(),
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (req, res, error) => {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);

// Security headers
app.use(helmet());

// Allow only the React app to call the API, with cookies
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

// Read JSON request bodies (max 100 kb)
app.use(express.json({ limit: "100kb" }));

// Read cookies sent by the browser
app.use(cookieParser());

// Health check
app.use("/api/health", healthRoutes);

// Auth: register, verify phone, login
app.use("/api/v1/auth", authRoutes);

// Unknown routes → 404
app.use(notFound);

// Turn every error into the standard error response (must stay last)
app.use(errorHandler);

export default app;
