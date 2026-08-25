import type { Metadata, Route } from "next";
import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@withink/ui/button";

import { ROUTES } from "@/constants/routes";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import { getRequestSession } from "@/lib/request-cache";
import { backfillWindowStart, getLocalDateString, isDateString } from "@/lib/utils/date";
import { EditorSkeleton } from "@/features/journal/components/editor-skeleton";
import { JournalService } from "@/features/journal/services/journal-service";

export const metadata: Metadata = {
  title: "Journal Entry",
  description: "Reflect on this day in your private digital diary.",
};

// The Tiptap editor is the largest client graph on this route. Load it lazily
// so the route shell streams immediately and the grace-period firewall branch
// (future/expired dates, which never render the editor) doesn't pull the
// editor chunk into the route's client bundle.
const JournalEditorShell = dynamic(
  () =>
    import("@/features/journal/components/journal-editor-shell").then((m) => ({
      default: m.JournalEditorShell,
    })),
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

export default async function EntryPage({
  params,
  searchParams,
}: EntryPageProps) {
  const { date } = await params;
  const { today: searchParamsToday } = await searchParams;

  if (!isDateString(date)) {
    redirect(ROUTES.APP.DASHBOARD);
  }

  const session = await getRequestSession();
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
  const entry = await JournalService.getEntryForDate(
    session.user.id,
    date,
    today,
  );

  // 3. Grace period firewall checks — the window is the viewer's plan's
  //    backfill entitlement (Free 14d · Plus 90d · Pro unlimited). Existing
  //    entries are always viewable/editable; the wall only blocks creation.
  const entitlements = await EntitlementsService.getEntitlements(
    session.user.id,
  );
  const windowStart = backfillWindowStart(today, entitlements.backfillDays);
  const isFuture = date > today;
  const isExpired = windowStart !== null && date < windowStart;
  const exists = !!entry;

  // 🏛️ FIREWALL: If entry does not exist, block creation outside allowed journaling window
  if (isFuture || (isExpired && !exists)) {
    return (
      <div className="animate-in fade-in mx-auto flex min-h-[75vh] max-w-md flex-1 flex-col items-center justify-center px-6 py-20 text-center duration-300 select-none">
        <div className="space-y-4">
          <p className="text-muted-foreground/70 font-hand text-xl">
            {isFuture
              ? "this day hasn't arrived yet"
              : "the ink has dried on this page"}
          </p>
          <h1 className="text-foreground font-serif text-4xl leading-none font-bold tracking-tight sm:text-5xl">
            {isFuture ? "The Future is" : "The Archive is"} <br />
            <span className="text-accent mt-2 block text-5xl font-normal italic sm:text-6xl">
              {isFuture ? "unwritten." : "sealed."}
            </span>
          </h1>
        </div>

        <div className="mt-8 space-y-8">
          <p className="text-muted-foreground font-serif text-sm leading-relaxed">
            {isFuture
              ? "This day hasn't arrived in your diary yet. Patience is a form of ink."
              : "The ink for this day has already dried. Historical creation protocol is disabled."}
          </p>

          <div className="space-y-4 pt-4">
            <Button asChild className="h-11 w-full cursor-pointer">
              <Link href={`${ROUTES.APP.ENTRY(today)}?today=${today}` as Route}>
                Return to Present
              </Link>
            </Button>

            <Link
              href={ROUTES.APP.DASHBOARD}
              className="text-muted-foreground hover:text-foreground block cursor-pointer font-serif text-xs tracking-[0.15em] uppercase transition-colors"
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
      key={date}
      date={date}
      initialTitle={entry?.title ?? ""}
      initialContent={entry?.contentJson ?? ""}
      initialMood={entry?.mood ?? null}
    />
  );
}
