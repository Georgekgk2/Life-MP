"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true)
    ) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic browser banner
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback instruction for iOS / browsers without beforeinstallprompt
      alert(
        "Щоб встановити додаток ЛАЙФ на iPhone або iPad:\n1. Натисніть кнопку «Поділитися» (іконка зі стрілкою вгору) внизу Safari.\n2. Оберіть пункт «На екран Додому».",
      );
      return;
    }

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <div
      className="pwa-install-banner"
      role="region"
      aria-label="Встановлення додатку ЛАЙФ"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.75rem 1.25rem",
        backgroundColor: "var(--color-pine-900)",
        color: "var(--color-sand-100)",
        borderRadius: "var(--radius-md)",
        margin: "1rem 0",
        boxShadow: "0 4px 16px rgba(26, 48, 38, 0.2)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            backgroundColor: "var(--color-terracotta-500)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            color: "#fff",
            fontSize: "1.2rem",
            flexShrink: 0,
          }}
        >
          Л
        </div>
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.95rem",
              lineHeight: 1.2,
              color: "#fff",
            }}
          >
            Встановити додаток ЛАЙФ
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "rgba(250, 247, 242, 0.8)",
              marginTop: "2px",
            }}
          >
            Швидкий доступ до улюблених майстерень на екрані вашого смартфона
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={handleInstallClick}
          className="button button-primary"
          style={{
            padding: "0.4rem 0.85rem",
            fontSize: "0.85rem",
            backgroundColor: "var(--color-terracotta-500)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Встановити
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Закрити пропозицію встановлення"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(250, 247, 242, 0.6)",
            fontSize: "1.25rem",
            cursor: "pointer",
            padding: "0.25rem 0.5rem",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
