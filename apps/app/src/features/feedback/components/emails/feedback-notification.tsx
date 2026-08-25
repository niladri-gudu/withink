import * as React from "react";

import {
  emailColors,
  EmailLayout,
  emailStyles,
} from "@/components/email/email-layout";

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
    <EmailLayout footer={`Trace ID: ${traceId}`}>
      <span style={emailStyles.badge}>{CATEGORY_LABELS[category]}</span>
      <h1 style={{ ...emailStyles.heading, margin: "14px 0 4px 0" }}>
        {subject}
      </h1>
      <p style={{ ...emailStyles.hint, marginBottom: "20px" }}>
        From {fromEmail}
      </p>
      <p style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>{message}</p>
      {imageUrl ? (
        <>
          <p style={{ ...emailStyles.hint, margin: "20px 0 0 0" }}>
            Attached screenshot
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Attached screenshot"
            style={{
              maxWidth: "100%",
              borderRadius: "10px",
              border: `1px solid ${emailColors.border}`,
              marginTop: "12px",
            }}
          />
        </>
      ) : null}
    </EmailLayout>
  );
}
