// Verify the seeded test user: login hash, diary-password decrypt of the master
// key, and entry decryption round-trip.
const { MongoClient } = require("mongodb");
const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const URI = process.env.MONGODB_URI;
const DB = "withink_dev";
const EMAIL = "test@test.com";
const LOGIN_PASSWORD = "test@123";
const DIARY_PASSWORD = "test@test";

function decrypt(text, key) {
  const [ivHex, dataHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const tag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(0, data.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

async function verifyScrypt(hash, password) {
  const [salt, keyHex] = hash.split(":");
  const key = await scrypt(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return key.toString("hex") === keyHex;
}

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB);

  const user = await db.collection("user").findOne({ email: EMAIL });
  if (!user) throw new Error("User not found");
  const userIdStr = String(user._id);
  const account = await db.collection("account").findOne({ userId: user._id });
  const enc = await db.collection("clientencryptionsettings").findOne({ userId: userIdStr });
  const lock = await db.collection("locksettings").findOne({ userId: userIdStr });
  const entryCount = await db.collection("entries").countDocuments({ userId: userIdStr });
  const sampleEntries = await db.collection("entries")
    .find({ userId: userIdStr })
    .sort({ date: -1 })
    .limit(5)
    .toArray();

  const desc = (v) =>
    v === null || v === undefined ? String(v) : (v.constructor && v.constructor.name) || typeof v;

  console.log(`user        : ${user.name} <${user.email}> verified=${user.emailVerified}`);
  console.log(`id types    : user._id=${desc(user._id)} account._id=${desc(account._id)} account.userId=${desc(account.userId)} account.accountId=${desc(account.accountId)}`);
  console.log(`login hash  : ${(await verifyScrypt(account.password, LOGIN_PASSWORD)) ? "OK (test@123)" : "FAIL"}`);
  console.log(`entries     : ${entryCount}`);
  console.log(`lock enabled: ${lock.isLockEnabled} (passcodeHash present: ${!!lock.passcodeHash})`);

  // Decrypt the master key with the diary password.
  const diaryKey = crypto.pbkdf2Sync(DIARY_PASSWORD, Buffer.from(enc.encryptionSalt, "hex"), 100000, 32, "sha256");
  const masterKeyHex = decrypt(enc.verificationCiphertext, diaryKey);
  const masterKey = Buffer.from(masterKeyHex, "hex");
  console.log(`master key  : decrypts with diary password -> ${masterKeyHex === masterKeyHex.slice(0, 100) ? "yes" : "??"} (${masterKeyHex.length} hex chars)`);

  // Decrypt a few entries.
  for (const e of sampleEntries) {
    const title = decrypt(e.title, masterKey);
    const text = decrypt(e.contentText, masterKey);
    const words = text.split(/\s+/).filter(Boolean).length;
    console.log(`  ${e.date} | mood=${e.mood} | words=${words} | "${title.slice(0, 40)}..." | plaintext=${!title.includes(":") && text.length > 50}`);
  }

  // Confirm the master key length is exactly 64 hex chars (32 bytes).
  console.log(`master key length ok: ${masterKeyHex.length === 64}`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});