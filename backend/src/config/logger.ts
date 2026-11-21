import pino from "pino";
import { env } from "./env";

const level = env.LOG_LEVEL ?? (env.NODE_ENV === "test" ? "silent" : "info");

export const logger = pino({
  level,
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "res.headers['set-cookie']",
      "*.password",
      "*.token",
      "*.JWT_SECRET",
      "*.CLOUDINARY_URL"
    ],
    censor: "[REDACTED]"
  },
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname"
          }
        }
      }
    : {})
});
