import type { Metadata } from "next";

import { VerifiedContent } from "@/features/auth/components/verified-content";

export const metadata: Metadata = {
  title: "Email Verified",
  description: "Your email has been verified successfully.",
};

export default function VerifiedPage() {
  return <VerifiedContent />;
}
