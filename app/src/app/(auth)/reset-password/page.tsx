import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your private digital sanctuary.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
