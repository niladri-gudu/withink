/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Entry } from "@/models/entry";
import { encrypt, safeDecrypt } from "@/lib/encryption";
import { addDays, isDateString } from "@/lib/utils/date";
import { countWords } from "@/lib/utils/text";
import {
  getCachedEntry,
  getCachedEntryPage,
  invalidateUserEntryCache,
  setCachedEntry,
} from "@/lib/entry-cache";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    date,
    mood,
    title,
    contentHtml,
    contentText,
    contentJson,
    userLocalToday,
  } = await req.json();

  if (!isDateString(date) || !isDateString(userLocalToday))
    return NextResponse.json(
      { error: "Valid date information missing" },
      { status: 400 },
    );

  await connectDB();

  // 🏛️ 1. Check if the entry already exists
  const existingEntry = await Entry.findOne({ userId: session.user.id, date });

  // 🏛️ 2. Apply Grace Period ONLY for NEW entries
  if (!existingEntry) {
    const yesterdayStr = addDays(userLocalToday, -1);

    // Block future dates
    if (date > userLocalToday) {
      return NextResponse.json(
        { error: "The future is unwritten." },
        { status: 403 },
      );
    }

    // Block creation of old entries
    if (date < yesterdayStr) {
      return NextResponse.json(
        { error: "Grace period expired for new entries." },
        { status: 403 },
      );
    }
  }

  // 🏛️ 3. Proceed with Update or Create
  const updateFields: any = {};
  if (title !== undefined) updateFields.title = title;
  if (mood !== undefined) updateFields.mood = mood;

  if (contentHtml !== undefined) {
    updateFields.contentHtml = encrypt(contentHtml);
  }

  if (contentText !== undefined) {
    updateFields.contentText = encrypt(contentText);
    updateFields.wordCount = countWords(contentText);
  }

  if (contentJson !== undefined) {
    updateFields.contentJson = encrypt(JSON.stringify(contentJson));
  }

  const entry = await Entry.findOneAndUpdate(
    { userId: session.user.id, date },
    {
      $set: updateFields,
      $setOnInsert: { userId: session.user.id, date },
    },
    { upsert: true, new: true, lean: true },
  );
  await invalidateUserEntryCache(session.user.id);
  await setCachedEntry(session.user.id, date, entry, userLocalToday);

  // Decrypt for response
  if (entry) {
    entry.contentHtml = safeDecrypt(entry.contentHtml);
    entry.contentText = safeDecrypt(entry.contentText);
    const decryptedJson = safeDecrypt(entry.contentJson);
    try {
      entry.contentJson = decryptedJson ? JSON.parse(decryptedJson) : null;
    } catch (e) {
      entry.contentJson = decryptedJson;
    }
  }

  return NextResponse.json({ entry });
}

// GET handler remains largely the same but ensure userLocalToday is handled if needed
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const localToday = searchParams.get("today");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10),
  );

  if (date) {
    if (!isDateString(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const entry = await getCachedEntry(
      session.user.id,
      date,
      isDateString(localToday) ? localToday : undefined,
    );
    if (entry) {
      entry.contentHtml = safeDecrypt(entry.contentHtml);
      entry.contentText = safeDecrypt(entry.contentText);
      const decryptedJson = safeDecrypt(entry.contentJson);
      try {
        entry.contentJson = decryptedJson ? JSON.parse(decryptedJson) : null;
      } catch (e) {
        entry.contentJson = decryptedJson;
      }
    }
    return NextResponse.json({ entry });
  }

  const { entries, total } = await getCachedEntryPage(
    session.user.id,
    page,
    limit,
  );

  const decryptedEntries = entries.map((entry) => {
    const decryptedText = safeDecrypt(entry.contentText || "");
    return {
      ...entry,
      contentHtml: safeDecrypt(entry.contentHtml || ""),
      contentText: decryptedText,
      preview:
        decryptedText.length > 100
          ? decryptedText.substring(0, 100) + "..."
          : decryptedText,
    };
  });

  return NextResponse.json({
    entries: decryptedEntries,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
