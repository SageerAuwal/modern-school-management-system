"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/* ── SVG Icons (inline, zero emojis/dingbats, crisp modern strokes) ────────── */
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
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  parents: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M3 20a5 5 0 0 1 10 0" />
      <circle cx="17" cy="11" r="2.2" />
      <path d="M14 20a3.5 3.5 0 0 1 7 0" />
    </svg>
  ),
  staff: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2.5" />
      <path d="M6 17a3 3 0 0 1 6 0" />
      <line x1="15" y1="9" x2="18" y2="9" />
      <line x1="15" y1="13" x2="18" y2="13" />
    </svg>
  ),
  classes: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="7" y1="10" x2="13" y2="10" />
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
    </svg>
  ),
  attendance: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  grades: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  ),
  exams: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M10 2h4" />
      <path d="m19 5-1.5 1.5" />
    </svg>
  ),
  results: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="m15.4 12.5 1.6 7.5-5-3-5 3 1.6-7.5" />
    </svg>
  ),
  fees: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="17" cy="15" r="1.5" />
    </svg>
  ),
  library: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7v6" />
      <path d="M13 7v6" />
    </svg>
  ),
  transport: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16h16M4 16a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2M4 16l-1 3h1m16-3l1 3h-1" />
      <circle cx="7.5" cy="16" r="1.5" />
      <circle cx="16.5" cy="16" r="1.5" />
      <line x1="2" y1="9" x2="22" y2="9" />
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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

export interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  category: string;
  keywords?: string;
}

export interface NavCategory {
  id: string;
  title: string;
  items: NavItem[];
}

/* ── Categorized Navigation Definitions ───────────────────────────────────── */
const ADMIN_CATEGORIES: NavCategory[] = [
  {
    id: "overview",
    title: "Overview",
    items: [
      {
        href: "/dashboard",
        icon: icons.dashboard,
        label: "Dashboard",
        category: "Overview",
        keywords: "home overview stats command center live radar summary",
      },
    ],
  },
  {
    id: "people",
    title: "People & Community",
    items: [
      {
        href: "/students",
        icon: icons.students,
        label: "Students",
        category: "People & Community",
        keywords: "pupils enrollment admission directory monitor profiles",
      },
      {
        href: "/parents",
        icon: icons.parents,
        label: "Parents",
        category: "People & Community",
        keywords: "guardians family portal accounts directory monitor wards",
      },
      {
        href: "/staff",
        icon: icons.staff,
        label: "Staff",
        category: "People & Community",
        keywords: "teachers employees payroll admin accounts monitor educators",
      },
    ],
  },
  {
    id: "academics",
    title: "Academics",
    items: [
      {
        href: "/classes",
        icon: icons.classes,
        label: "Classes",
        category: "Academics",
        keywords: "classrooms sections levels streams form teachers",
      },
      {
        href: "/timetable",
        icon: icons.timetable,
        label: "Timetable",
        category: "Academics",
        keywords: "schedule routine period auto classes planner master routine booklet",
      },
      {
        href: "/attendance",
        icon: icons.attendance,
        label: "Attendance",
        category: "Academics",
        keywords: "roll mark daily register present absent excused late",
      },
      {
        href: "/grades",
        icon: icons.grades,
        label: "Grades",
        category: "Academics",
        keywords: "scores marks assessments ca1 ca2 exam terminal",
      },
      {
        href: "/exams",
        icon: icons.exams,
        label: "Exams",
        category: "Academics",
        keywords: "schedules terms timetable halls exam seats invigilation",
      },
      {
        href: "/results",
        icon: icons.results,
        label: "Results",
        category: "Academics",
        keywords: "report cards transcripts terminal merit honors positions",
      },
    ],
  },
  {
    id: "operations",
    title: "Operations & Finance",
    items: [
      {
        href: "/fees",
        icon: icons.fees,
        label: "Fees",
        category: "Operations & Finance",
        keywords: "invoices tuition payment pos billing receipts naira accounting",
      },
      {
        href: "/library",
        icon: icons.library,
        label: "Library",
        category: "Operations & Finance",
        keywords: "books loans catalog borrowed overdue catalogue",
      },
      {
        href: "/transport",
        icon: icons.transport,
        label: "Transport",
        category: "Operations & Finance",
        keywords: "buses routes fleet logistics drivers school bus",
      },
    ],
  },
];

