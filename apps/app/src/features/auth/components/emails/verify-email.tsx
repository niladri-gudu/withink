import * as React from "react";

import { EmailLayout, emailStyles } from "@/components/email/email-layout";

interface VerifyEmailProps {
  name: string;
  url: string;
}

export function VerifyEmail({ name, url }: VerifyEmailProps) {
  return (
    <EmailLayout footer="This link expires in 24 hours. If you didn't sign up for withink, you can safely ignore this email.">
      <h1 style={emailStyles.heading}>Confirm your email</h1>
      <p style={emailStyles.text}>Hey {name},</p>
      <p style={emailStyles.text}>
        One tap and your diary is unlocked — verify this address to start
        writing.
      </p>
      <div style={emailStyles.buttonContainer}>
        <a href={url} style={emailStyles.button}>
          Verify my email
        </a>
      </div>
    </EmailLayout>
  );
}
