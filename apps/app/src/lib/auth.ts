import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/config/env";
import { logger } from "@/server/logger";
import { ResetPassword } from "@/features/auth/components/emails/reset-password";
import { VerifyEmail } from "@/features/auth/components/emails/verify-email";
import { WelcomeEmail } from "@/features/auth/components/emails/welcome-email";
import { SessionCapService } from "@/features/billing/services/session-cap-service";

import { client, DB_NAME } from "./db";
import { resend } from "./email";

export const auth = betterAuth({
  database: mongodbAdapter(client.db(DB_NAME), { client }),

  trustedOrigins: env.IS_PROD
    ? ["https://withink.me", "https://app.withink.me"]
    : ["http://localhost:3000", "https://dev.withink.me"],

  advanced: {
    crossSubDomainCookies: {
      enabled: env.IS_PROD,
      domain: "withink.me",
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Device soft-kick (Gate #3): enforce the plan's concurrent-session
        // cap after each new sign-in. Best-effort — never blocks auth.
        after: async (session) => {
          await SessionCapService.enforceOnSessionCreate(session.userId);
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          if (user.emailVerified) {
            try {
              await resend.emails.send({
                from: env.EMAIL_FROM,
                to: user.email,
                subject: "Your diary is ready · withink.",
                react: WelcomeEmail({
                  userFirstname:
                    (user.name || "friend").split(" ")[0] || "friend",
                  baseUrl: env.BETTER_AUTH_URL,
                }),
                text:
                  `Hi ${(user.name || "friend").split(" ")[0] || "friend"},\n\n` +
                  "Welcome to withink — a private, quiet space designed for " +
                  "your mind to breathe. Your diary is ready.\n\n" +
                  `Start writing: ${env.BETTER_AUTH_URL}/dashboard\n`,
              });
            } catch (error) {
              logger.error(
                "[Better Auth Database Hook] Welcome email failed",
                error as Error,
                { email: user.email },
              );
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
          subject: "Reset your password · withink.",
          react: ResetPassword({ name: user.name || "friend", url }),
          text:
            `Hey ${user.name || "friend"},\n\n` +
            "We received a request to get you back into your diary. " +
            `Choose a new password:\n${url}\n\n` +
            "This link expires in 1 hour. If you didn't request this, " +
            "you can safely ignore it — your diary is untouched.\n",
        });
      } catch (error) {
        logger.error(
          "[Better Auth sendResetPassword] Failed to send reset password email",
          error as Error,
          { email: user.email },
        );
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
          subject: "Confirm your email · withink.",
          react: VerifyEmail({
            name: user.name || "friend",
            url: verificationUrl.toString(),
          }),
          text:
            `Hey ${user.name || "friend"},\n\n` +
            "Verify your email address to start journaling:\n" +
            `${verificationUrl.toString()}\n\n` +
            "This link expires in 24 hours.\n",
        });
      } catch (error) {
        logger.error(
          "[Better Auth sendVerificationEmail] Failed to send verification email",
          error as Error,
          { email: user.email },
        );
      }
    },
    afterEmailVerification: async (user) => {
      try {
        await resend.emails.send({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: "Your diary is ready · withink.",
          react: WelcomeEmail({
            userFirstname: (user.name || "friend").split(" ")[0] || "friend",
            baseUrl: env.BETTER_AUTH_URL,
          }),
          text:
            `Hi ${(user.name || "friend").split(" ")[0] || "friend"},\n\n` +
            "Welcome to withink — a private, quiet space designed for " +
            "your mind to breathe. Your diary is ready.\n\n" +
            `Start writing: ${env.BETTER_AUTH_URL}/dashboard\n`,
        });
        logger.info(
          "Welcome email sent successfully after email verification",
          { email: user.email },
        );
      } catch (error) {
        logger.error(
          "[Better Auth afterEmailVerification] Welcome email failed",
          error as Error,
          { email: user.email },
        );
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
});

export type Session = typeof auth.$Infer.Session;
