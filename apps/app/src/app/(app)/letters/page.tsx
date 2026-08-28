import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getLocalDateString, isDateString } from "@/lib/utils/date";
import { getRequestSession } from "@/lib/request-cache";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { EncryptionSettingsRepository } from "@/features/encryption/repositories/encryption-settings-repository";
import { LettersShell } from "@/features/letters/components/letters-shell";
import { LettersService } from "@/features/letters/services/letter-service";

export const metadata: Metadata = {
  title: "Letters",
  description: "Write to your future self — sealed until the day you choose.",
};

export default async function LettersPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(cookieToday) ? cookieToday : getLocalDateString();

  const [letters, entitlements, encryptionSettings] = await Promise.all([
    LettersService.listLetters(session.user.id),
    EntitlementsService.getEntitlements(session.user.id),
    EncryptionSettingsRepository.getSettings(session.user.id),
  ]);

  return (
    <LettersShell
      initialLetters={letters}
      plan={entitlements.plan}
      limit={entitlements.futureLetterLimit}
      today={today}
      accountEncrypted={!!encryptionSettings?.isClientEncrypted}
    />
  );
}
