import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PwaProvider } from "@/components/pwa-provider";

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
  title: "FORGE",
  description: "Local-first energy and nutrition dashboard.",
  applicationName: "FORGE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] font-sans">
        <PwaProvider />
        {children}
      </body>
    </html>
  );
}
