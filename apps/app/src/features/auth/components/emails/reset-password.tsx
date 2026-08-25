import * as React from "react";

import { EmailLayout, emailStyles } from "@/components/email/email-layout";

interface ResetPasswordProps {
  name: string;
  url: string;
}

export function ResetPassword({ name, url }: ResetPasswordProps) {
  return (
    <EmailLayout footer="This link expires in 1 hour.">
      <h1 style={emailStyles.heading}>Reset your password</h1>
      <p style={emailStyles.text}>Hey {name},</p>
      <p style={emailStyles.text}>
        We received a request to get you back into your diary. Choose a new
        password below and you&apos;re in.
      </p>
      <div style={emailStyles.buttonContainer}>
        <a href={url} style={emailStyles.button}>
          Choose a new password
        </a>
      </div>
      <p style={emailStyles.hint}>
        Didn&apos;t ask for this? Ignore it — your diary is untouched.
      </p>
    </EmailLayout>
  );
}
