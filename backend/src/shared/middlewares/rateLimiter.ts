import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Request } from "express";
import { env } from "../../config/env";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export interface LimiterOptions {
  windowMs?: number;
  max: number;
  keyBy?: "ip" | "user";
  skipSuccessfulRequests?: boolean;
  message?: string;
}

export function createLimiter(options: LimiterOptions): RateLimitRequestHandler {
  const {
    windowMs = FIFTEEN_MINUTES_MS,
    max,
    keyBy = "ip",
    skipSuccessfulRequests = false,
    message = "Too many requests. Please try again later."
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: () => env.NODE_ENV === "test",
    ...(keyBy === "user"
      ? {
          keyGenerator: (req: Request) => req.user?.id ?? "anonymous",
          validate: { keyGeneratorIpFallback: false }
        }
      : {}),
    message: { message }
  });
}

// Named MVP presets matching Catalyst's documented 15-minute windows
export const generalLimiter = createLimiter({ max: env.RATE_LIMIT_IP, keyBy: "ip" });
export const strictAuthLimiter = createLimiter({
  max: env.RATE_LIMIT_AUTH_FAILS,
  keyBy: "ip",
  skipSuccessfulRequests: true,
  message: "Too many failed attempts. Please try again later."
});
export const answerLimiter = createLimiter({ max: 100, keyBy: "user" });
export const submitLimiter = createLimiter({ max: 60, keyBy: "user" });
export const markDoneLimiter = createLimiter({ max: 60, keyBy: "user" });
export const flashcardRateLimiter = createLimiter({ max: 300, keyBy: "user" });
export const uploadLimiter = createLimiter({ max: 30, keyBy: "user" });
