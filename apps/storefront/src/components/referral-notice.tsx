"use client";

import { useReferral } from "@/context/referral-context";
import { useState } from "react";

export function ReferralNotice() {
  const { attribution } = useReferral();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!attribution || isDismissed) {
    return null;
  }

  const sourceLabels: Record<string, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    telegram: "Telegram",
    direct: "Партнерське посилання",
    other: "Реферальне посилання",
  };

  const channelName =
    sourceLabels[attribution.source] || "Партнерське посилання";

  return (
    <aside
      className="referral-notice-bar"
      aria-label="Реферальна інформація"
      style={{
        backgroundColor: "var(--color-primary-quiet, #e8f5e9)",
        borderBottom: "1px solid var(--color-border-subtle, #d5ded9)",
        color: "var(--color-primary-strong, #1b5e20)",
        fontSize: "0.8125rem",
        fontWeight: 500,
        padding: "0.4rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          margin: "0 auto",
        }}
      >
        <span aria-hidden="true">🤝</span>
        <span>
          Ви перейшли за рекомендацією автора:{" "}
          <strong>@{attribution.refCode}</strong> ({channelName})
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsDismissed(true);
        }}
        aria-label="Приховати сповіщення про рекомендацію"
        title="Приховати сповіщення"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "1rem",
          color: "inherit",
          padding: "0.2rem 0.4rem",
          lineHeight: 1,
          opacity: 0.7,
        }}
      >
        ✕
      </button>
    </aside>
  );
}
