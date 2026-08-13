import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import { PageHeader } from "@/features/app-shell/components/page-header";
import { SettingsShell } from "@/features/settings/components/settings-shell";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Configure your profile, theme preferences, paper feel, and security options.",
};

export default async function SettingsPage() {
  const session = await getRequestSession();

  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const settingsUser = {
    id: session.user.id,
    name: session.user.name || "Writer",
    email: session.user.email,
    image: session.user.image,
  };

  return (
    <div className="animate-in fade-in mx-auto w-full max-w-5xl flex-grow space-y-8 p-6 duration-300 md:p-10">
      <PageHeader
        note="tune the desk to suit the writer"
        title="Sanctuary"
        accent="settings."
        description="Adjust your writing experience and preferences"
      />

      <SettingsShell initialUser={settingsUser} />
    </div>
  );
}
