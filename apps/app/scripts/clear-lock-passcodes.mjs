// Clears the diary-lock passcode (PIN) hash for every user in a given database.
//
// This is a one-off operational script. It is idempotent and only touches the
// `locksettings` collection:
//   - passcodeHash: set to "" (the PIN the user set is removed)
//   - isLockEnabled is left untouched
//
// It also purges the matching Redis cache keys (`lock:<userId>:settings`) so the
// app does not keep serving a stale passcode for up to an hour.
//
// Usage:
//   node scripts/clear-lock-passcodes.mjs --db=withink_dev [--redis-url=... --redis-token=...]
//
// The MONGODB_URI is read from app/.env.local unless MONGODB_URI is set in the
// environment. To run against production, provide the production MONGODB_URI via
// the MONGODB_URI env var and pass --db=withink_prod.
//
// Prints counts before and after; exits non-zero on any failure.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, "..");

function readArg(name) {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : undefined;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function parseDotEnv(filePath) {
  const content = readFileSync(filePath, "utf8");
  const vars = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function loadEnv() {
  const dotEnv = parseDotEnv(resolve(APP_DIR, ".env.local"));
  const mongodbUri = process.env.MONGODB_URI || dotEnv.MONGODB_URI;
  return {
    mongodbUri,
    redisUrl:
      process.env.UPSTASH_REDIS_REST_URL || dotEnv.UPSTASH_REDIS_REST_URL,
    redisToken:
      process.env.UPSTASH_REDIS_REST_TOKEN || dotEnv.UPSTASH_REDIS_REST_TOKEN,
  };
}

async function purgeRedis(redisUrl, redisToken, dbName) {
  if (!redisUrl || !redisToken) {
    console.log(
      "  (skipping Redis purge: no UPSTASH_REDIS_REST_URL/TOKEN available)",
    );
    return 0;
  }
  // Upstash REST scan is cursor based; scan up to a sane number of pages.
  const base = `${redisUrl.replace(/\/$/, "")}`;
  const headers = { Authorization: `Bearer ${redisToken}` };
  let cursor = "0";
  let deleted = 0;
  for (let page = 0; page < 50; page++) {
    const scanRes = await fetch(
      `${base}/scan/${cursor}?match=lock:*:settings&count=1000`,
      {
        headers,
      },
    );
    if (!scanRes.ok) {
      console.warn(`  Redis scan failed (HTTP ${scanRes.status})`);
      break;
    }
    const scanJson = await scanRes.json();
    if (!Array.isArray(scanJson.result)) break;
    const keys = scanJson.result[1] || [];
    for (const key of keys) {
      if (key.includes(":")) {
        await fetch(`${base}/del/${key}`, { headers }).catch(() => {});
        deleted++;
      }
    }
    cursor = String(scanJson.result[0]);
    if (cursor === "0" || cursor === "00") break;
  }
  console.log(
    `  Redis: purged ${deleted} lock settings cache key(s) (${dbName})`,
  );
  return deleted;
}

async function main() {
  const dbName = readArg("--db") || "withink_dev";
  const { mongodbUri, redisUrl, redisToken } = loadEnv();

  if (!mongodbUri) {
    throw new Error(
      "MONGODB_URI not found. Set MONGODB_URI in the environment or app/.env.local.",
    );
  }

  console.log(`Connecting to MongoDB database "${dbName}" ...`);
  await mongoose.connect(mongodbUri, { dbName, bufferCommands: false });
  const db = mongoose.connection.db;
  const col = db.collection("locksettings");

  const before = await col.countDocuments({
    passcodeHash: { $ne: "", $exists: true },
  });
  console.log(`Before: ${before} document(s) have a passcodeHash set`);

  if (hasFlag("--dry-run")) {
    console.log(
      "Dry run only — no changes were made. Re-run without --dry-run to apply.",
    );
    await mongoose.disconnect();
    return;
  }

  if (before === 0) {
    console.log("Nothing to clear.");
  } else {
    const res = await col.updateMany(
      { passcodeHash: { $ne: "", $exists: true } },
      { $set: { passcodeHash: "" } },
    );
    console.log(`Cleared passcodeHash on ${res.modifiedCount} document(s)`);
  }

  const after = await col.countDocuments({
    passcodeHash: { $ne: "", $exists: true },
  });
  console.log(`After: ${after} document(s) still have a passcodeHash set`);

  await mongoose.disconnect();
  await purgeRedis(redisUrl, redisToken, dbName);

  if (after !== 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
