"use client";

import { useState } from "react";
import type { StorefrontCatalogProduct } from "@life/types";
import { VideoPlayerModal } from "./video-player-modal";

type OrganizationVideoTriggerProps = Readonly<{
  videoTitle: string;
  videoDuration?: string | undefined;
  organizationName: string;
  videoEmbedUrl?: string | undefined;
  relatedProducts?: readonly StorefrontCatalogProduct[] | undefined;
}>;

export function OrganizationVideoTrigger({
  videoTitle,
  videoDuration,
  organizationName,
  videoEmbedUrl,
  relatedProducts = [],
}: OrganizationVideoTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="partner-card__video-trigger-wrap"
      style={{ margin: "0.5rem 0" }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="button button--secondary button--sm"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.45rem 0.75rem",
          fontSize: "0.8125rem",
          fontWeight: 600,
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border-strong)",
          color: "var(--color-ink)",
          cursor: "pointer",
          borderRadius: "var(--radius-sm)",
          textAlign: "left",
        }}
        title={`Переглянути відео: ${videoTitle}`}
        aria-label={`Переглянути відео: ${videoTitle}`}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            minWidth: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{ color: "var(--color-primary-strong)" }}
          >
            ▶
          </span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {videoTitle}
          </span>
        </span>
        {videoDuration && (
          <span
            className="badge badge--demo"
            style={{
              fontSize: "0.6875rem",
              flexShrink: 0,
              padding: "0.15rem 0.4rem",
              minHeight: 0,
            }}
          >
            {videoDuration}
          </span>
        )}
      </button>

      <VideoPlayerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        videoTitle={videoTitle}
        videoDuration={videoDuration}
        organizationName={organizationName}
        videoEmbedUrl={videoEmbedUrl}
        relatedProducts={relatedProducts}
      />
    </div>
  );
}
