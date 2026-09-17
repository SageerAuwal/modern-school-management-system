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
  "/timetable": "Timetable & Routine",
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
    <div
      className="app-canvas"
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-canvas, #D4E5DC)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Central High-End Rounded Shell */}
      <div
        className="app-shell-card"
        style={{
          flex: 1,
          backgroundColor: "var(--color-surface, #FFFFFF)",
          borderRadius: "var(--radius-shell, 28px)",
          boxShadow: "0 16px 48px rgba(18, 50, 38, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          display: "flex",
          minHeight: "calc(100vh - 32px)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "calc(100vh - 32px)", overflow: "hidden" }}>
          {/* Top Header Bar matching reference */}
          <header
            style={{
              height: 64,
              padding: "0 28px",
              backgroundColor: "var(--color-surface, #FFFFFF)",
              borderBottom: "1px solid var(--color-border, #E8ECE9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            {/* Left: Pill Search Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "1px solid var(--color-border, #E8ECE9)",
                  width: 260,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search a task, student, class..."
                  style={{
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: 13,
                    color: "var(--color-ink)",
                    width: "100%",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-text-secondary)",
                    backgroundColor: "#FFFFFF",
                    padding: "2px 6px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border)",
                    lineHeight: 1,
                  }}
                >
                  ⌘K
                </span>
              </div>

              {/* Breadcrumb Path */}
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)", marginLeft: 8 }}>
                {breadcrumb}
              </span>
            </div>

            {/* Right: Notifications & User Profile Chip */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Notification Bell */}
              <button
                type="button"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                  border: "1px solid var(--color-border, #E8ECE9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--color-ink)",
                  transition: "background 0.15s",
                }}
                title="Notifications"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>

              {/* User Profile Pill Chip */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "4px 12px 4px 4px",
                  borderRadius: 9999,
                  backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                  border: "1px solid var(--color-border, #E8ECE9)",
                  cursor: "pointer",
                }}
              >
                <div
                  className="avatar"
                  style={{
                    width: 30,
                    height: 30,
                    fontSize: 11,
                    backgroundColor: "var(--color-ink, #182220)",
                    color: "#FFFFFF",
                  }}
                >
                  SA
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>
                    System Admin
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Page Body */}
          <div style={{ flex: 1, overflowY: "auto", backgroundColor: "var(--color-surface, #FFFFFF)" }}>
            {children}
          </div>
        </div>
      </div>

      {/* Print override style */}
      <style jsx global>{`
        @media print {
          .app-canvas {
            padding: 0 !important;
            background: #fff !important;
          }
          .app-shell-card {
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
