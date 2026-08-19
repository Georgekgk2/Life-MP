import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components";
import { SavedProvider } from "@/context/saved-context";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Life-MP — вітрина можливостей",
    template: "%s | Life-MP",
  },
  description:
    "Демонстраційна вітрина Life-MP з локальними даними про людей, історії та події.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <SavedProvider>
          <SiteHeader />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </SavedProvider>
      </body>
    </html>
  );
}
