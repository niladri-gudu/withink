import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Entry } from "@/models/entry";
import { encrypt, safeDecrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, title, contentHtml, contentText, contentJson, userLocalToday } =
    await req.json();

  if (!date)
    return NextResponse.json({ error: "Date is required" }, { status: 400 });

  if (date > userLocalToday) {
    return NextResponse.json(
      { error: "The future is still unwritten." },
      { status: 403 },
    );
  }

  await connectDB();

  const wordCount =
    contentText?.trim().split(/\s+/).filter(Boolean).length ?? 0;

  const encryptedHtml = contentHtml ? encrypt(contentHtml) : "";
  const encryptedText = contentText ? encrypt(contentText) : "";
  const encryptedJson = contentJson ? encrypt(JSON.stringify(contentJson)) : "";

  const entry = await Entry.findOneAndUpdate(
    { userId: session.user.id, date },
    {
      $set: {
        title,
        contentHtml: encryptedHtml,
        contentText: encryptedText,
        contentJson: encryptedJson,
        wordCount: contentText?.trim().split(/\s+/).filter(Boolean).length ?? 0,
      },
      $setOnInsert: { userId: session.user.id, date },
    },
    { upsert: true, new: true, lean: true },
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

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  await connectDB();

  if (date) {
    const entry = await Entry.findOne({ userId: session.user.id, date }).lean();

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

  const [entries, total] = await Promise.all([
    Entry.find(
      { userId: session.user.id },
      { date: 1, title: 1, wordCount: 1, contentText: 1 },
    )
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Entry.countDocuments({ userId: session.user.id }),
  ]);

  const decryptedEntries = entries.map((entry) => ({
    ...entry,
    contentText: safeDecrypt(entry.contentText || ""),
  }));

  return NextResponse.json(
    {
      entries: decryptedEntries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export const dynamic = "force-dynamic";
