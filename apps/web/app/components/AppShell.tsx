"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
  "/account": "My Account & Settings",
  "/reports": "Reports & Analytics",
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface AlertNotification {
  id: string;
  category: "Library" | "Fees" | "Transport" | "Attendance" | "System";
  title: string;
  detail: string;
  href: string;
  actionText: string;
  timestamp: string;
  isRead: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  schoolId?: string;
  school?: { name: string };
  photoUrl?: string;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Current authenticated user state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Dropdown states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Load authenticated user profile from backend
  useEffect(() => {
    if (isAuthPage) return;

    async function loadUser() {
      try {
        const res = await fetch(`${API}/api/v1/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setCurrentUser(data);
          }
        }
      } catch {}
    }

    loadUser();
  }, [pathname, isAuthPage]);

  // Route protection guard for non-admin roles
  useEffect(() => {
    if (isAuthPage || !currentUser) return;
    const r = (currentUser.role || "").toUpperCase();

    // Prevent non-admin users from landing on /dashboard
    if (pathname === "/dashboard") {
      if (r === "TEACHER") router.replace("/portal/teacher");
      else if (r === "PARENT") router.replace("/portal/parent");
      else if (r === "STUDENT") router.replace("/portal/student");
    } else if (pathname === "/staff" && r !== "ADMIN") {
      if (r === "TEACHER") router.replace("/portal/teacher");
      else if (r === "PARENT") router.replace("/portal/parent");
      else if (r === "STUDENT") router.replace("/portal/student");
    }
  }, [currentUser, pathname, isAuthPage, router]);

  // Load real alert notifications from backend
  useEffect(() => {
    if (isAuthPage) return;

    async function loadAlerts() {
      try {
        const res = await fetch(`${API}/api/v1/dashboard/alerts`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const list: AlertNotification[] = [];

          if (data.overdueBooks?.count > 0) {
            list.push({
              id: "alert-books",
              category: "Library",
              title: "Overdue Library Books",
              detail: `${data.overdueBooks.count} library books are currently past their return date.`,
              href: "/library/loans",
              actionText: "Review Loans",
              timestamp: "Active",
              isRead: false,
            });
          }

          if (data.unpaidFees?.count > 0) {
            list.push({
              id: "alert-fees",
              category: "Fees",
              title: "Outstanding Fee Invoices",
              detail: `${data.unpaidFees.count} student invoices remain unpaid for the active term.`,
              href: "/fees",
              actionText: "View Invoices",
              timestamp: "Active",
              isRead: false,
            });
          }

          if (data.busesNearFull?.count > 0) {
            list.push({
              id: "alert-buses",
              category: "Transport",
              title: "Bus Fleet Near Capacity",
              detail: `${data.busesNearFull.count} bus routes are operating at over 90% seat capacity.`,
              href: "/transport",
              actionText: "Inspect Routes",
              timestamp: "Active",
              isRead: false,
            });
          }

          // Always add routine school system notices
          list.push({
            id: "notice-term",
            category: "System",
            title: "Academic Routine Synchronized",
            detail: "Weekly timetable and room allocations verified conflict-free.",
            href: "/timetable",
            actionText: "View Timetable",
            timestamp: "Today",
            isRead: false,
          });

          setNotifications(list);
          setUnreadCount(list.filter((n) => !n.isRead).length);
        }
      } catch {
        // Fallback standard notices if API is offline
        const fallbackList: AlertNotification[] = [
          {
            id: "fb-1",
            category: "System",
            title: "School Session Active",
            detail: "System operating normally for First Term 2025/2026 Academic Session.",
            href: "/dashboard",
            actionText: "Dashboard",
            timestamp: "Today",
            isRead: false,
          },
        ];
        setNotifications(fallbackList);
        setUnreadCount(1);
      }
    }

    loadAlerts();
  }, [pathname, isAuthPage]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on route changes
  useEffect(() => {
    setIsNotificationsOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    router.push("/login");
  };

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Derive dynamic user details for header and profile dropdown
  const userRole = (currentUser?.role || "ADMIN").toUpperCase();
  const userFullName = currentUser
    ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.email || "System Admin"
    : "System Admin";
  const userInitials = currentUser
    ? `${(currentUser.firstName?.[0] || "").toUpperCase()}${(currentUser.lastName?.[0] || currentUser.email?.[0] || "U").toUpperCase()}`
    : "SA";
  const userEmail = currentUser?.email || "admin@school.local";
  const schoolName = currentUser?.school?.name || "Bright Future Academy";

  let userRoleBadge = "Super Administrator";
  let rolePrefix = "Admin";
  if (userRole === "TEACHER" || userRole === "STAFF") {
    userRoleBadge = "Teacher / Staff";
    rolePrefix = "Teacher";
  } else if (userRole === "PARENT") {
    userRoleBadge = "Parent / Guardian";
    rolePrefix = "Parent";
  } else if (userRole === "STUDENT") {
    userRoleBadge = "Student";
    rolePrefix = "Student";
  } else if (userRole === "BURSAR") {
    userRoleBadge = "Bursar / Accounts";
    rolePrefix = "Bursar";
  }

  // Derive role-rigid breadcrumb
  let baseBreadcrumb = ROUTE_LABELS[pathname];
  if (!baseBreadcrumb) {
    if (pathname.startsWith("/fees/")) baseBreadcrumb = "Fees / Invoice Details";
    else if (pathname.startsWith("/students/")) baseBreadcrumb = "Students / Profile";
    else if (pathname.startsWith("/account")) baseBreadcrumb = "My Account & Settings";
    else if (pathname.startsWith("/reports")) baseBreadcrumb = "Reports & Analytics";
    else baseBreadcrumb = "Overview";
  }
  const breadcrumb = `${rolePrefix} › ${baseBreadcrumb}`;

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
        <Sidebar role={currentUser?.role} />

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
              position: "relative",
              zIndex: 80,
            }}
          >
            {/* Left: Pill Search Bar & Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
                  CMD+K
                </span>
              </div>

              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)", marginLeft: 6 }}>
                {breadcrumb}
              </span>
            </div>

            {/* Right: Notifications & User Profile Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* ── 1. REAL NOTIFICATION BELL CONTAINER ────────────────────── */}
              <div ref={notifRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen((prev) => !prev);
                    setIsProfileOpen(false);
                  }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    backgroundColor: isNotificationsOpen ? "var(--color-brand-teal, #0E7D75)" : "var(--color-surface-subtle, #F4F7F5)",
                    border: "1px solid var(--color-border, #E8ECE9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: isNotificationsOpen ? "#FFFFFF" : "var(--color-ink)",
                    position: "relative",
                    transition: "all 0.15s",
                  }}
                  title="Notifications"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>

                  {/* Active Count Badge */}
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -3,
                        right: -3,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        backgroundColor: "var(--color-accent-gold, #F7C844)",
                        color: "#182220",
                        fontSize: 10,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                        border: "2px solid #FFFFFF",
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Panel */}
                {isNotificationsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: 48,
                      right: 0,
                      width: 350,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 20,
                      boxShadow: "0 20px 48px rgba(18, 50, 38, 0.16)",
                      border: "1px solid var(--color-border, #E8ECE9)",
                      padding: 0,
                      zIndex: 9999,
                      overflow: "hidden",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: "14px 18px",
                        borderBottom: "1px solid var(--color-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "var(--color-surface-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-ink)" }}>
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 9999,
                              backgroundColor: "var(--color-brand-teal)",
                              color: "#FFFFFF",
                            }}
                          >
                            {unreadCount} New
                          </span>
                        )}
                      </div>

                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          style={{
                            border: "none",
                            background: "transparent",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--color-brand-teal)",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* Alert Items List */}
                    <div style={{ maxHeight: 320, overflowY: "auto", padding: "6px 0" }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 12 }}>
                          No active notifications.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            style={{
                              padding: "12px 18px",
                              borderBottom: "1px solid var(--color-border)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              backgroundColor: notif.isRead ? "#FFFFFF" : "var(--color-surface-subtle)",
                              transition: "background 0.15s",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-brand-teal)" }}>
                                {notif.category}
                              </span>
                              <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                                {notif.timestamp}
                              </span>
                            </div>

                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>
                              {notif.title}
                            </div>

                            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.3 }}>
                              {notif.detail}
                            </div>

                            <Link
                              href={notif.href}
                              onClick={() => setIsNotificationsOpen(false)}
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--color-brand-teal)",
                                textDecoration: "none",
                                marginTop: 4,
                                alignSelf: "flex-start",
                              }}
                            >
                              {notif.actionText} &rarr;
                            </Link>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div
                      style={{
                        padding: "10px 18px",
                        backgroundColor: "var(--color-surface-subtle)",
                        textAlign: "center",
                      }}
                    >
                      <Link
                        href={userRole === "ADMIN" ? "/dashboard" : userRole === "TEACHER" ? "/portal/teacher" : userRole === "PARENT" ? "/portal/parent" : "/portal/student"}
                        onClick={() => setIsNotificationsOpen(false)}
                        style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)", textDecoration: "none" }}
                      >
                        {userRole === "ADMIN" ? "Open Dashboard Command Center" : "Open Workspace"}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 2. REAL USER PROFILE DROPDOWN CONTAINER ─────────────────── */}
              <div ref={profileRef} style={{ position: "relative" }}>
                {/* User Profile Pill Chip */}
                <div
                  onClick={() => {
                    setIsProfileOpen((prev) => !prev);
                    setIsNotificationsOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "4px 14px 4px 5px",
                    borderRadius: 9999,
                    backgroundColor: isProfileOpen ? "var(--color-brand-teal, #0E7D75)" : "var(--color-surface-subtle, #F4F7F5)",
                    border: "1px solid var(--color-border, #E8ECE9)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    className="avatar"
                    style={{
                      width: 30,
                      height: 30,
                      fontSize: 11,
                      backgroundColor: isProfileOpen ? "var(--color-accent-gold, #F7C844)" : "var(--color-ink, #182220)",
                      color: isProfileOpen ? "#182220" : "#FFFFFF",
                      fontWeight: 800,
                    }}
                  >
                    {userInitials}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isProfileOpen ? "#FFFFFF" : "var(--color-ink)",
                      }}
                    >
                      {userFullName}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isProfileOpen ? "#FFFFFF" : "var(--color-text-secondary)"}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.18s ease",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Profile Floating Dropdown Menu */}
                {isProfileOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: 48,
                      right: 0,
                      width: 290,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 20,
                      boxShadow: "0 20px 48px rgba(18, 50, 38, 0.16)",
                      border: "1px solid var(--color-border, #E8ECE9)",
                      padding: "16px 18px",
                      zIndex: 9999,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {/* User Identity Header Card */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div
                        className="avatar"
                        style={{
                          width: 40,
                          height: 40,
                          fontSize: 14,
                          backgroundColor: "var(--color-ink, #182220)",
                          color: "#FFFFFF",
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {userInitials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1.2 }}>
                          {userFullName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                          {userEmail}
                        </div>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 6,
                            padding: "2px 8px",
                            borderRadius: 9999,
                            backgroundColor: "var(--color-success-bg)",
                            color: "var(--color-success-text)",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--color-success-text)" }} />
                          {userRoleBadge}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 600 }}>
                      {schoolName} · 2025/2026 Academic Session
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, backgroundColor: "var(--color-border)" }} />

                    {/* Section 1: User Account & Details */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                        ACCOUNT & PROFILE
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Link
                          href="/account"
                          onClick={() => setIsProfileOpen(false)}
                          style={{
                            padding: "7px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--color-ink)",
                            textDecoration: "none",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          My Profile & Details
                        </Link>
                        <Link
                          href="/account?tab=security"
                          onClick={() => setIsProfileOpen(false)}
                          style={{
                            padding: "7px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--color-ink)",
                            textDecoration: "none",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          Change Password
                        </Link>
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, backgroundColor: "var(--color-border)" }} />

                    {/* Section 2: Role Rigid Workspace Shortcuts */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                        {userRole === "ADMIN" ? "ADMINISTRATOR WORKSPACE" : `${userRole} PORTAL`}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {userRole === "ADMIN" && (
                          <>
                            <Link
                              href="/dashboard"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Executive Dashboard
                            </Link>
                            <Link
                              href="/reports"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Reports & Analytics
                            </Link>
                            <Link
                              href="/students"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Student Management
                            </Link>
                          </>
                        )}

                        {userRole === "TEACHER" && (
                          <>
                            <Link
                              href="/portal/teacher"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Teacher Workspace
                            </Link>
                            <Link
                              href="/attendance"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Class Attendance
                            </Link>
                            <Link
                              href="/grades"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Grades & Score Entry
                            </Link>
                            <Link
                              href="/timetable"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Class Routine & Timetable
                            </Link>
                          </>
                        )}

                        {userRole === "PARENT" && (
                          <>
                            <Link
                              href="/portal/parent"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Parent Portal Overview
                            </Link>
                            <Link
                              href="/fees"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              School Fee Invoices
                            </Link>
                            <Link
                              href="/results"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Child Terminal Report Cards
                            </Link>
                          </>
                        )}

                        {userRole === "STUDENT" && (
                          <>
                            <Link
                              href="/portal/student"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Student Portal Overview
                            </Link>
                            <Link
                              href="/timetable"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Class Routine & Timetable
                            </Link>
                            <Link
                              href="/results"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              My Academic Results
                            </Link>
                            <Link
                              href="/library"
                              onClick={() => setIsProfileOpen(false)}
                              style={{
                                padding: "7px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              Digital Library & Loans
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, backgroundColor: "var(--color-border)" }} />

                    {/* Section 2: System Settings */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                        SYSTEM SETTINGS
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Link
                          href="/mfa"
                          onClick={() => setIsProfileOpen(false)}
                          style={{
                            padding: "7px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--color-ink)",
                            textDecoration: "none",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          Security & Multi-Factor Auth (MFA)
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            window.print();
                          }}
                          style={{
                            padding: "7px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--color-ink)",
                            border: "none",
                            background: "transparent",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-subtle)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          Print Current View
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, backgroundColor: "var(--color-border)" }} />

                    {/* Sign Out Button */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--color-danger-text, #993C1D)",
                        backgroundColor: "var(--color-danger-bg, #FAECE7)",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
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
