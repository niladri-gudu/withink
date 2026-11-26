import { NextResponse } from "next/server";
import type { MobileBootstrap } from "@withink/contracts";

import { getRequestSession } from "@/lib/request-cache";
import { apiError, apiErrorFrom } from "@/server/api-error";
import { rateLimit } from "@/server/rate-limit";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { LockRepository } from "@/features/lock/repositories/lock-repository";

/**
 * Safe bootstrap for native clients: identity hint plus the material needed to
 * derive and verify the diary key. Hashes and proof material never leave the
 * server.
 */
export async function GET() {
  try {
    const session = await getRequestSession();
    if (!session) {
      return apiError("UNAUTHORIZED", "Unauthorized");
    }

    const limit = await rateLimit(`mobile:bootstrap:${session.user.id}`, {
      limit: 60,
      windowSeconds: 60,
    });
    if (!limit.success) {
      return apiError(
        "RATE_LIMITED",
        "Too many bootstrap requests. Try again shortly.",
      );
    }

    const [encryption, lock] = await Promise.all([
      EncryptionSettingsRepository.getSettings(session.user.id),
      LockRepository.getSettings(session.user.id),
    ]);

    const body: MobileBootstrap = {
      user: {
        id: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
      },
      encryption: {
        isClientEncrypted: encryption?.isClientEncrypted ?? false,
        encryptionSalt: encryption?.encryptionSalt ?? "",
        verificationCiphertext: encryption?.verificationCiphertext ?? "",
        kdfIterations: encryption?.kdfIterations ?? 100_000,
      },
      lock: {
        isLockEnabled: lock?.isLockEnabled ?? false,
        autoLockTimeout: lock?.autoLockTimeout ?? 0,
        hasPasscode: Boolean(lock?.passcodeHash),
      },
    };

    return NextResponse.json(body);
  } catch (error) {
    return apiErrorFrom(error);
  }
}
