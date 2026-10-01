import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | RSMTS Dashboard",
  description: "Secure login portal for the Rolling Stock Movement & Tracking System (RSMTS). Access real-time tracking, workshop management, and fleet operations.",
  robots: "index, follow",
  openGraph: {
    title: "Login | RSMTS Dashboard",
    description: "Secure login portal for the Rolling Stock Movement & Tracking System (RSMTS).",
    url: "/login",
    siteName: "RSMTS",
    type: "website",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
