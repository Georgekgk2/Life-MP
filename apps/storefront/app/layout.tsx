import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import {
  InstallPwaPrompt,
  PwaRegister,
  SiteFooter,
  SiteHeader,
} from "@/components";
import { SavedProvider } from "@/context/saved-context";
import { ProfileProvider } from "@/context/profile-context";

import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1a3026",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Life-MP — вітрина можливостей",
    template: "%s | Life-MP",
  },
  description:
    "Український маркетплейс локальних крафтових виробів, натуральних продуктів та спільноти майстрів.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ЛАЙФ",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <PwaRegister />
        <ProfileProvider>
          <SavedProvider>
            <SiteHeader />
            <main id="main-content" tabIndex={-1}>
              <div className="layout-shell">
                <InstallPwaPrompt />
              </div>
              {children}
            </main>
            <SiteFooter />
          </SavedProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
