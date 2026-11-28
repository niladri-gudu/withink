import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import {
  getRequestEncryptionSettings,
  getRequestSession,
} from "@/lib/request-cache";
import { getViewerToday } from "@/lib/viewer-today";
import { logger } from "@/server/logger";
import { FlashbackView } from "@/features/flashbacks/components/flashback-view";
import { FlashbackViewLocal } from "@/features/flashbacks/components/flashback-view-local";
import { FlashbackService } from "@/features/flashbacks/services/flashback-service";

export const metadata: Metadata = {
  title: "Flashbacks",
  description: "Rediscover your meaningful memories from the past.",
};

export default async function FlashbacksPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const today = await getViewerToday();

  // 2. Zero-knowledge accounts pick the memory from their decrypted local
  //    timeline, so the server selection read is skipped. Legacy accounts
  //    keep the server-chosen flashback.
  const encryptionSettings = await getRequestEncryptionSettings(
    session.user.id,
  );
  if (encryptionSettings?.isClientEncrypted) {
    return <FlashbackViewLocal localToday={today} />;
  }

  // The read can fail (cache/db hiccup). The page itself must still render, so
  // the failure becomes a visible, retryable error state — logged, never
  // swallowed.
  let flashback: Awaited<
    ReturnType<typeof FlashbackService.getFlashbackForToday>
  > = null;
  let loadError = false;
  try {
    flashback = await FlashbackService.getFlashbackForToday(
      session.user.id,
      today,
    );
  } catch (error) {
    loadError = true;
    logger.error("Failed to load today's flashback", error as Error, {
      userId: session.user.id,
    });
  }

  return (
    <FlashbackView
      initialEntry={flashback ? flashback.entry : null}
      initialLabel={flashback ? flashback.label : ""}
      localToday={today}
      initialError={loadError}
    />
  );
}
