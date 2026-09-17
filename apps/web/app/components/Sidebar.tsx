"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/* ── SVG Icons (inline, no external dependency) ────────────────────────────── */
const icons = {
  logo: (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <path
        d="M6 19C6 11.8203 11.8203 6 19 6C19 13.1797 13.1797 19 6 19Z"
        fill="#3B82F6"
      />
      <path
        d="M26 13C26 20.1797 20.1797 26 13 26C13 18.8203 18.8203 13 26 13Z"
        fill="#2563EB"
      />
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  students: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  classes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  staff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  attendance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  grades: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  fees: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  library: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  transport: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M5 17a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2M5 17l-1 3h1m14-3l1 3h-1" />
      <circle cx="7.5" cy="17" r="1" />
      <circle cx="16.5" cy="17" r="1" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  results: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  exams: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  portals: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  resources: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  toggleLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  toggleRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  { href: "/fees", icon: icons.fees, label: "Fees", keywords: "invoices tuition payment pos billing" },
  { href: "/results", icon: icons.results, label: "Results", keywords: "report cards transcripts" },
  { href: "/exams", icon: icons.exams, label: "Exams", keywords: "schedules terms timetable" },
  { href: "/library", icon: icons.library, label: "Library", keywords: "books loans catalog" },
  { href: "/transport", icon: icons.transport, label: "Transport", keywords: "buses routes fleet" },
];

const PORTAL_LINKS: NavItem[] = [
  { href: "/portal/teacher", icon: icons.staff, label: "Teacher Portal", keywords: "teacher educator" },
  { href: "/portal/student", icon: icons.students, label: "Student Portal", keywords: "student learner" },
  { href: "/portal/parent", icon: icons.staff, label: "Parent Portal", keywords: "guardian family" },
];

const RESOURCE_LINKS: NavItem[] = [
  { href: "/fees/structures", icon: icons.fees, label: "Fee Structures", keywords: "tuition rates levy" },
  { href: "/transport/routes", icon: icons.transport, label: "Bus Routes", keywords: "stops driver pickup" },
  { href: "/library/loans", icon: icons.library, label: "Book Loans", keywords: "borrowed overdue" },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Accordion open/close state for submenus in expanded mode
  const [isPortalsOpen, setIsPortalsOpen] = useState(true);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);

  // Active tooltip for collapsed icon hover
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0 });

  // Initialize collapse preference from localStorage
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

  // Filtered links when user searches
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

  const filteredResources = useMemo(() => {
    if (!q) return RESOURCE_LINKS;
    return RESOURCE_LINKS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.toLowerCase().includes(q))
    );
  }, [q]);

  const renderItem = (item: NavItem) => {
    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

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
            height: 42,
            padding: isCollapsed ? "0" : "0 16px",
            width: isCollapsed ? 42 : "100%",
            margin: isCollapsed ? "0 auto" : "0",
            borderRadius: isCollapsed ? "50%" : 9999, // Pill shape like in Eden screenshot
            backgroundColor: isActive ? "#3B82F6" : "transparent",
            color: isActive ? "#FFFFFF" : "var(--color-text-secondary, #5F5E5A)",
            fontWeight: isActive ? 600 : 500,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isActive ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none",
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.04)";
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
      <aside
        style={{
          width: isCollapsed ? 72 : 248,
          height: "calc(100vh - 24px)",
          margin: "12px 0 12px 14px",
          backgroundColor: "var(--color-surface, #FFFFFF)",
          borderRadius: 24, // Eden-style rounded floating island
          boxShadow: "0 6px 24px rgba(16, 20, 26, 0.05), 0 1px 3px rgba(16, 20, 26, 0.03)",
          border: "var(--border-width, 1px) solid var(--color-border, #E4E4E4)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "sticky",
          top: 12,
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 100,
          boxSizing: "border-box",
          overflow: "visible",
        }}
      >
        {/* Top Header: Brand Logo & Eden Title */}
        <div
          style={{
            padding: isCollapsed ? "20px 0 14px" : "20px 16px 14px",
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
            }}
            onClick={() => router.push("/dashboard")}
          >
            {/* Logo Glyph */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {icons.logo}
            </div>

            {/* Brand Title (Eden SMS) */}
            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "var(--color-ink, #10141A)",
                    lineHeight: 1.1,
                  }}
                >
                  Eden <span style={{ color: "#3B82F6", fontWeight: 700, fontSize: 13 }}>SMS</span>
                </span>
              </div>
            )}
          </div>

          {/* Toggle Button */}
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
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
                e.currentTarget.style.color = "var(--color-ink, #10141A)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--color-text-secondary, #5F5E5A)";
              }}
            >
              {icons.toggleLeft}
            </button>
          )}
        </div>

        {/* Search Control */}
        <div style={{ padding: isCollapsed ? "0 10px 14px" : "0 14px 14px", flexShrink: 0 }}>
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapse}
              title="Expand & Search"
              style={{
                width: 42,
                height: 42,
                margin: "0 auto",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "var(--color-neutral-bg, #F1F5F9)",
                color: "var(--color-text-secondary, #5F5E5A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#E2E8F0";
                e.currentTarget.style.color = "var(--color-ink, #10141A)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-neutral-bg, #F1F5F9)";
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
                padding: "8px 14px",
                borderRadius: 9999, // Pill search bar like Eden
                backgroundColor: "var(--color-neutral-bg, #F8FAFC)",
                border: "1px solid var(--color-border, #E2E8F0)",
              }}
            >
              <span style={{ color: "var(--color-text-secondary, #64748B)", display: "flex", alignItems: "center" }}>
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

        {/* Scrollable Navigation Area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: isCollapsed ? "4px 8px" : "4px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* Main Navigation Items */}
          {filteredMainNav.map(renderItem)}

          {/* Accordion 1: Portals ⌄ */}
          {filteredPortals.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {!isCollapsed ? (
                <>
                  <div
                    onClick={() => setIsPortalsOpen(!isPortalsOpen)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary, #5F5E5A)",
                      borderRadius: 9999,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {icons.portals}
                      <span>Portals</span>
                    </div>
                    <div
                      style={{
                        transform: isPortalsOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      {icons.chevronDown}
                    </div>
                  </div>

                  {isPortalsOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 16, marginTop: 3 }}>
                      {filteredPortals.map(renderItem)}
                    </div>
                  )}
                </>
              ) : (
                filteredPortals.map(renderItem)
              )}
            </div>
          )}

          {/* Accordion 2: Resources ⌄ */}
          {filteredResources.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {!isCollapsed ? (
                <>
                  <div
                    onClick={() => setIsResourcesOpen(!isResourcesOpen)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-secondary, #5F5E5A)",
                      borderRadius: 9999,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {icons.resources}
                      <span>Resources</span>
                    </div>
                    <div
                      style={{
                        transform: isResourcesOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      {icons.chevronDown}
                    </div>
                  </div>

                  {isResourcesOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 16, marginTop: 3 }}>
                      {filteredResources.map(renderItem)}
                    </div>
                  )}
                </>
              ) : (
                filteredResources.map(renderItem)
              )}
            </div>
          )}
        </div>

        {/* Collapsed Expand Trigger at Bottom */}
        {isCollapsed && (
          <div style={{ padding: "8px 0", display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={toggleCollapse}
              title="Expand sidebar"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary, #5F5E5A)",
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {icons.toggleRight}
            </button>
          </div>
        )}

        {/* User Profile Footer */}
        <div
          style={{
            padding: isCollapsed ? "12px 0 16px" : "12px 14px 16px",
            borderTop: "1px solid var(--color-border, #E4E4E4)",
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
                width: 38,
                height: 38,
                borderRadius: "50%",
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              }}
            >
              SA
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    backgroundColor: "#2563EB",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  SA
                </div>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
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
                    Administrator
                  </div>
                </div>
              </div>

              {/* Sign out button */}
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--color-text-secondary, #5F5E5A)",
                  padding: 6,
                  borderRadius: 8,
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
      </aside>

      {/* Floating Hover Tooltip for Collapsed State */}
      {isCollapsed && hoveredLabel && (
        <div
          style={{
            position: "fixed",
            left: 92,
            top: tooltipPos.top,
            backgroundColor: "#1F2937",
            color: "#FFFFFF",
            padding: "5px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 99999,
            pointerEvents: "none",
            animation: "fadeIn 0.12s ease-out",
          }}
        >
          {hoveredLabel}
        </div>
      )}
    </>
  );
}
