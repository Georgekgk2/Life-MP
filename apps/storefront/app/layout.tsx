import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import {
  CartDrawer,
  ChatBotWidget,
  PwaRegister,
  SiteFooter,
  SiteHeader,
} from "@/components";
import { CartProvider } from "@/context/cart-context";
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
    default: "Life-MP — демонстраційна вітрина спільноти",
    template: "%s | Life-MP",
  },
  description:
    "Демонстраційна вітрина Life-MP із синтетичними даними: майстри, вироби та історії локальної спільноти в sandbox-режимі.",
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
            <CartProvider>
              <SiteHeader />
              <CartDrawer />
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <SiteFooter />
              <ChatBotWidget />
            </CartProvider>
          </SavedProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
