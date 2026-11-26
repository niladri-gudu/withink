import { NextResponse } from "next/server";

import { getBillingSummaryAction } from "@/features/billing/actions/billing-actions";

import { apiErrorFromResult, requireApiSession } from "../../_lib";

/**
 * Read-only plan state for the native settings screen. There is deliberately
 * no checkout or portal URL here: purchases stay on the web so the app does
 * not steer users to an external payment flow.
 */
export async function GET() {
  const auth = await requireApiSession("billing:summary", 60);
  if (auth.response) return auth.response;

  const result = await getBillingSummaryAction();
  if (!result.success || !result.summary) {
    return apiErrorFromResult(result, "INTERNAL");
  }
  return NextResponse.json(result.summary);
}
