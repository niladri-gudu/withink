import "server-only";

import mongoose from "mongoose";

import { env } from "@/config/env";
import { logger } from "@/server/logger";

const MONGODB_URI = env.MONGODB_URI;

const globalWithMongoose = global as typeof globalThis & {
  _mongoose?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

if (!globalWithMongoose._mongoose) {
  globalWithMongoose._mongoose = { conn: null, promise: null };
}

const cached = globalWithMongoose._mongoose;

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const DB_NAME = env.IS_PROD ? "withink_prod" : "withink_dev";
    logger.info("Initializing Mongoose connection", { dbName: DB_NAME });

    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: DB_NAME,
        bufferCommands: false,
        // Fail fast instead of hanging a request for the driver default
        // (30s server selection) when the cluster is unreachable.
        serverSelectionTimeoutMS: 5_000,
        connectTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 10,
      })
      .then((mongooseInstance) => {
        logger.info("Mongoose connected successfully", { dbName: DB_NAME });
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    logger.error("Mongoose connection failed", e as Error);
    throw e;
  }

  return cached.conn;
}
