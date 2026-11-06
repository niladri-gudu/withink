import { NextResponse } from "next/server";

/**
 * Liveness probe for external uptime monitors (Better Stack).
 * Deliberately static: it must not depend on Mongo/Redis, otherwise a
 * dependency blip would page us as if the app itself were down.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
