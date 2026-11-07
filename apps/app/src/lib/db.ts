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

// Reuse one client per process in every environment. Re-creating it in
// production (or on HMR module reload) throws away the connection pool and
// pays a fresh TLS handshake on the next request.
const globalWithMongo = global as typeof globalThis & {
  _mongoClient?: MongoClient;
};

if (!globalWithMongo._mongoClient) {
  globalWithMongo._mongoClient = new MongoClient(uri, options);
}
const client = globalWithMongo._mongoClient;

const DB_NAME = env.IS_PROD ? "withink_prod" : "withink_dev";

export { client, DB_NAME };
