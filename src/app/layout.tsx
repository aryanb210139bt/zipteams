import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { hasClerk } from "@/lib/env";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CallIQ — Conversations Insights",
  description: "Conversation-intelligence platform: call audit rubric scoring, fabrication detection, and analytics.",
};

async function ClerkShell({ children }: { children: ReactNode }) {
  if (!hasClerk) return <>{children}</>;
  const { ClerkProvider } = await import("@clerk/nextjs");
  return <ClerkProvider>{children}</ClerkProvider>;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkShell>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkShell>
  );
}
