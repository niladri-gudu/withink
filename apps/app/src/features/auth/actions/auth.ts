"use server";

import { headers } from "next/headers";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDB } from "@/lib/db/mongoose";
import { rateLimit } from "@/server/rate-limit";

const emailSchema = z.string().trim().max(255).email();

/**
 * Pre-check used by the register form to short-circuit obvious duplicates.
 *
 * This endpoint is pre-auth and reveals whether an account exists, so it is
 * validated and throttled per IP — a scripted caller can't sweep the user
 * base, while legitimate users (a handful of checks) never notice the limit.
 * When the limiter trips or no IP context exists, the check fails closed to
 * "doesn't exist", letting the normal sign-up flow return its own error.
 */
export async function checkIdentityExists(email: string): Promise<boolean> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return false;

  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = await rateLimit(`identity-check:${ip}`, {
      limit: 10,
      windowSeconds: 3600,
    });
    if (!limit.success) return false;
  } catch {
    // No request context (e.g. tests/scripts) — proceed to the lookup.
  }

  await connectDB();
  const normalizedEmail = parsed.data.toLowerCase();
  const user = await mongoose.connection.db
    ?.collection("user")
    .findOne({ email: normalizedEmail });
  return !!user;
}
