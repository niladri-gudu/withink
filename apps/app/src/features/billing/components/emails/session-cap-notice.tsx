import * as React from "react";

import { EmailLayout, emailStyles } from "@/components/email/email-layout";

interface SessionCapNoticeProps {
  name: string;
  baseUrl: string;
}

export function SessionCapNotice({ name, baseUrl }: SessionCapNoticeProps) {
  return (
    <EmailLayout footer="You're receiving this because of a new sign-in on your withink account.">
      <h1 style={emailStyles.heading}>Signed out elsewhere</h1>
      <p style={emailStyles.text}>
        {name ? `Hey ${name}, ` : ""}you just signed in on a new device, so your
        oldest signed-in device was signed out of withink to keep one active
        seat.
      </p>
      <p style={emailStyles.text}>
        Nothing was deleted — you can sign back in on that device anytime.
      </p>
      <div style={emailStyles.buttonContainer}>
        <a href={baseUrl} style={emailStyles.button}>
          Sign back in
        </a>
      </div>
    </EmailLayout>
  );
}
