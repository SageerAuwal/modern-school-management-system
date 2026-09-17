"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/* ── SVG Icons (inline, no external dependencies) ──────────────────────────── */
const icons = {
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  dashboard: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  students: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  classes: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  staff: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  attendance: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  grades: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  fees: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  library: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  transport: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M5 17a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2M5 17l-1 3h1m14-3l1 3h-1" />
      <circle cx="7.5" cy="17" r="1" />
      <circle cx="16.5" cy="17" r="1" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  results: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  exams: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  portals: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  chevronDown: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  toggleCollapse: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  toggleExpand: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  keywords?: string;
}

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", icon: icons.dashboard, label: "Dashboard", keywords: "home overview stats" },
  { href: "/students", icon: icons.students, label: "Students", keywords: "pupils enrollment admission" },
  { href: "/classes", icon: icons.classes, label: "Classes", keywords: "classrooms sections levels" },
  { href: "/staff", icon: icons.staff, label: "Staff", keywords: "teachers employees admin" },
  { href: "/attendance", icon: icons.attendance, label: "Attendance", keywords: "roll mark daily" },
  { href: "/grades", icon: icons.grades, label: "Grades", keywords: "scores marks assessments" },
  { href: "/results", icon: icons.results, label: "Results", keywords: "report cards transcripts" },
  { href: "/exams", icon: icons.exams, label: "Exams", keywords: "schedules terms timetable" },
  { href: "/fees", icon: icons.fees, label: "Fees", keywords: "invoices tuition payment pos billing" },
  { href: "/library", icon: icons.library, label: "Library", keywords: "books loans catalog" },
  { href: "/transport", icon: icons.transport, label: "Transport", keywords: "buses routes fleet" },
];

