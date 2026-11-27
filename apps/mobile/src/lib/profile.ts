import type { MobileBootstrap } from "@withink/contracts";
import type { LocalProfile, ResolvedPlan } from "@withink/core";

/**
 * Builds the device-local profile from a server bootstrap read. Mirrors the
 * web's `LocalProfile` record so lock/encryption/plan hints survive offline
 * and are shared by both clients.
 */
export function buildLocalProfile(input: {
  bootstrap: MobileBootstrap;
  plan: ResolvedPlan;
  existing: LocalProfile | null;
  nowIso: string;
}): LocalProfile {
  const { bootstrap, plan, existing, nowIso } = input;
  return {
    id: bootstrap.user.id,
    accountId: existing?.accountId ?? null,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
    encryption: {
      isClientEncrypted: bootstrap.encryption.isClientEncrypted,
      encryptionSalt: bootstrap.encryption.encryptionSalt,
      verificationCiphertext: bootstrap.encryption.verificationCiphertext,
      kdfIterations: bootstrap.encryption.kdfIterations,
    },
    lock: {
      isLockEnabled: bootstrap.lock.isLockEnabled,
      hasPasscode: bootstrap.lock.hasPasscode,
      autoLockTimeout: bootstrap.lock.autoLockTimeout,
      lockOnTabHide: existing?.lock.lockOnTabHide ?? false,
    },
    user: {
      id: bootstrap.user.id,
      name: bootstrap.user.name,
      email: bootstrap.user.email,
    },
    lastKnownPlan: plan,
    planCheckedAt: nowIso,
  };
}
