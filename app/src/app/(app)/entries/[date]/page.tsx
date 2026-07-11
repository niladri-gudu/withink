import type { Metadata } from "next";
import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Journal Entry",
  description: "Reflect on this day in your private digital sanctuary.",
};
import { isDateString, addDays, getLocalDateString } from "@/lib/utils/date";
import { ROUTES } from "@/constants/routes";
import { auth } from "@/lib/auth";
import { JournalService } from "@/features/journal/services/journal-service";
import { EditorSkeleton } from "@/features/journal/components/editor-skeleton";

// The Tiptap editor is the largest client graph on this route. Load it lazily
// so the route shell streams immediately and the grace-period firewall branch
// (future/expired dates, which never render the editor) doesn't pull the
// editor chunk into the route's client bundle.
const JournalEditorShell = dynamic(
  () =>
    import("@/features/journal/components/journal-editor-shell").then(
      (m) => ({ default: m.JournalEditorShell }),
    ),
  { loading: () => <EditorSkeleton />, ssr: true },
);

interface EntryPageProps {
  params: Promise<{
    date: string;
  }>;
  searchParams: Promise<{
    today?: string;
  }>;
}

export default async function EntryPage({ params, searchParams }: EntryPageProps) {
  const { date } = await params;
  const { today: searchParamsToday } = await searchParams;

  if (!isDateString(date)) {
    redirect(ROUTES.APP.DASHBOARD);
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // 1. Determine local today (supporting search params, cookies, or server fallback)
  const cookieStore = await cookies();
  const cookieToday = cookieStore.get("withink-local-date")?.value;
  const today = isDateString(searchParamsToday)
    ? searchParamsToday
    : isDateString(cookieToday)
      ? cookieToday
      : getLocalDateString();

  // 2. Fetch entry from service (automatically handles cache and decryption)
  const entry = await JournalService.getEntryForDate(session.user.id, date, today);

  // 3. Grace period firewall checks
  const yesterday = addDays(today, -1);
  const isFuture = date > today;
  const isExpired = date < yesterday;
  const exists = !!entry;

  // 🏛️ FIREWALL: If entry does not exist, block creation outside allowed journaling window
  if (isFuture || (isExpired && !exists)) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 max-w-md mx-auto min-h-[75vh] text-center select-none animate-in fade-in duration-300">
        <div className="space-y-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60 block">
            {isFuture ? "Time Lock // Access Denied" : "Grace Period // Expired"}
          </span>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight leading-none text-foreground">
            {isFuture ? "The Future is" : "The Archive is"} <br />
            <span className="text-primary italic font-light text-5xl sm:text-6xl block mt-2">
              {isFuture ? "unwritten." : "sealed."}
            </span>
          </h1>
        </div>

        <div className="mt-8 space-y-8">
          <p className="text-sm font-serif text-muted-foreground leading-relaxed">
            {isFuture
              ? "This day hasn't arrived in your sanctuary yet. Patience is a form of ink."
              : "The ink for this day has already dried. Historical creation protocol is disabled."}
          </p>

          <div className="space-y-4 pt-4">
            <Button asChild className="w-full h-11 cursor-pointer">
              <Link href={(ROUTES.APP.ENTRY(today) + `?today=${today}`) as unknown as ComponentPropsWithoutRef<typeof Link>["href"]}>
                Return to Present
              </Link>
            </Button>

            <Link
              href={ROUTES.APP.DASHBOARD}
              className="block text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Render the fully-functional JournalEditorShell
  return (
    <JournalEditorShell
      date={date}
      initialTitle={entry?.title ?? ""}
      initialContent={entry?.contentJson ?? ""}
      initialMood={entry?.mood ?? null}
    />
  );
}
