import { NextResponse } from "next/server";

import { apiError } from "@/server/api-error";
import { getPlaintextEntriesForMigrationAction } from "@/features/encryption/actions/encryption-actions";

import { requireApiSession } from "../../../_lib";

/**
 * Server-key-decrypted pages for a device-driven zero-knowledge migration.
 *
 * Only legacy (server-encrypted) accounts reach this: the action refuses once
 * `isClientEncrypted` is on, and still requires the `X-Withink-Unlock` proof
 * token. Rows an interrupted earlier run already rewrote to ciphertext are
 * omitted, so the client cannot double-encrypt them. Rate-limited hard because
 * the response is the whole journal.
 */
export async function GET() {
  const auth = await requireApiSession("migration:plaintext", 5);
  if (auth.response) return auth.response;

  const result = await getPlaintextEntriesForMigrationAction();
  if (!result.success) {
    return apiError(
      result.error === "Locked" ? "LOCKED" : "BUSINESS_RULE",
      result.error ?? "Could not read the journal.",
    );
  }

  return NextResponse.json({
    entries: result.entries ?? [],
    alreadyMigrated: result.alreadyMigrated ?? 0,
  });
}
