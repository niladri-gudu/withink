// Seed a verified test user into withink_dev with ~120 long encrypted entries.
//
//   login password : test@123
//   diary password : test@test   (zero-knowledge encryption password)
//
// Replicates the app's exact data formats:
//   - Better Auth user/account docs (scrypt hash, ISO timestamps)
//   - clientencryptionsettings (PBKDF2 100k + AES-256-GCM "iv:ciphertextHex")
//   - locksettings (pbkdf2 passcode hash; lock left disabled so no PIN needed)
//   - entries (per-field AES-256-GCM, WebCrypto-compatible format)
//
// Usage: node scripts/seed-test-user.cjs
const { MongoClient, ObjectId } = require("mongodb");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { makeEntry } = require("./seed-content.cjs");

const URI = process.env.MONGODB_URI;
const DB = "withink_dev";
const EMAIL = "test@test.com";
const LOGIN_PASSWORD = "test@123";
const DIARY_PASSWORD = "test@test";
const ENTRY_COUNT = 120;

const scrypt = promisify(crypto.scrypt);

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return `${iv.toString("hex")}:${enc.toString("hex")}`;
}

async function hashLoginPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${key.toString("hex")}`;
}

function hashPasscode(passcode) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(passcode, salt, 10000, 64, "sha256")
    .toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB);

  // Clean slate for the test account. Better Auth stores its own id fields as
  // BSON ObjectId while the app's mongoose collections use String, so wipe both
  // forms to clear any previously-seeded rows regardless of type.
  const existing = await db.collection("user").findOne({ email: EMAIL });
  if (existing) {
    const oldId = existing._id;
    const idStr = String(oldId);
    await db.collection("user").deleteOne({ _id: oldId });
    await db.collection("account").deleteMany({
      $or: [{ userId: oldId }, { userId: idStr }],
    });
    await db.collection("session").deleteMany({
      $or: [{ userId: oldId }, { userId: idStr }],
    });
    await db.collection("locksettings").deleteOne({ userId: idStr });
    await db.collection("clientencryptionsettings").deleteOne({ userId: idStr });
    await db.collection("entries").deleteMany({ userId: idStr });
    console.log(`Removed previous ${EMAIL} data (userId ${idStr})`);
  }

  const id = () => new ObjectId();
  const now = new Date().toISOString();

  // 1. Better Auth user + credential account.
  //    Matches exactly what the app's Better Auth + mongodb adapter stores:
  //    user._id and account.userId are BSON ObjectId; account.accountId is the
  //    hex string of the user id.
  const userId = id();
  const userIdStr = userId.toString();
  const passwordHash = await hashLoginPassword(LOGIN_PASSWORD);
  await db.collection("user").insertOne({
    _id: userId,
    name: "Test User",
    email: EMAIL,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection("account").insertOne({
    _id: id(),
    accountId: userIdStr,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Client-encryption settings (zero-knowledge enabled). The app's mongoose
  //    collections store userId as String.
  const salt = crypto.randomBytes(16).toString("hex");
  const masterKeyHex = crypto.randomBytes(32).toString("hex");
  const diaryKey = crypto.pbkdf2Sync(DIARY_PASSWORD, Buffer.from(salt, "hex"), 100000, 32, "sha256");
  const verificationCiphertext = encrypt(masterKeyHex, diaryKey);
  await db.collection("clientencryptionsettings").insertOne({
    _id: id(),
    userId: userIdStr,
    isClientEncrypted: true,
    encryptionSalt: salt,
    verificationCiphertext,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Lock settings: passcode hash present (so the app knows a PIN exists and
  //    never shows the first-launch setup prompt), but the lock is disabled so
  //    the test user just unlocks with the Diary Password and no PIN.
  await db.collection("locksettings").insertOne({
    _id: id(),
    userId: userIdStr,
    isLockEnabled: false,
    passcodeHash: hashPasscode("1234"),
    autoLockTimeout: 300,
    lockOnTabHide: false,
    createdAt: now,
    updatedAt: now,
  });

  // 4. Entries: 120 consecutive days ending today, all encrypted with the master key.
  const masterKey = Buffer.from(masterKeyHex, "hex");
  const entries = [];
  const today = new Date();
  for (let i = 0; i < ENTRY_COUNT; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (ENTRY_COUNT - 1 - i));
    const dateStr = date.toISOString().slice(0, 10);
    const at = new Date(`${dateStr}T12:00:00.000Z`);

    const { title, contentText, contentHtml, contentJson, wordCount, mood } =
      makeEntry(i, dateStr);

    entries.push({
      userId: userIdStr,
      date: dateStr,
      title: encrypt(title, masterKey),
      contentHtml: encrypt(contentHtml, masterKey),
      contentText: encrypt(contentText, masterKey),
      contentJson: encrypt(contentJson, masterKey),
      wordCount,
      mood,
      createdAt: at,
      updatedAt: at,
    });
  }

  await db.collection("entries").insertMany(entries);

  console.log(`\nSeeded ${EMAIL} into ${DB}:`);
  console.log(`  userId            : ${userId}`);
  console.log(`  login password    : ${LOGIN_PASSWORD} (email verified)`);
  console.log(`  diary password    : ${DIARY_PASSWORD}`);
  console.log(`  entries           : ${entries.length} (encrypted, 120 consecutive days)`);
  console.log(`  encryption salt   : ${salt}`);
  console.log(`  master key        : ${masterKeyHex.slice(0, 12)}...`);
  console.log(`  lock enabled      : false (unlock with Diary Password only)`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});