import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getLocalDateString, isDateString } from "@/lib/utils/date";
import { getRequestSession } from "@/lib/request-cache";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { LetterComposer } from "@/features/letters/components/letter-composer";
import { LettersService } from "@/features/letters/services/letter-service";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "Compose Letter",
  description: "Write to your future self — sealed until the day you choose.",
};

interface ComposePageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ComposeLetterPage({ searchParams }: ComposePageProps) {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const { id } = await searchParams;

  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();

  // Editing requires an OWNED, UNSEALED letter that hasn't been delivered —
  // sealed letters rest until their day (the service enforces it too; a
  // sealed letter's body is refused here as defense-in-depth), and delivered
  // letters are frozen history. Both route back to the shelf.
  let initialLetter = null;
  if (id && /^[a-f\d]{24}$/i.test(id)) {
    try {
      const letter = await LettersService.getLetter(
        session.user.id,
        id,
        today,
      );
      if (letter.sealed || letter.unlockDate <= today) {
        redirect("/letters" as Route);
      }
      initialLetter = letter;
    } catch {
      redirect("/letters" as Route);
    }
  }

  const [entitlements, encryptionSettings, activeCount] = await Promise.all([
    EntitlementsService.getEntitlements(session.user.id),
    EncryptionSettingsRepository.getSettings(session.user.id),
    LettersService.getActiveCount(session.user.id, today),
  ]);

  return (
    <LetterComposer
      initialLetter={initialLetter}
      plan={entitlements.plan}
      limit={entitlements.futureLetterLimit}
      activeCount={initialLetter ? Math.max(activeCount - 1, 0) : activeCount}
      today={today}
      accountEncrypted={!!encryptionSettings?.isClientEncrypted}
    />
  );
}
