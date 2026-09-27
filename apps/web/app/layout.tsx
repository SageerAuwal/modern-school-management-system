import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./components/AppShell";

export const metadata: Metadata = {
  title: {
    default: "Bright Future Academy - School Management System",
    template: "%s | Bright Future Academy",
  },
  description: "Official School Portal for Bright Future Academy, Kashere. Guided By Principles, Driven By Purpose. Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State.",
  icons: {
    icon: "/school-logo.png",
    shortcut: "/school-logo.png",
    apple: "/school-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