const TEACHER_CATEGORIES: NavCategory[] = [
  {
    id: "workspace",
    title: "Workspace",
    items: [
      {
        href: "/portal/teacher",
        icon: icons.dashboard,
        label: "Workspace",
        category: "Workspace",
        keywords: "teacher home dashboard classes assigned",
      },
    ],
  },
  {
    id: "teaching",
    title: "Classroom & Teaching",
    items: [
      {
        href: "/attendance",
        icon: icons.attendance,
        label: "Daily Attendance",
        category: "Classroom & Teaching",
        keywords: "roll call daily mark register present absent",
      },
      {
        href: "/grades",
        icon: icons.grades,
        label: "Score Sheets",
        category: "Classroom & Teaching",
        keywords: "grades ca1 ca2 exam scores continuous assessment",
      },
      {
        href: "/timetable",
        icon: icons.timetable,
        label: "Timetable",
        category: "Classroom & Teaching",
        keywords: "schedule routine teaching classes periods",
      },
    ],
  },
  {
    id: "assessments",
    title: "Assessments & Reports",
    items: [
      {
        href: "/exams",
        icon: icons.exams,
        label: "Exam Schedule",
        category: "Assessments & Reports",
        keywords: "schedules timetable halls invigilation",
      },
      {
        href: "/results",
        icon: icons.results,
        label: "Report Cards",
        category: "Assessments & Reports",
        keywords: "results student report cards terminal review",
      },
    ],
  },
];

const PARENT_CATEGORIES: NavCategory[] = [
  {
    id: "family",
    title: "Family",
    items: [
      {
        href: "/portal/parent",
        icon: icons.dashboard,
        label: "Family Overview",
        category: "Family",
        keywords: "parent home wards children attendance",
      },
    ],
  },
  {
    id: "academics_billing",
    title: "Academics & Billing",
    items: [
      {
        href: "/results",
        icon: icons.results,
        label: "Report Cards",
        category: "Academics & Billing",
        keywords: "child report cards results terminal performance",
      },
      {
        href: "/timetable",
        icon: icons.timetable,
        label: "Timetable",
        category: "Academics & Billing",
        keywords: "routine schedule daily periods class",
      },
      {
        href: "/fees",
        icon: icons.fees,
        label: "Fees & Receipts",
        category: "Academics & Billing",
        keywords: "invoices payment balance receipts tuition",
      },
      {
        href: "/library",
        icon: icons.library,
        label: "Library",
        category: "Academics & Billing",
        keywords: "books loans catalog borrowed",
      },
    ],
  },
];

