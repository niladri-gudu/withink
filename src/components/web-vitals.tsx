"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric: { id: string; name: string; value: number; rating: "good" | "needs-improvement" | "poor"; delta: number }) => {
    const payload = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    };

    const body = JSON.stringify(payload);

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/monitoring/web-vitals", blob);
    } else {
      fetch("/api/monitoring/web-vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch((err) => {
        console.error("Failed to send Web Vitals:", err);
      });
    }
  });

  return null;
}
