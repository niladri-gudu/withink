import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import { getViewerToday } from "@/lib/viewer-today";
import { FlashbackView } from "@/features/flashbacks/components/flashback-view";
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

  // 2. Fetch today's flashback
  const flashback = await FlashbackService.getFlashbackForToday(
    session.user.id,
    today,
  );

  return (
    <FlashbackView
      initialEntry={flashback ? flashback.entry : null}
      initialLabel={flashback ? flashback.label : ""}
      localToday={today}
    />
  );
}
