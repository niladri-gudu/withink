import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Access your private journal and digital sanctuary.",
};

export default function LoginPage() {
  return <LoginForm />;
}