const STUDENT_CATEGORIES: NavCategory[] = [
  {
    id: "desk",
    title: "My Desk",
    items: [
      {
        href: "/portal/student",
        icon: icons.dashboard,
        label: "My Profile",
        category: "My Desk",
        keywords: "student home overview attendance",
      },
    ],
  },
  {
    id: "studies_resources",
    title: "Studies & Resources",
    items: [
      {
        href: "/results",
        icon: icons.results,
        label: "My Results",
        category: "Studies & Resources",
        keywords: "terminal report card exam scores rank",
      },
      {
        href: "/timetable",
        icon: icons.timetable,
        label: "Class Timetable",
        category: "Studies & Resources",
        keywords: "routine schedule daily periods subjects",
      },
      {
        href: "/fees",
        icon: icons.fees,
        label: "Fees & Billing",
        category: "Studies & Resources",
        keywords: "invoices tuition payment receipts naira",
      },
      {
        href: "/library",
        icon: icons.library,
        label: "Library",
        category: "Studies & Resources",
        keywords: "books borrowed due return buy",
      },
    ],
  },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Sidebar({ role = "ADMIN" }: { role?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  // Collapsed state (default to false, with sleek icon-rail / expanded drawer toggle)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string; category?: string } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  // Optional category accordion collapse state (all open by default)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

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

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    router.push("/login");
  };

  // Select navigation categories tailored to user role
  const activeCategories = useMemo(() => {
    const r = (role || "ADMIN").toUpperCase();
    if (r === "TEACHER") return TEACHER_CATEGORIES;
    if (r === "PARENT") return PARENT_CATEGORIES;
    if (r === "STUDENT") return STUDENT_CATEGORIES;
    return ADMIN_CATEGORIES;
  }, [role]);

  const renderRailItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" &&
        item.href !== "/portal/teacher" &&
        item.href !== "/portal/parent" &&
        item.href !== "/portal/student" &&
        pathname.startsWith(item.href + "/"));

    return (
      <Link
        key={item.href}
        href={item.href}
        style={{ textDecoration: "none", display: "block" }}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipPos({ top: rect.top + rect.height / 2 - 18, left: rect.right + 10 });
          setHoveredTooltip({ label: item.label, category: item.category });
        }}
        onMouseLeave={() => setHoveredTooltip(null)}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: 12,
            height: 40,
            padding: isCollapsed ? "0" : "0 14px",
            width: isCollapsed ? 40 : "100%",
            margin: "1px auto",
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
        {/* Top Brand Mark */}
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
          onClick={() => {
            const r = (role || "ADMIN").toUpperCase();
            const home =
              r === "TEACHER"
                ? "/portal/teacher"
                : r === "PARENT"
                ? "/portal/parent"
                : r === "STUDENT"
                ? "/portal/student"
                : "/dashboard";
            router.push(home);
          }}
          title="Modern School Management System"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Deep Teal Squircle Brand Mark */}
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

        {/* Floating Capsule Rail holding Categorized Nav Items */}
        <div
          style={{
            flex: 1,
            width: "100%",
            backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
            borderRadius: isCollapsed ? 28 : 20,
            padding: isCollapsed ? "8px 4px" : "8px 6px",
            border: "1px solid var(--color-border, #E8ECE9)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
            gap: 2,
          }}
        >
          {activeCategories.map((category, catIndex) => {
            const isCategoryCollapsed = !isCollapsed && !!collapsedCategories[category.id];

            return (
              <div key={category.id} style={{ display: "flex", flexDirection: "column" }}>
                {/* Category Divider in Rail Mode */}
                {isCollapsed && catIndex > 0 && (
                  <div
                    style={{
                      width: 22,
                      height: 1,
                      backgroundColor: "var(--color-border, #E8ECE9)",
                      margin: "8px auto 6px auto",
                    }}
                  />
                )}

                {/* Category Header in Expanded Mode */}
                {!isCollapsed && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 12px 6px 14px",
                      marginTop: catIndex > 0 ? 10 : 2,
                      marginBottom: 2,
                      cursor: "pointer",
                      borderRadius: 8,
                      userSelect: "none",
                      transition: "background-color 0.15s",
                    }}
                    onClick={() => toggleCategory(category.id)}
                    title={`Click to toggle ${category.title}`}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "var(--color-text-secondary, #70817B)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {category.title}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "var(--color-text-secondary, #70817B)",
                          backgroundColor: "rgba(0, 0, 0, 0.05)",
                          padding: "1px 6px",
                          borderRadius: 9999,
                        }}
                      >
                        {category.items.length}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          color: "var(--color-text-secondary, #70817B)",
                          transform: isCategoryCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                          transition: "transform 0.18s ease",
                        }}
                      >
                        {icons.chevronDown}
                      </span>
                    </div>
                  </div>
                )}

                {/* Category Items */}
                {(!isCategoryCollapsed || isCollapsed) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {category.items.map(renderRailItem)}
                  </div>
                )}
              </div>
            );
          })}
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
          {/* Settings / Portals Icon (Only visible for Admins) */}
          {(role || "ADMIN").toUpperCase() === "ADMIN" && (
            <Link
              href="/portal/teacher"
              title="Role Portals"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPos({ top: rect.top + rect.height / 2 - 18, left: rect.right + 10 });
                setHoveredTooltip({ label: "Role Portals", category: "System" });
              }}
              onMouseLeave={() => setHoveredTooltip(null)}
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
          )}

          {/* Expand / Collapse Icon */}
          <div
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand menu" : "Collapse rail"}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ top: rect.top + rect.height / 2 - 18, left: rect.right + 10 });
              setHoveredTooltip({
                label: isCollapsed ? "Expand menu" : "Collapse rail",
                category: "Navigation",
              });
            }}
            onMouseLeave={() => setHoveredTooltip(null)}
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
          >
            {isCollapsed ? icons.toggleExpand : icons.toggleCollapse}
          </div>

          {/* Logout Icon */}
          <div
            onClick={handleLogout}
            title="Sign out"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ top: rect.top + rect.height / 2 - 18, left: rect.right + 10 });
              setHoveredTooltip({ label: "Sign out", category: "Account" });
            }}
            onMouseLeave={() => setHoveredTooltip(null)}
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
          >
            {icons.logout}
          </div>
        </div>
      </nav>

      {/* Floating Hover Tooltip for Rail Mode */}
      {isCollapsed && hoveredTooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.left,
            top: tooltipPos.top,
            backgroundColor: "var(--color-ink, #182220)",
            color: "#FFFFFF",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.22)",
            zIndex: 99999,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {hoveredTooltip.category && (
            <span
              style={{
                fontSize: 9,
                color: "var(--color-accent-gold, #F7C844)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 800,
              }}
            >
              {hoveredTooltip.category}
            </span>
          )}
          <span>{hoveredTooltip.label}</span>
        </div>
      )}
    </>
  );
}
