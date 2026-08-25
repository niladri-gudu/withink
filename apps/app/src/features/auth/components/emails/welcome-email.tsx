import * as React from "react";

import { EmailLayout, emailStyles } from "@/components/email/email-layout";

interface WelcomeEmailProps {
  userFirstname: string;
  baseUrl: string;
}

export function WelcomeEmail({ userFirstname, baseUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout footer="You're receiving this because you just started a diary at withink.me.">
      <h1 style={emailStyles.heading}>Your diary is ready</h1>
      <p style={emailStyles.text}>Hi {userFirstname},</p>
      <p style={emailStyles.text}>
        Welcome to <strong>withink</strong> — a private, quiet space designed
        for your mind to breathe. No feeds, no noise. Just you and the page.
      </p>
      <div style={{ margin: "20px 0" }}>
        <p style={emailStyles.bullet}>
          <span style={emailStyles.bulletDot}>●</span>&nbsp;&nbsp;Private by
          default — your pages belong to you alone.
        </p>
        <p style={emailStyles.bullet}>
          <span style={emailStyles.bulletDot}>●</span>&nbsp;&nbsp;Start with
          today: what mattered most?
        </p>
      </div>
      <div style={emailStyles.buttonContainer}>
        <a href={`${baseUrl}/dashboard`} style={emailStyles.button}>
          Open your journal
        </a>
      </div>
    </EmailLayout>
  );
}
