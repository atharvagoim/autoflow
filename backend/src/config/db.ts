import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../lib/logger";

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("error", (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
