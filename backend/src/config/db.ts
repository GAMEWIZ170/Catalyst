import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

export async function connectDB(uri: string = env.MONGODB_URI): Promise<void> {
  await mongoose.connect(uri);
  logger.info({ db: mongoose.connection.name }, "MongoDB connected");
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  }
}

export function isDBReady(): boolean {
  return mongoose.connection.readyState === 1;
}
