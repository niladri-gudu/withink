import * as React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { ApiError } from '@withink/api-client';
import type { LockSettingsView, MobileBootstrap } from '@withink/contracts';
import type { LocalProfile, NotebookSummary, ResolvedPlan } from '@withink/core';
import type { CachedEntryMetadata } from '@withink/core/timeline';

import { createDiaryClient } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import {
  decryptText,
  deriveKeyFromPassword,
  deriveUnlockProofHex,
  importKeyFromHex,
  type MasterKey,
} from '@/lib/crypto';
import { diaryCache, type SyncResult } from '@/lib/diary-cache';
import {
  clearBiometricKey,
  enrollBiometricKey,
  getBiometricAvailability,
  hasBiometricKey,
  loadBiometricKey,
  type BiometricAvailability,
} from '@/lib/key-store';
import { mobileLocalStore } from '@/lib/local-store';
import { clearMasterKey, setMasterKey } from '@/lib/master-key';
import { buildLocalProfile } from '@/lib/profile';
import { unregisterPushToken } from '@/lib/push';
import { clearUnlockToken, setUnlockToken } from '@/lib/session-state';

export type SyncState = 'idle' | 'syncing' | 'offline';

/** Only this long after unlock may a foreground switch trigger a sync. */
const FOREGROUND_SYNC_MS = 60_000;

interface DiaryContextValue {
  session: ReturnType<typeof authClient.useSession>['data'];
  isPending: boolean;
  bootstrap: MobileBootstrap | null;
  bootstrapError: string | null;
  reloadBootstrap: () => Promise<void>;

  masterKey: MasterKey | null;
  legacyAccount: boolean;
  lockPrefs: LockSettingsView | null;

  entries: CachedEntryMetadata[];
  pending: number;
  notebooks: NotebookSummary[];
  loadingData: boolean;
  syncing: boolean;
  syncState: SyncState;
  syncNotice: string | null;
  lastSyncedAt: number | null;
  revision: number;
  bumpRevision: () => void;
  refreshLocal: () => Promise<void>;
  syncNow: () => Promise<SyncResult | null>;

  plan: ResolvedPlan;
  profile: LocalProfile | null;
  reloadProfile: () => Promise<void>;

  biometrics: BiometricAvailability | null;
  biometricEnrolled: boolean;
  unlockWithPassword: (password: string) => Promise<void>;
  /** Adopts the key created while migrating a legacy account in-app. */
  completeMigration: (key: MasterKey) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
  enrollBiometrics: () => Promise<void>;
  disableBiometrics: () => Promise<void>;

  lock: () => void;
  signOut: () => Promise<void>;
}

const DiaryContext = React.createContext<DiaryContextValue | null>(null);

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message || 'The request could not be completed.';
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * Owns the session, the unlocked master key, the local journal and sync
 * status for the whole app. Screens read it instead of re-deriving the key or
 * re-pulling the timeline independently.
 */
