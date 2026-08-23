import "server-only";

import { MongoClient } from "mongodb";

import { env } from "@/config/env";

const uri = env.MONGODB_URI;
const options = {
  // Match the Mongoose client's fail-fast posture: an unreachable cluster
  // should error in seconds, not hang requests for the 30s driver default.
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
};

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  client = globalWithMongo._mongoClient;
} else {
  client = new MongoClient(uri, options);
}

export { client };
