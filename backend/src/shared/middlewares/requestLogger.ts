import crypto from "crypto";
import pinoHttp from "pino-http";
import type { IncomingMessage, ServerResponse } from "http";
import { logger } from "../../config/logger";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const incoming = req.headers["x-request-id"];
    const id = typeof incoming === "string" && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : crypto.randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`
});