export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [bootstrap, setBootstrap] = React.useState<MobileBootstrap | null>(null);
  const [bootstrapError, setBootstrapError] = React.useState<string | null>(null);
  const [masterKey, setMasterKeyState] = React.useState<MasterKey | null>(null);
  const [lockPrefs, setLockPrefs] = React.useState<LockSettingsView | null>(null);
  const [entries, setEntries] = React.useState<CachedEntryMetadata[]>([]);
  const [pending, setPending] = React.useState(0);
  const [notebooks, setNotebooks] = React.useState<NotebookSummary[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [syncState, setSyncState] = React.useState<SyncState>('idle');
  const [syncNotice, setSyncNotice] = React.useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<number | null>(null);
  const [revision, setRevision] = React.useState(0);
  const [plan, setPlan] = React.useState<ResolvedPlan>('free');
  const [profile, setProfile] = React.useState<LocalProfile | null>(null);
  const [biometrics, setBiometrics] = React.useState<BiometricAvailability | null>(null);
  const [biometricEnrolled, setBiometricEnrolled] = React.useState(false);

  const keyRef = React.useRef<MasterKey | null>(null);
  const lastSyncAttemptRef = React.useRef(0);
  const backgroundedAtRef = React.useRef<number | null>(null);
  const lockPrefsRef = React.useRef<LockSettingsView | null>(null);

  React.useEffect(() => {
    keyRef.current = masterKey;
  }, [masterKey]);
  React.useEffect(() => {
    lockPrefsRef.current = lockPrefs;
  }, [lockPrefs]);

  const bumpRevision = React.useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  /** Reads the SQLite cache only — cheap and safe while offline. */
  const refreshLocal = React.useCallback(async (key?: MasterKey | null) => {
    const activeKey = key ?? keyRef.current;
    if (!activeKey) return;
    setLoadingData(true);
    try {
      const [timeline, queued, localNotebooks] = await Promise.all([
        diaryCache.getLocalTimeline(activeKey),
        diaryCache.pendingCount(),
        mobileLocalStore.getNotebooks(),
      ]);
      setEntries(timeline);
      setPending(queued);
      setNotebooks(localNotebooks);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const syncNow = React.useCallback(async (): Promise<SyncResult | null> => {
    const key = keyRef.current;
    if (!key) return null;
    setSyncing(true);
    setSyncState('syncing');
    setSyncNotice(null);
    lastSyncAttemptRef.current = Date.now();
    try {
      const result = await diaryCache.sync(key);
      setLastSyncedAt(Date.now());
      if (result.failed > 0 || result.lastError) {
        setSyncState('offline');
        setSyncNotice(
          result.failed > 0
            ? 'Some pages are saved here and will sync later.'
            : result.lastError,
        );
      } else {
        setSyncState('idle');
      }
      try {
        const remoteNotebooks = await createDiaryClient().getNotebooks();
        await mobileLocalStore.putNotebooks(remoteNotebooks);
        setNotebooks(remoteNotebooks);
      } catch {
        // Notebook labels are non-critical offline; the local copy stays.
      }
      await refreshLocal(key);
      return result;
    } catch {
      setSyncState('offline');
      setSyncNotice('Offline — showing the pages saved on this device.');
      await refreshLocal(key);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [refreshLocal]);

  const persistProfile = React.useCallback(
    async (nextBootstrap: MobileBootstrap, nextPlan: ResolvedPlan) => {
      try {
        const existing = await mobileLocalStore.getProfile();
        const next = buildLocalProfile({
          bootstrap: nextBootstrap,
          plan: nextPlan,
          existing,
          nowIso: new Date().toISOString(),
        });
        await mobileLocalStore.putProfile(next);
        setProfile(next);
      } catch {
        // The profile is an offline hint; a write failure must not block use.
      }
    },
    [],
  );

  const reloadBootstrap = React.useCallback(async () => {
    setBootstrapError(null);
    try {
      const api = createDiaryClient();
      const nextBootstrap = await api.getBootstrap();
      let nextPlan: ResolvedPlan = 'free';
      try {
        nextPlan = (await api.getBillingSummary()).plan;
      } catch {
        nextPlan = 'free';
      }
      setBootstrap(nextBootstrap);
      setPlan(nextPlan);
      await persistProfile(nextBootstrap, nextPlan);
      try {
        const settings = await api.getLockSettings();
        setLockPrefs(settings);
      } catch {
        setLockPrefs(null);
      }
    } catch (error) {
      setBootstrapError(describeError(error));
    }
  }, [persistProfile]);

  const reloadProfile = React.useCallback(async () => {
    try {
      setProfile(await mobileLocalStore.getProfile());
    } catch {
      setProfile(null);
    }
  }, []);

  const userId = session?.user.id;

  React.useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBootstrap(null);
      setProfile(null);
      return;
    }
    void reloadBootstrap();
  }, [userId, reloadBootstrap]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [availability, enrolled] = await Promise.all([
        getBiometricAvailability(),
        hasBiometricKey(),
      ]);
      if (cancelled) return;
      setBiometrics(availability);
      setBiometricEnrolled(enrolled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finishUnlock = React.useCallback(
    async (key: MasterKey) => {
      setMasterKey(key);
      setMasterKeyState(key);
      await refreshLocal(key);
      void syncNow();
    },
    [refreshLocal, syncNow],
  );

  const unlockWithPassword = React.useCallback(
    async (password: string) => {
      if (!bootstrap) throw new Error('The diary is not ready yet.');
      if (password.length === 0) throw new Error('Enter your diary password.');
      if (!bootstrap.encryption.verificationCiphertext) {
        throw new Error('This diary is not set up for encrypted access yet.');
      }
      const passwordKey = await deriveKeyFromPassword(
        password,
        bootstrap.encryption.encryptionSalt,
        bootstrap.encryption.kdfIterations,
      );
      const masterKeyHex = await decryptText(
        bootstrap.encryption.verificationCiphertext,
        passwordKey,
      );
      const key = await importKeyFromHex(masterKeyHex);
      const proof = await deriveUnlockProofHex(key);
      const result = await createDiaryClient().unlock(proof);
      setUnlockToken(result.token);
      await finishUnlock(key);
    },
    [bootstrap, finishUnlock],
  );

  /**
   * Adopts a master key the device just created during an in-app legacy
   * migration: binds the unlock token and loads the freshly encrypted journal.
   * (`unlockWithPassword` cannot be used here — its bootstrap predates the
   * enable call.)
   */
  const completeMigration = React.useCallback(
    async (key: MasterKey) => {
      const proof = await deriveUnlockProofHex(key);
      const result = await createDiaryClient().unlock(proof);
      setUnlockToken(result.token);
      await finishUnlock(key);
    },
    [finishUnlock],
  );

  const unlockWithBiometrics = React.useCallback(async () => {
    const key = await loadBiometricKey();
    const proof = await deriveUnlockProofHex(key);
    const result = await createDiaryClient().unlock(proof);
    setUnlockToken(result.token);
    await finishUnlock(key);
  }, [finishUnlock]);

  const enrollBiometrics = React.useCallback(async () => {
    const key = keyRef.current;
    if (!key) throw new Error('Unlock the diary first.');
    await enrollBiometricKey(key);
    setBiometricEnrolled(true);
  }, []);

  const disableBiometrics = React.useCallback(async () => {
    await clearBiometricKey();
    setBiometricEnrolled(false);
  }, []);

  const lock = React.useCallback(() => {
    clearMasterKey();
    clearUnlockToken();
    setMasterKeyState(null);
    setSyncState('idle');
  }, []);

  const signOut = React.useCallback(async () => {
    clearUnlockToken();
    clearMasterKey();
    await clearBiometricKey();
    setMasterKeyState(null);
    setBiometricEnrolled(false);
    setEntries([]);
    setPending(0);
    setNotebooks([]);
    setProfile(null);
    setBootstrap(null);
    // Drop this install's push token while the session still authorizes the
    // request, so reminders never land on a signed-out device.
    await unregisterPushToken();
    // The encrypted cache is account-scoped only by convention; purge it so a
    // different account on the same device never sees another user's pages.
    await mobileLocalStore.clear();
    await authClient.signOut();
  }, []);

  // The unlock token is short-lived; media/export/uploads still need it. Renew
  // it from the in-memory master key while the diary stays unlocked.
  React.useEffect(() => {
    if (!masterKey) return;
    const renew = async () => {
      try {
        const proof = await deriveUnlockProofHex(masterKey);
        const result = await createDiaryClient().unlock(proof);
        setUnlockToken(result.token);
      } catch {
        // A renewal failure leaves the previous token in place; the next tick
        // (or a manual unlock) tries again.
      }
    };
    const timer = setInterval(() => void renew(), 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [masterKey]);

  // Lock the in-memory key according to the web-equivalent lock settings.
  React.useEffect(() => {
    function handle(next: AppStateStatus) {
      const settings = lockPrefsRef.current;
      if (next === 'background' || next === 'inactive') {
        if (next === 'background') backgroundedAtRef.current = Date.now();
        if (settings?.lockOnTabHide && keyRef.current) lock();
        return;
      }
      if (next !== 'active') return;
      const backgroundedAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      if (
        settings?.isLockEnabled &&
        backgroundedAt !== null &&
        (settings.autoLockTimeout === 0 ||
          Date.now() - backgroundedAt > settings.autoLockTimeout * 1000)
      ) {
        lock();
        return;
      }
      if (
        keyRef.current &&
        Date.now() - lastSyncAttemptRef.current > FOREGROUND_SYNC_MS
      ) {
        void syncNow();
      }
    }
    const subscription = AppState.addEventListener('change', handle);
    return () => subscription.remove();
  }, [lock, syncNow]);

  const value = React.useMemo<DiaryContextValue>(
    () => ({
      session,
      isPending,
      bootstrap,
      bootstrapError,
      reloadBootstrap,
      masterKey,
      legacyAccount: Boolean(
        bootstrap && !bootstrap.encryption.isClientEncrypted,
      ),
      lockPrefs,
      entries,
      pending,
      notebooks,
      loadingData,
      syncing,
      syncState,
      syncNotice,
      lastSyncedAt,
      revision,
      bumpRevision,
      refreshLocal: () => refreshLocal(),
      syncNow,
      plan,
      profile,
      reloadProfile,
      biometrics,
      biometricEnrolled,
      unlockWithPassword,
      completeMigration,
      unlockWithBiometrics,
      enrollBiometrics,
      disableBiometrics,
      lock,
      signOut,
    }),
    [
      session,
      isPending,
      bootstrap,
      bootstrapError,
      reloadBootstrap,
      masterKey,
      lockPrefs,
      entries,
      pending,
      notebooks,
      loadingData,
      syncing,
      syncState,
      syncNotice,
      lastSyncedAt,
      revision,
      bumpRevision,
      refreshLocal,
      syncNow,
      plan,
      profile,
      reloadProfile,
      biometrics,
      biometricEnrolled,
      unlockWithPassword,
      completeMigration,
      unlockWithBiometrics,
      enrollBiometrics,
      disableBiometrics,
      lock,
      signOut,
    ],
  );

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary(): DiaryContextValue {
  const context = React.useContext(DiaryContext);
  if (!context) {
    throw new Error('useDiary must be used inside DiaryProvider');
  }
  return context;
}
