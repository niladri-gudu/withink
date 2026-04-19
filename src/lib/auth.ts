import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { client } from "./db";
import { VerifyEmail } from "@/components/emails/verify-email";
import { ResetPassword } from "@/components/emails/reset-password";

const resend = new Resend(process.env.RESEND_API_KEY);

const isProduction = process.env.IS_PROD === "true";
const DB_NAME = isProduction ? "withink_prod" : "withink_dev";

export const auth = betterAuth({
  database: mongodbAdapter(client.db(DB_NAME), { client }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
        subject: "Reset your password — withink.",
        react: ResetPassword({ name: user.name, url }),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const verificationUrl = new URL(url);
      verificationUrl.searchParams.set("callbackURL", "/verified");

      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
        subject: "Verify your email — withink.",
        react: VerifyEmail({
          name: user.name,
          url: verificationUrl.toString(),
        }),
      });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: "select_account",
    },
  },

  plugins: [nextCookies()],
  trustHost: true,
});

export type Session = typeof auth.$Infer.Session;
