import { isDelivered, occupiesSlot } from "@withink/core";
import type { LetterMeta } from "@withink/api-client";

/**
 * Shelf grouping for letters to the future self.
 *
 * The server's `today` is the only authority on delivery; both clients derive
 * the three shelf sections from the same rule in `@withink/core`, so a letter
 * can never appear "arrived" on one platform and "resting" on the other.
 */

export interface GroupedLetters {
  /** Delivered and not yet opened — shown first, with the arrival note. */
  arrivedUnread: LetterMeta[];
  /** Still in the future (drafts and sealed letters); soonest first. */
  pending: LetterMeta[];
  /** Delivered and already opened; most recent first. */
  opened: LetterMeta[];
}

export function groupLetters(
  letters: LetterMeta[],
  today: string,
): GroupedLetters {
  const arrivedUnread: LetterMeta[] = [];
  const pending: LetterMeta[] = [];
  const opened: LetterMeta[] = [];

  for (const letter of letters) {
    if (!isDelivered(letter.unlockDate, today)) {
      pending.push(letter);
    } else if (letter.readAt) {
      opened.push(letter);
    } else {
      arrivedUnread.push(letter);
    }
  }

  pending.sort((a, b) => a.unlockDate.localeCompare(b.unlockDate));
  arrivedUnread.sort((a, b) => a.unlockDate.localeCompare(b.unlockDate));
  opened.sort((a, b) => b.unlockDate.localeCompare(a.unlockDate));

  return { arrivedUnread, pending, opened };
}

/** Active letters are exactly the ones still occupying a plan slot. */
export function countActiveLetters(
  letters: LetterMeta[],
  today: string,
): number {
  let active = 0;
  for (const letter of letters) {
    if (occupiesSlot(letter.unlockDate, today)) active += 1;
  }
  return active;
}