const PORTAL_LINKS: NavItem[] = [
  { href: "/portal/teacher", icon: icons.staff, label: "Teacher Portal", keywords: "teacher educator" },
  { href: "/portal/student", icon: icons.students, label: "Student Portal", keywords: "student learner" },
  { href: "/portal/parent", icon: icons.staff, label: "Parent Portal", keywords: "guardian family" },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Collapsed state (synchronized with localStorage)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPortalsOpen, setIsPortalsOpen] = useState(true);

  // Tooltip tracking in collapsed mode
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sms-sidebar-collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sms-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    router.push("/login");
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredMainNav = useMemo(() => {
    if (!q) return MAIN_NAV;
    return MAIN_NAV.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.toLowerCase().includes(q))
    );
  }, [q]);

  const filteredPortals = useMemo(() => {
    if (!q) return PORTAL_LINKS;
    return PORTAL_LINKS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.toLowerCase().includes(q))
    );
  }, [q]);

  const renderItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

    return (
      <Link
        key={item.href}
        href={item.href}
        style={{ textDecoration: "none", display: "block" }}
        onMouseEnter={(e) => {
          if (isCollapsed) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPos({ top: rect.top + rect.height / 2 - 14 });
            setHoveredLabel(item.label);
          }
        }}
        onMouseLeave={() => {
          if (isCollapsed) setHoveredLabel(null);
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: 12,
            height: 38,
            padding: isCollapsed ? "0" : "0 14px",
            width: isCollapsed ? 38 : "100%",
            margin: isCollapsed ? "0 auto" : "0",
            borderRadius: isCollapsed ? "50%" : 9999, // Pill capsule shape matching menu pattern
            backgroundColor: isActive ? "var(--color-ink, #10141A)" : "transparent",
            color: isActive ? "#FFFFFF" : "var(--color-text-secondary, #5F5E5A)",
            fontWeight: isActive ? 600 : 500,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.16s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "var(--color-page, #F7F6F3)";
              e.currentTarget.style.color = "var(--color-ink, #10141A)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--color-text-secondary, #5F5E5A)";
            }
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: isActive ? "#FFFFFF" : "currentColor",
            }}
          >
            {item.icon}
          </div>

          {!isCollapsed && (
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1,
              }}
            >
              {item.label}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      <nav
        style={{
          width: isCollapsed ? 68 : 240,
          minHeight: "100vh",
          height: "100vh",
          backgroundColor: "var(--color-surface, #FFFFFF)",
          borderRight: "var(--border-width, 1px) solid var(--color-border, #E4E4E4)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 90,
          boxSizing: "border-box",
        }}
      >
        {/* Header (Aligned perfectly to 56px matching AppShell topbar) */}
        <div
          style={{
            height: 56,
            padding: isCollapsed ? "0 10px" : "0 14px",
            borderBottom: "var(--border-width, 1px) solid var(--color-border, #E4E4E4)",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              minWidth: 0,
            }}
            onClick={() => router.push("/dashboard")}
          >
            {/* School Crest / Identity Badge */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "var(--color-ink, #10141A)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
                letterSpacing: "0.02em",
              }}
            >
              S
            </div>

            {/* School Name & System (Restored) */}
            {!isCollapsed && (
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--color-ink, #10141A)",
                    lineHeight: 1.2,
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Modern School
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-secondary, #5F5E5A)",
                    margin: 0,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  School System
                </p>
              </div>
            )}
          </div>

          {/* Collapse Toggle Button */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              title="Collapse sidebar"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary, #5F5E5A)",
                width: 28,
                height: 28,
                borderRadius: "var(--radius-control, 6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-page, #F7F6F3)";
                e.currentTarget.style.color = "var(--color-ink, #10141A)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--color-text-secondary, #5F5E5A)";
              }}
            >
              {icons.toggleCollapse}
            </button>
          )}
        </div>

        {/* Search Bar matching the menu pill pattern */}
        <div style={{ padding: isCollapsed ? "12px 10px 8px" : "12px 12px 8px", flexShrink: 0 }}>
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapse}
              title="Expand and search"
              style={{
                width: 38,
                height: 38,
                margin: "0 auto",
                borderRadius: "50%",
                border: "1px solid var(--color-border, #E4E4E4)",
                backgroundColor: "var(--color-page, #F7F6F3)",
                color: "var(--color-text-secondary, #5F5E5A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-surface, #FFFFFF)";
                e.currentTarget.style.borderColor = "var(--color-ink, #10141A)";
                e.currentTarget.style.color = "var(--color-ink, #10141A)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-page, #F7F6F3)";
                e.currentTarget.style.borderColor = "var(--color-border, #E4E4E4)";
                e.currentTarget.style.color = "var(--color-text-secondary, #5F5E5A)";
              }}
            >
              {icons.search}
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 9999, // Pill search shape
                backgroundColor: "var(--color-page, #F7F6F3)",
                border: "1px solid var(--color-border, #E4E4E4)",
              }}
            >
              <span style={{ color: "var(--color-text-secondary, #5F5E5A)", display: "flex", alignItems: "center" }}>
                {icons.search}
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: 13,
                  color: "var(--color-ink, #10141A)",
                  width: "100%",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Navigation List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: isCollapsed ? "4px 8px" : "4px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Main Navigation Items */}
          {filteredMainNav.map(renderItem)}

          {/* Portals Accordion */}
          {filteredPortals.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {!isCollapsed ? (
                <>
                  <div
                    onClick={() => setIsPortalsOpen(!isPortalsOpen)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary, #5F5E5A)",
                      borderRadius: 9999,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--color-page, #F7F6F3)";
                      e.currentTarget.style.color = "var(--color-ink, #10141A)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--color-text-secondary, #5F5E5A)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {icons.portals}
                      <span>Role Portals</span>
                    </div>
                    <div
                      style={{
                        transform: isPortalsOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.18s ease",
                      }}
                    >
                      {icons.chevronDown}
                    </div>
                  </div>

                  {isPortalsOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 12, marginTop: 2 }}>
                      {filteredPortals.map(renderItem)}
                    </div>
                  )}
                </>
              ) : (
                filteredPortals.map(renderItem)
              )}
            </div>
          )}
        </div>

        {/* Collapsed Expand Button at Bottom */}
        {isCollapsed && (
          <div style={{ padding: "6px 0", display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={toggleCollapse}
              title="Expand sidebar"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary, #5F5E5A)",
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-page, #F7F6F3)";
                e.currentTarget.style.color = "var(--color-ink, #10141A)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--color-text-secondary, #5F5E5A)";
              }}
            >
              {icons.toggleExpand}
            </button>
          </div>
        )}

        {/* Footer User Profile & Sign Out */}
        <div
          style={{
            padding: isCollapsed ? "12px 0" : "12px 14px",
            borderTop: "var(--border-width, 1px) solid var(--color-border, #E4E4E4)",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            flexShrink: 0,
          }}
        >
          {isCollapsed ? (
            <div
              onClick={handleLogout}
              title="System Admin (Click to Sign out)"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                backgroundColor: "var(--color-ink, #10141A)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              SA
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "var(--color-ink, #10141A)",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  SA
                </div>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-ink, #10141A)",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    System Admin
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary, #5F5E5A)",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    admin@school.local
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--color-text-secondary, #5F5E5A)",
                  padding: 6,
                  borderRadius: "var(--radius-control, 6px)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-danger-bg, #FAECE7)";
                  e.currentTarget.style.color = "var(--color-danger-text, #993C1D)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--color-text-secondary, #5F5E5A)";
                }}
              >
                {icons.logout}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Floating Hover Tooltip for Collapsed State */}
      {isCollapsed && hoveredLabel && (
        <div
          style={{
            position: "fixed",
            left: 78,
            top: tooltipPos.top,
            backgroundColor: "var(--color-ink, #10141A)",
            color: "#FFFFFF",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 99999,
            pointerEvents: "none",
          }}
        >
          {hoveredLabel}
        </div>
      )}
    </>
  );
}
