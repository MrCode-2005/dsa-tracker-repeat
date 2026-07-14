import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/providers/query-provider";
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
  title: "Repeat — DSA Tracker & Spaced Revision",
  description:
    "Track your DSA practice, schedule spaced revisions automatically, and ace your coding interviews. The smartest way to prepare.",
  keywords: ["DSA", "LeetCode", "coding interview", "spaced repetition", "NeetCode"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
