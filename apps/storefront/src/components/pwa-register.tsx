"use client";

import { useEffect } from "react";

export function PwaRegister(): null {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol.startsWith("http")
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Graceful fallback if Service Worker registration is blocked
        });
      });
    }
  }, []);

  return null;
}
