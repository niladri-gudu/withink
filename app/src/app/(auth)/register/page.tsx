import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create Sanctuary",
  description: "Create your private, encrypted, and minimal digital journal.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
