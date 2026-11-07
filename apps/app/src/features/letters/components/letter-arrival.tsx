import {
  getRequestEncryptionSettings,
  getRequestViewerToday,
} from "@/lib/request-cache";

import { LettersService } from "../services/letter-service";
import { LetterArrivalCard } from "./letter-arrival-card";

/**
 * The dashboard arrival note: when a letter to the future self has reached
 * its day and hasn't been opened, this quiet module appears between the hero
 * and the lower grid. Renders nothing when there's no mail.
 */
export async function LetterArrival({ userId }: { userId: string }) {
  const today = await getRequestViewerToday();

  const [letters, encryptionSettings] = await Promise.all([
    LettersService.listArrivedUnread(userId, today),
    getRequestEncryptionSettings(userId),
  ]);

  if (letters.length === 0) return null;

  return (
    <LetterArrivalCard
      letters={letters}
      accountEncrypted={!!encryptionSettings?.isClientEncrypted}
    />
  );
}
