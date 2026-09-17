"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// Pages that should NOT show the sidebar (auth pages)
const AUTH_ROUTES = ["/login", "/set-password", "/mfa"];

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/students": "Students",
  "/students/new": "Students / New Student",
  "/classes": "Classes",
  "/staff": "Staff",
  "/attendance": "Attendance",
  "/grades": "Grades",
  "/fees": "Fees & Invoices",
  "/library": "Library",
  "/library/loans": "Library / Loans",
  "/transport": "Transport",
  "/transport/routes": "Transport / Routes",
  "/results": "Online Results & Report Cards",
  "/exams": "Exam & Term Management",
  "/portal/teacher": "Teacher Portal",
  "/portal/student": "Student Portal",
  "/portal/parent": "Parent & Guardian Portal",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Derive breadcrumb
  let breadcrumb = ROUTE_LABELS[pathname];
  if (!breadcrumb) {
    if (pathname.startsWith("/fees/")) breadcrumb = "Fees / Invoice Details";
    else if (pathname.startsWith("/students/")) breadcrumb = "Students / Profile";
    else breadcrumb = "School Portal";
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-page)" }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: 56,
            padding: "0 28px",
            backgroundColor: "var(--color-surface)",
            borderBottom: "var(--border-width) solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>
              {breadcrumb}
            </span>
          </div>

          {/* Right Header Status & User */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                borderRadius: "var(--radius-pill-badge)",
                backgroundColor: "var(--color-success-bg)",
                color: "var(--color-success-text)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-success-text)",
                  display: "inline-block",
                }}
              />
              Offline Mode
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", margin: 0, lineHeight: 1.2 }}>
                  System Admin
                </p>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>
                  admin@school.local
                </p>
              </div>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                SA
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
