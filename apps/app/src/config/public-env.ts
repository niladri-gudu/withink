import { z } from "zod";

/**
 * Client-safe environment. Only `NEXT_PUBLIC_*` values, which Next.js inlines
 * at build time, so each must be referenced statically (not via a dynamic key).
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url(),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid public environment variables:\n${issues}`);
}

export const publicEnv = parsed.data;
