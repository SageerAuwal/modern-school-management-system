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
  timetable: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
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
  { href: "/timetable", icon: icons.timetable, label: "Timetable", keywords: "schedule routine period auto classes planner" },
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

  // Collapsed state (default to false, but with sleek icon-rail / expanded drawer toggle)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

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

  const renderRailItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

    return (
      <Link
        key={item.href}
        href={item.href}
        style={{ textDecoration: "none", display: "block" }}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipPos({ top: rect.top + rect.height / 2 - 13, left: rect.right + 10 });
          setHoveredLabel(item.label);
        }}
        onMouseLeave={() => setHoveredLabel(null)}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: 12,
            height: 42,
            padding: isCollapsed ? "0" : "0 14px",
            width: isCollapsed ? 42 : "100%",
            margin: "2px auto",
            borderRadius: isCollapsed ? "50%" : 9999,
            backgroundColor: isActive ? "var(--color-accent-gold, #F7C844)" : "transparent",
            color: isActive ? "var(--color-ink, #182220)" : "var(--color-text-secondary, #70817B)",
            boxShadow: isActive ? "0 2px 10px rgba(247, 200, 68, 0.35)" : "none",
            fontWeight: isActive ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
              e.currentTarget.style.color = "var(--color-ink, #182220)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--color-text-secondary, #70817B)";
            }
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: isActive ? "var(--color-ink, #182220)" : "currentColor",
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
          width: isCollapsed ? 76 : 230,
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "calc(100vh - 32px)",
          padding: "16px 10px 14px",
          transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 90,
          boxSizing: "border-box",
          borderRight: "1px solid var(--color-border, #E8ECE9)",
        }}
      >
        {/* Top Brand Mark matching screenshot */}
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            padding: isCollapsed ? "0" : "0 6px",
            marginBottom: 16,
            cursor: "pointer",
          }}
          onClick={() => router.push("/dashboard")}
          title="Modern School Management System"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Deep Teal Squircle Brand Mark from Reference */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: "var(--color-brand-teal, #0E7D75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 14px rgba(14, 125, 117, 0.25)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                {/* 4-pointed star emblem matching reference logo */}
                <path
                  d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
                  fill="#FFFFFF"
                />
                <circle cx="19" cy="5" r="2" fill="#F7C844" />
              </svg>
            </div>

            {!isCollapsed && (
              <div style={{ overflow: "hidden" }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--color-ink, #182220)",
                    lineHeight: 1.1,
                    margin: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  Modern School
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-secondary, #70817B)",
                    margin: "2px 0 0",
                    fontWeight: 600,
                  }}
                >
                  School System
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse();
              }}
              title="Collapse to icon rail"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              {icons.toggleCollapse}
            </button>
          )}
        </div>

        {/* Floating Capsule Rail holding Nav Items */}
        <div
          style={{
            flex: 1,
            width: "100%",
            backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
            borderRadius: isCollapsed ? 28 : 20,
            padding: isCollapsed ? "8px 4px" : "8px",
            border: "1px solid var(--color-border, #E8ECE9)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
            gap: 2,
          }}
        >
          {filteredMainNav.map(renderRailItem)}
        </div>

        {/* Bottom Utility Floating Capsule (Settings / Help / Sign Out) */}
        <div
          style={{
            width: "100%",
            marginTop: 12,
            backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
            borderRadius: isCollapsed ? 28 : 16,
            padding: isCollapsed ? "6px 4px" : "6px 8px",
            border: "1px solid var(--color-border, #E8ECE9)",
            display: "flex",
            flexDirection: isCollapsed ? "column" : "row",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            gap: 4,
          }}
        >
          {/* Settings / Portals Icon */}
          <Link
            href="/portal/teacher"
            title="Role Portals"
            style={{ textDecoration: "none" }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ top: rect.top + rect.height / 2 - 13, left: rect.right + 10 });
              setHoveredLabel("Role Portals");
            }}
            onMouseLeave={() => setHoveredLabel(null)}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-secondary, #70817B)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
                e.currentTarget.style.color = "var(--color-ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }}
            >
              {icons.portals}
            </div>
          </Link>

          {/* Expand / Collapse Icon */}
          <div
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand menu" : "Collapse rail"}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary, #70817B)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
              e.currentTarget.style.color = "var(--color-ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            {isCollapsed ? icons.toggleExpand : icons.toggleCollapse}
          </div>

          {/* Logout Icon */}
          <div
            onClick={handleLogout}
            title="Sign out"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary, #70817B)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-danger-bg)";
              e.currentTarget.style.color = "var(--color-danger-text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            {icons.logout}
          </div>
        </div>
      </nav>

      {/* Floating Hover Tooltip for Rail Mode */}
      {isCollapsed && hoveredLabel && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.left,
            top: tooltipPos.top,
            backgroundColor: "var(--color-ink, #182220)",
            color: "#FFFFFF",
            padding: "5px 10px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.18)",
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
