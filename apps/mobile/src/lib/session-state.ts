/**
 * In-memory session secrets.
 *
 * The 15-minute unlock token and the master key exist only for the lifetime
 * of this app process; neither is written to storage or logs. A cold start
 * requires the diary password again.
 */
let unlockToken: string | null = null;

export function setUnlockToken(token: string): void {
  unlockToken = token;
}

export function getUnlockToken(): string | null {
  return unlockToken;
}

export function clearUnlockToken(): void {
  unlockToken = null;
}
