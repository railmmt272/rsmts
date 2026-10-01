import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "RSMTS - Rolling Stock Movement & Tracking System",
  description: "Advanced asset management, real-time tracking, and shunting program system for Indian Railways operations.",
  keywords: ["RSMTS", "Railway Tracking", "Asset Management", "Indian Railways", "Jamalpur Workshop"],
  authors: [{ name: "IT Support" }],
  openGraph: {
    title: "RSMTS - Rolling Stock Movement & Tracking System",
    description: "Advanced asset management, real-time tracking, and shunting program system for Indian Railways operations.",
    type: "website",
    siteName: "RSMTS Dashboard",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
