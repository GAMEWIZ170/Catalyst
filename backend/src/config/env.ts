import dotenv from "dotenv";
import { z } from "zod";

// Load backend/.env only outside tests so test runs stay isolated from real credentials.
if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

const isTest = process.env.NODE_ENV === "test";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: isTest
    ? z.string().default("mongodb://127.0.0.1:27017/catalyst_test")
    : z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: isTest
    ? z.string().default("test-jwt-secret-at-least-32-chars-long")
    : z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  CLIENT_URL: z.string().url("CLIENT_URL must be a valid URL").default("http://localhost:5173"),
  CLOUDINARY_URL: isTest
    ? z.string().default("cloudinary://test_key:test_secret@test_cloud")
    : z.string().min(1, "CLOUDINARY_URL is required"),
  TRUST_PROXY: z.string().optional(),
  REQUIRE_SUBSCRIPTION: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  RATE_LIMIT_IP: z.coerce.number().int().positive().default(1000),
  RATE_LIMIT_AUTH_FAILS: z.coerce.number().int().positive().default(20)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;

export function parseTrustProxy(value: string | undefined): number | string | false {
  if (!value) return false;
  return /^\d+$/.test(value) ? Number(value) : value;
}
