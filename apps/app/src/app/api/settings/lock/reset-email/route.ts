import { NextResponse } from "next/server";

import { requestPasscodeResetEmailAction } from "@/features/lock/actions/lock-actions";

import { apiErrorFromResult, requireApiSession } from "../../../_lib";

/**
 * Sends the six-digit lock-recovery code to the account's email. The action
 * owns the rate limit (3 per 15 minutes) and the mail transport; the code is
 * never returned to the caller.
 */
export async function POST() {
  const auth = await requireApiSession("settings:lock:reset-email", 10);
  if (auth.response) return auth.response;

  const result = await requestPasscodeResetEmailAction();
  if (!result.success) return apiErrorFromResult(result);
  return NextResponse.json({ ok: true });
}
