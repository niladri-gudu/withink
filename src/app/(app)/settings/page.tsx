import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROUTES } from "@/constants/routes";
import { SettingsShell } from "@/features/settings/components/settings-shell";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
    <div className="flex-grow max-w-5xl mx-auto p-6 md:p-10 space-y-8 w-full animate-in fade-in duration-300">
      <header className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60 block">
          Sanctuary Configuration • Preferences
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight leading-none text-foreground">
          Sanctuary{" "}
          <span className="text-primary italic font-light text-4xl sm:text-5xl block sm:inline mt-1 sm:mt-0 pl-1">
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
