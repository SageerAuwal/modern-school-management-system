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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1.5" />
      <rect width="7" height="5" x="14" y="3" rx="1.5" />
      <rect width="7" height="9" x="14" y="12" rx="1.5" />
      <rect width="7" height="5" x="3" y="16" rx="1.5" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="5" rx="0.5" />
      <rect x="12" y="7" width="3" height="10" rx="0.5" />
      <rect x="17" y="4" width="3" height="13" rx="0.5" />
      <path d="m6 10 5-4 5 3 4-4" />
    </svg>
  ),
  students: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  ),
  parents: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a3 3 0 0 0-2.4-2.9" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  staff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="2.5" />
      <path d="M5.5 17a3.5 3.5 0 0 1 7 0" />
      <line x1="14.5" y1="9" x2="18.5" y2="9" />
      <line x1="14.5" y1="12" x2="18.5" y2="12" />
      <line x1="14.5" y1="15" x2="17.5" y2="15" />
    </svg>
  ),
  classes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h20" />
      <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
      <path d="m7 21 5-5 5 5" />
      <line x1="7" y1="8" x2="13" y2="8" />
      <line x1="7" y1="11.5" x2="11" y2="11.5" />
    </svg>
  ),
  timetable: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <circle cx="16" cy="16" r="5" />
      <path d="M16 14v2l1.5 1" />
    </svg>
  ),
  attendance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  grades: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
      <path d="M12 9v10" />
    </svg>
  ),
  exams: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" x2="14" y1="2" y2="2" />
      <circle cx="12" cy="14" r="8" />
      <path d="M12 10v4l2.5 1.5" />
    </svg>
  ),
  results: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="m15.4 12.5 1.6 7.5-5-3-5 3 1.6-7.5" />
    </svg>
  ),
  fees: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  ),
  library: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  transport: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6v6" />
      <path d="M15 6v6" />
      <path d="M2 12h19.6" />
      <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
      <circle cx="7" cy="18" r="2" />
      <path d="M9 18h5" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  ),
  portals: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  clinic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 7v10" />
      <path d="M7 12h10" />
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
  account: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
      {
        href: "/reports",
        icon: icons.reports,
        label: "Reports & Analytics",
        category: "Overview",
        keywords: "reports analytics records statistics performance finance attendance enrollment",
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
        href: "/fees/bursar",
        icon: icons.account,
        label: "Bursar Cashier Desk",
        category: "Operations & Finance",
        keywords: "bursar cashier desk receipt cash drawer reconciliation debtors statement payment counter",
      },
      {
        href: "/fees",
        icon: icons.fees,
        label: "Fees & Invoices",
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
      {
        href: "/clinic",
        icon: icons.clinic,
        label: "School Clinic",
        category: "Operations & Finance",
        keywords: "clinic sick bay health triage nurse medical doctor dispensary triage emergency vitals",
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

const NURSE_CATEGORIES: NavCategory[] = [
  {
    id: "clinical_services",
    title: "Clinical Services",
    items: [
      {
        href: "/clinic",
        icon: icons.clinic,
        label: "School Clinic",
        category: "Clinical Services",
        keywords: "clinic sick bay triage nurse dispensary inventory vitals cots emergency",
      },
      {
        href: "/students",
        icon: icons.students,
        label: "Student Health Records",
        category: "Clinical Services",
        keywords: "students genotype blood group allergies emergency contact",
      },
    ],
  },
];

const BURSAR_CATEGORIES: NavCategory[] = [
  {
    id: "finance",
    title: "Bursary & Payments",
    items: [
      {
        href: "/fees/bursar",
        icon: icons.account,
        label: "Cashier Counter & Desk",
        category: "Bursary & Payments",
        keywords: "bursar cashier desk receipt cash drawer reconciliation debtors statement payment counter",
      },
      {
        href: "/fees",
        icon: icons.fees,
        label: "Fees & Invoices",
        category: "Bursary & Payments",
        keywords: "fees tuition invoice billing pos payment receipts bursary",
      },
      {
        href: "/reports",
        icon: icons.reports,
        label: "Financial Analytics",
        category: "Bursary & Payments",
        keywords: "reports revenue debtors collection analytics",
      },
    ],
  },
  {
    id: "students_roster",
    title: "Student Registry",
    items: [
      {
        href: "/students",
        icon: icons.students,
        label: "Student Accounts",
        category: "Student Registry",
        keywords: "students billing clearance debtors",
      },
      {
        href: "/parents",
        icon: icons.parents,
        label: "Guardians & Payers",
        category: "Student Registry",
        keywords: "parents billing invoices contacts",
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
    if (r === "BURSAR") return BURSAR_CATEGORIES;
    if (r === "NURSE") return NURSE_CATEGORIES;
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
            gap: 11,
            height: 38,
            padding: isCollapsed ? "0" : "0 12px",
            width: isCollapsed ? 38 : "100%",
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
                lineHeight: 1.2,
                fontSize: 13,
                letterSpacing: "-0.01em",
              }}
              title={item.label}
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
          width: isCollapsed ? 76 : 246,
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "calc(100vh - 32px)",
          padding: "16px 8px 14px",
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
              r === "BURSAR"
                ? "/fees"
                : r === "NURSE"
                ? "/clinic"
                : r === "TEACHER"
                ? "/portal/teacher"
                : r === "PARENT"
                ? "/portal/parent"
                : r === "STUDENT"
                ? "/portal/student"
                : "/dashboard";
            router.push(home);
          }}
          title="Bright Future Academy - Kashere"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {/* Bright Future Academy Official Logo Crest */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
                border: "1px solid var(--color-border, #E8ECE9)",
                overflow: "hidden",
                padding: 1,
              }}
            >
              <img
                src="/school-logo.png"
                alt="Bright Future Academy Crest"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>

            {!isCollapsed && (
              <div style={{ overflow: "hidden", minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "var(--color-brand-navy, #0B2545)",
                    lineHeight: 1.2,
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    letterSpacing: "-0.01em",
                  }}
                  title="Bright Future Academy"
                >
                  Bright Future Academy
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--color-text-secondary, #5C6E82)",
                    margin: "3px 0 0",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title="Guided By Principles, Driven By Purpose"
                >
                  Guided By Principles, Driven By Purpose
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
          {/* Account & Profile Settings Icon (Available for all roles) */}
          <Link
            href="/account"
            title="My Account & Settings"
            style={{ textDecoration: "none" }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ top: rect.top + rect.height / 2 - 18, left: rect.right + 10 });
              setHoveredTooltip({ label: "My Account & Settings", category: "Account" });
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
                color: pathname.startsWith("/account") ? "var(--color-brand-teal, #0E7D75)" : "var(--color-text-secondary, #70817B)",
                backgroundColor: pathname.startsWith("/account") ? "rgba(14, 125, 117, 0.1)" : "transparent",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
                e.currentTarget.style.color = "var(--color-ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = pathname.startsWith("/account") ? "rgba(14, 125, 117, 0.1)" : "transparent";
                e.currentTarget.style.color = pathname.startsWith("/account") ? "var(--color-brand-teal, #0E7D75)" : "var(--color-text-secondary)";
              }}
            >
              {icons.account}
            </div>
          </Link>

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
