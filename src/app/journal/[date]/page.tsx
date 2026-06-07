/* eslint-disable react/jsx-no-comment-textnodes */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { JournalEditor } from "@/components/journal/journal-editor";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeDecrypt } from "@/lib/encryption";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addDays, getLocalDateString, isDateString } from "@/lib/utils/date";
import { cookies } from "next/headers";
import { getCachedEntry } from "@/lib/entry-cache";

interface Props {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ today?: string }>;
}

export default async function JournalDatePage({ params, searchParams }: Props) {
  const { date } = await params;
  const { today: clientToday } = await searchParams;

  if (!isDateString(date)) redirect("/home");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  const cookieToday = (await cookies()).get("withink-local-date")?.value;
  const today = isDateString(clientToday)
    ? clientToday
    : isDateString(cookieToday)
      ? cookieToday
      : getLocalDateString();

  // 1. Fetch the entry FIRST to see if it exists
  const entry = await getCachedEntry(session.user.id, date, today);

  // 2. Determine "Yesterday"
  const yesterday = addDays(today, -1);

  // 3. Define the Firewall Logic
  const isFuture = date > today;
  const isExpired = date < yesterday;
  const exists = !!entry;

  // 🏛️ FIREWALL: Block ONLY if it's a NEW entry and outside the grace period
  // If 'exists' is true, we skip the isExpired check.
  if (isFuture || (isExpired && !exists)) {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center py-12 px-8 antialiased">
        <div className="w-full max-w-sm mx-auto space-y-10">
          <div className="space-y-3">
            <h1 className="text-5xl font-black tracking-tighter leading-[0.85]">
              {isFuture ? "Future is" : "Archive is"} <br />
              <span className="text-primary/60 italic font-serif font-light text-6xl">
                {isFuture ? "unwritten." : "sealed."}
              </span>
            </h1>
            <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em]">
              {isFuture
                ? "Time_Lock // Access_Denied"
                : "Grace_Period // Expired"}
            </p>
          </div>

          <div className="space-y-8">
            <p className="text-muted-foreground font-mono text-xs tracking-widest leading-relaxed">
              {isFuture
                ? "This day hasn't arrived in your sanctuary yet."
                : "The ink for this day has already dried. Historical creation protocol is disabled."}
              <br />
              <span className="text-foreground block mt-2 underline decoration-primary/40 underline-offset-4 italic">
                {isFuture
                  ? "Patience is a form of ink."
                  : "Only current sessions can be initialized."}
              </span>
            </p>

            <div className="pt-4 space-y-4 text-center">
              <Link href={`/journal/${today}?today=${today}`} className="block">
                <Button className="w-full h-14 rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden">
                  Return to Present
                </Button>
              </Link>

              <Link
                href="/home"
                className="inline-block text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors italic"
              >
                // Back_to_Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Decrypt content if it exists
  let decryptedContent: any = "";
  if (entry) {
    const rawJson = safeDecrypt((entry as any).contentJson);
    try {
      decryptedContent =
        typeof rawJson === "string" &&
        (rawJson.startsWith("{") || rawJson.startsWith("["))
          ? JSON.parse(rawJson)
          : rawJson;
    } catch (e) {
      console.error("Failed to parse entry JSON:", e);
      decryptedContent = rawJson;
    }
  }

  return (
    <JournalEditor
      date={date}
      initialTitle={(entry as any)?.title ?? ""}
      initialContent={decryptedContent ?? ""}
      initialMood={entry?.mood ?? null}
    />
  );
}
