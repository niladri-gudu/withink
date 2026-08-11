import * as React from "react";

interface WelcomeEmailProps {
  userFirstname: string;
  baseUrl: string;
}

export function WelcomeEmail({ userFirstname, baseUrl }: WelcomeEmailProps) {
  return (
    <div style={main}>
      <div style={container}>
        <h1 style={h1}>think in ink.</h1>
        <p style={text}>Hi {userFirstname},</p>
        <p style={text}>
          Welcome to <strong>withink.</strong>—a private, minimal space designed
          for your mind to breathe. Your sanctuary is now ready.
        </p>
        <div style={buttonContainer}>
          <a href={`${baseUrl}/dashboard`} style={button}>
            Open Your Journal
          </a>
        </div>
        <div style={divider} />
        <p style={footer}>
          This email was sent to welcome you to the archives.
        </p>
      </div>
    </div>
  );
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "40px 20px",
};

const container = {
  margin: "0 auto",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "40px",
};

const h1 = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "bold",
  letterSpacing: "-0.5px",
  margin: "0 0 24px 0",
};

const text = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const buttonContainer = {
  padding: "16px 0",
};

const button = {
  backgroundColor: "#111827",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const divider = {
  borderTop: "1px solid #e5e7eb",
  margin: "32px 0 24px 0",
};

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: 0,
};
