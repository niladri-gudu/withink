import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
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
      <header className="space-y-1">
        <span className="text-muted-foreground/60 block font-mono text-[10px] tracking-[0.25em] uppercase">
          Sanctuary Configuration • Preferences
        </span>
        <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
          Sanctuary{" "}
          <span className="text-primary mt-1 block pl-1 text-4xl font-light italic sm:mt-0 sm:inline sm:text-5xl">
            settings.
          </span>
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">
          Adjust your writing experience and preferences
        </p>
      </header>

      <SettingsShell initialUser={settingsUser} />
    </div>
  );
}
