"use client";

import * as React from "react";

import type {
  EncryptionSettings,
  LocalUserHint,
  LockSettings,
} from "@withink/core";

import { seedLocalProfile, setZkHintCookie } from "./local-profile";

interface ProfileSeederProps {
  accountId: string | null;
  user: LocalUserHint | null;
  encryption: EncryptionSettings;
  lock: LockSettings;
}

/**
 * Caches the authoritative server settings into the local profile and sets the
 * zero-knowledge hint cookie for the next boot. Renders nothing and never
 * gates the UI; the server gate remains in charge until E4b.
 */
export function ProfileSeeder({
  accountId,
  user,
  encryption,
  lock,
}: ProfileSeederProps) {
  React.useEffect(() => {
    void seedLocalProfile({ accountId, user, encryption, lock }).then(() => {
      if (encryption.isClientEncrypted) setZkHintCookie();
    });
  }, [accountId, user, encryption, lock]);

  return null;
}
