import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env, parseTrustProxy } from "./config/env";
import { requestLogger } from "./shared/middlewares/requestLogger";
import { generalLimiter } from "./shared/middlewares/rateLimiter";
import { notFound } from "./shared/middlewares/notFound";
import { errorHandler } from "./shared/middlewares/errorHandler";
import { rootRouter } from "./routes";

export function createApp(): Express {
  const app = express();

  const trustProxy = parseTrustProxy(env.TRUST_PROXY);
  if (trustProxy !== false) {
    app.set("trust proxy", trustProxy);
  }

  // Global security, parsing, logging, and rate-limiting middleware
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(generalLimiter);

  // Health checks and /api/v1 routes
  app.use(rootRouter);

  // Terminal 404 and central error handler (must stay last)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
