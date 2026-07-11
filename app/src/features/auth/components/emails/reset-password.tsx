import * as React from "react";

interface ResetPasswordProps {
  name: string;
  url: string;
}

export function ResetPassword({ name, url }: ResetPasswordProps) {
  return (
    <div style={main}>
      <div style={container}>
        <div style={logoContainer}>
          <span style={logo}>withink.</span>
        </div>

        <h1 style={h1}>Reset your password</h1>
        <p style={text}>
          Hey {name}, we received a request to access your sanctuary. Click the
          button below to choose a new password.
        </p>

        <a href={url} style={button}>
          Reset password
        </a>

        <div style={divider} />

        <p style={footer}>
          This link expires in 1 hour. If you didn&apos;t request this, you can safely ignore it.
        </p>
      </div>
    </div>
  );
}

const main = {
  fontFamily: "ui-monospace, monospace",
  backgroundColor: "#020617",
  color: "#e4e4e7",
  padding: "40px 20px",
};

const container = {
  maxWidth: "480px",
  margin: "0 auto",
  backgroundColor: "#09090b",
  border: "1px solid #27272a",
  borderRadius: "16px",
  padding: "40px",
};

const logoContainer = {
  marginBottom: "32px",
};

const logo = {
  fontSize: "22px",
  fontWeight: "900",
  color: "#f4f4f5",
  letterSpacing: "-1px",
};

const h1 = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#f4f4f5",
  margin: "0 0 8px 0",
  letterSpacing: "-0.5px",
};

const text = {
  fontSize: "15px",
  color: "#a1a1aa",
  margin: "0 0 32px 0",
  lineHeight: "1.6",
};

const button = {
  display: "inline-block",
  backgroundColor: "#f4f4f5",
  color: "#09090b",
  fontWeight: "600",
  fontSize: "14px",
  padding: "12px 28px",
  borderRadius: "10px",
  textDecoration: "none",
};

const divider = {
  borderTop: "1px solid #27272a",
  margin: "32px 0",
};

const footer = {
  fontSize: "12px",
  color: "#52525b",
  margin: 0,
};
