import express from "express";
import helmet from "helmet";
import cors from "cors";
import env from "./config/env/env.js";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";
import { randomUUID } from "node:crypto";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

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

app.use(helmet());

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

app.use(express.json({ limit: "100kb" }));

app.use("/api/health", healthRoutes);

app.use("/api/v1/auth", authRoutes);

app.use(notFound);

app.use(errorHandler);

export default app;
