"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// Pages that should NOT show the sidebar (auth pages)
const AUTH_ROUTES = ["/login", "/set-password", "/mfa"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthPage) {
    // Auth pages: full screen, no sidebar
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-page)" }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
