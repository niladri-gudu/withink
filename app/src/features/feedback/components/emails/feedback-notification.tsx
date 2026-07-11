import * as React from "react";
import type { FeedbackCategory } from "../../validation/feedback-schema";

interface FeedbackNotificationProps {
  category: FeedbackCategory;
  subject: string;
  message: string;
  fromEmail: string;
  imageUrl?: string;
  traceId: string;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bug report",
  idea: "Feature idea",
  general: "General feedback",
};

export function FeedbackNotification({
  category,
  subject,
  message,
  fromEmail,
  imageUrl,
  traceId,
}: FeedbackNotificationProps) {
  return (
    <div style={main}>
      <div style={container}>
        <div style={logoContainer}>
          <span style={logo}>withink.</span>
        </div>

        <span style={badge}>{CATEGORY_LABELS[category]}</span>

        <h1 style={h1}>{subject}</h1>
        <p style={meta}>From {fromEmail}</p>

        <div style={divider} />

        <p style={text}>{message}</p>

        {imageUrl ? (
          <>
            <div style={divider} />
            <p style={meta}>Attached screenshot</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Attached screenshot" style={image} />
          </>
        ) : null}

        <div style={divider} />

        <p style={footer}>Trace ID: {traceId}</p>
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
  marginBottom: "24px",
};

const logo = {
  fontSize: "22px",
  fontWeight: "900",
  color: "#f4f4f5",
  letterSpacing: "-1px",
};

const badge = {
  display: "inline-block",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  color: "#a1a1aa",
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "999px",
  padding: "4px 12px",
};

const h1 = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#f4f4f5",
  margin: "16px 0 4px 0",
  letterSpacing: "-0.5px",
};

const meta = {
  fontSize: "13px",
  color: "#a1a1aa",
  margin: "0 0 4px 0",
};

const text = {
  fontSize: "15px",
  color: "#d4d4d8",
  lineHeight: "1.7",
  whiteSpace: "pre-wrap" as const,
  margin: 0,
};

const image = {
  maxWidth: "100%",
  borderRadius: "10px",
  border: "1px solid #27272a",
  marginTop: "12px",
};

const divider = {
  borderTop: "1px solid #27272a",
  margin: "24px 0",
};

const footer = {
  fontSize: "12px",
  color: "#52525b",
  margin: 0,
};
