import * as React from "react";

import { EmailLayout, emailStyles } from "@/components/email/email-layout";

interface ResetPasscodeProps {
  name: string;
  code: string;
}

export function ResetPasscode({ name, code }: ResetPasscodeProps) {
  return (
    <EmailLayout footer="Didn't request this? Nothing changes — your passcode stays exactly as it was.">
      <h1 style={emailStyles.heading}>Reset your diary passcode</h1>
      <p style={emailStyles.text}>Hey {name},</p>
      <p style={emailStyles.text}>
        Use this code to reset the passcode protecting your diary:
      </p>
      <div style={{ margin: "24px 0", textAlign: "center" as const }}>
        <span style={emailStyles.codeChip}>{code}</span>
      </div>
      <p style={emailStyles.hint}>This code expires in 15 minutes.</p>
    </EmailLayout>
  );
}
