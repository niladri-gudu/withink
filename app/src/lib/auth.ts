import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { client } from "./db";
import { env } from "@/config/env";
import { resend } from "./email";
import { WelcomeEmail } from "@/features/auth/components/emails/welcome-email";
import { VerifyEmail } from "@/features/auth/components/emails/verify-email";
import { ResetPassword } from "@/features/auth/components/emails/reset-password";
import { logger } from "@/server/logger";

const DB_NAME = env.IS_PROD ? "withink_prod" : "withink_dev";

export const auth = betterAuth({
  database: mongodbAdapter(client.db(DB_NAME), { client }),

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.emailVerified) {
            try {
              await resend.emails.send({
                from: env.EMAIL_FROM,
                to: user.email,
                subject: "Welcome to your sanctuary - withink.",
                react: WelcomeEmail({
                  userFirstname: (user.name || "friend").split(" ")[0] || "friend",
                  baseUrl: env.BETTER_AUTH_URL,
                }),
              });
            } catch (error) {
              logger.error("[Better Auth Database Hook] Welcome email failed", error as Error, { email: user.email });
            }
          }
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: env.IS_PROD,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      try {
        await resend.emails.send({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: "Reset your password - withink.",
          react: ResetPassword({ name: user.name, url }),
        });
      } catch (error) {
        logger.error("[Better Auth sendResetPassword] Failed to send reset password email", error as Error, { email: user.email });
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        const verificationUrl = new URL(url);
        verificationUrl.searchParams.set("callbackURL", "/verified");

        await resend.emails.send({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: "Verify your email - withink.",
          react: VerifyEmail({
            name: user.name,
            url: verificationUrl.toString(),
          }),
        });
      } catch (error) {
        logger.error("[Better Auth sendVerificationEmail] Failed to send verification email", error as Error, { email: user.email });
      }
    },
    afterEmailVerification: async (user) => {
      try {
        await resend.emails.send({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: "Welcome to your sanctuary - withink.",
          react: WelcomeEmail({
            userFirstname: (user.name || "friend").split(" ")[0] || "friend",
            baseUrl: env.BETTER_AUTH_URL,
          }),
        });
        logger.info("Welcome email sent successfully after email verification", { email: user.email });
      } catch (error) {
        logger.error("[Better Auth afterEmailVerification] Welcome email failed", error as Error, { email: user.email });
      }
    },
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    },
  },

  plugins: [nextCookies()],
  trustHost: true,
  cookies: {
    sessionToken: {
      options: {
        domain: env.IS_PROD ? ".withink.me" : undefined,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
