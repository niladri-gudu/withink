import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Entry } from "@/models/entry";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, title, contentHtml, contentText, contentJson } =
    await req.json();

  if (!date)
    return NextResponse.json({ error: "Date is required" }, { status: 400 });

  await connectDB();

  const wordCount =
    contentText?.trim().split(/\s+/).filter(Boolean).length ?? 0;

  const entry = await Entry.findOneAndUpdate(
    { userId: session.user.id, date },
    { title, contentHtml, contentText, contentJson, wordCount },
    { upsert: true, new: true },
  );

  return NextResponse.json({ entry });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  await connectDB();

  if (date) {
    // single entry by date
    const entry = await Entry.findOne({ userId: session.user.id, date });
    return NextResponse.json({ entry });
  }

  // all entries for sidebar/calendar
  const entries = await Entry.find(
    { userId: session.user.id },
    { date: 1, title: 1, wordCount: 1, contentText: 1 },
  ).sort({ date: -1 });

  return NextResponse.json({ entries });
}
