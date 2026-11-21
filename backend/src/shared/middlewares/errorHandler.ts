import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { ZodError } from "zod";
import { logger } from "../../config/logger";
import { AppError } from "../errors/AppError";

interface MongoDuplicateError {
  code: number;
  keyValue?: Record<string, unknown>;
}

function isMongoDuplicateError(err: unknown): err is MongoDuplicateError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      message: err.message,
      ...(err.code ? { code: err.code } : {})
    });
    return;
  }

  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({
      message: first?.message ?? "Invalid request data"
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file is too large"
        : err.message;
    res.status(400).json({ message });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: `Invalid ${err.path}` });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const firstError = Object.values(err.errors)[0];
    res.status(400).json({ message: firstError?.message ?? "Validation failed" });
    return;
  }

  if (isMongoDuplicateError(err)) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : undefined;
    res.status(409).json({
      message: field ? `A record with this ${field} already exists` : "Duplicate record"
    });
    return;
  }

  // Handle malformed JSON payloads from express.json()
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as { status?: number }).status === 400
  ) {
    res.status(400).json({ message: "Malformed JSON request body" });
    return;
  }

  logger.error(
    { err, reqId: req.id, method: req.method, url: req.originalUrl },
    "Unhandled server error"
  );

  res.status(500).json({ message: "Internal server error" });
}
