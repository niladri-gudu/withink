import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Flashbacks",
  description: "Rediscover your meaningful memories from the past.",
};
import { FlashbackService } from "@/features/flashbacks/services/flashback-service";
import { FlashbackView } from "@/features/flashbacks/components/flashback-view";
import { isDateString, getLocalDateString } from "@/lib/utils/date";

export default async function FlashbacksPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // 1. Determine local today date
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();

  // 2. Fetch today's flashback
  const flashback = await FlashbackService.getFlashbackForToday(session.user.id, today);

  return (
    <FlashbackView
      initialEntry={flashback ? flashback.entry : null}
      initialLabel={flashback ? flashback.label : ""}
      localToday={today}
    />
  );
}
