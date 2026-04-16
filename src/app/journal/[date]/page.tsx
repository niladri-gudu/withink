/* eslint-disable @typescript-eslint/no-explicit-any */
import { JournalEditor } from "@/components/journal/journal-editor";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { Entry } from "@/models/entry";
import { safeDecrypt } from "@/lib/encryption";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function JournalDatePage({ params }: Props) {
  const { date } = await params;

  // validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect("/journal");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");

  await connectDB();

  const entry = await Entry.findOne({
    userId: session.user.id,
    date,
  }).lean();

  let decryptedContent = "";

  if (entry) {
    const rawJson = safeDecrypt((entry as any).contentJson);
    try {
      decryptedContent =
        (typeof rawJson === "string" && rawJson.startsWith("{")) ||
        rawJson.startsWith("[")
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
    />
  );
}
