"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import SchoolCompanionDrawer from "./SchoolCompanionDrawer";

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
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
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

          {/* Right Header Controls & Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Quick Companion Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsCompanionOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 18,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-page)",
                color: "var(--color-ink)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Open School Companion & Quick Help"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Assistant</span>
            </button>

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
              Live System
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", margin: 0, lineHeight: 1.2 }}>
                  Admin / Staff
                </p>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>
                  School Management
                </p>
              </div>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                SM
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </div>

        {/* Collapsible School Companion Drawer */}
        <SchoolCompanionDrawer
          isOpen={isCompanionOpen}
          onClose={() => setIsCompanionOpen(false)}
        />
      </div>
    </div>
  );
}
