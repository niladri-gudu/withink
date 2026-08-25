import "server-only";

import { z } from "zod";

/**
 * Server-side environment. Validated lazily on first access so that importing
 * this module never crashes a build that has no secrets available; the first
 * runtime read fails fast with a readable message if anything is missing.
 *
 * Secrets must never reach the client — this module is `server-only`.
 */
const serverEnvSchema = z.object({
  IS_PROD: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  MONGODB_URI: z.string().url(),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Redis is an optional optimization — the app functions without it.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  CONTACT_EMAIL: z.string().email(),

  // 32 bytes, hex-encoded → 64 characters. Powers AES-256-GCM.
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex characters"),

  // Dodo Payments (billing). Optional like Redis: the app boots and runs on
  // the Free tier without it; checkout/portal/webhook surfaces degrade with a
  // clear error until configured. Product ids map to PLAN_PRODUCTS keys in
  // features/billing/config/plans.ts.
  DODO_API_KEY: z.string().min(1).optional(),
  DODO_WEBHOOK_SECRET: z.string().min(1).optional(),
  DODO_PRODUCT_PLUS_MONTHLY: z.string().min(1).optional(),
  DODO_PRODUCT_PLUS_YEARLY: z.string().min(1).optional(),
  DODO_PRODUCT_PRO_MONTHLY: z.string().min(1).optional(),
  DODO_PRODUCT_PRO_YEARLY: z.string().min(1).optional(),
  DODO_PRODUCT_PRO_LIFETIME: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

function parseServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment variables:\n${issues}`);
  }

  return parsed.data;
}

/**
 * Lazily-validated, cached server environment.
 * Access as `env.MONGODB_URI`; validation runs once on first read.
 */
export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    cached ??= parseServerEnv();
    return cached[prop as keyof ServerEnv];
  },
});
