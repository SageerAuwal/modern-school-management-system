import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./components/AppShell";
import { ThemeProvider } from "./context/ThemeContext";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('sms-theme');
                  var theme = saved;
                  if (theme === 'system' || !theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (theme === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
