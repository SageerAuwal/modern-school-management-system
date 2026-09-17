"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/* ── SVG Icons (inline, no dependency) ──────────────────────────────────────── */
const icons = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  students: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  classes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  attendance: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  grades: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  results: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  exams: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  fees: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  library: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  transport: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M5 17a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2M5 17l-1 3h1m14-3l1 3h-1"/><circle cx="7.5" cy="17" r="0"/><circle cx="16.5" cy="17" r="0"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  staff: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  teacherPortal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  studentPortal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  parentPortal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const MAIN_NAV = [
  { href: "/dashboard",  icon: icons.dashboard,  label: "Dashboard"  },
  { href: "/students",   icon: icons.students,   label: "Students"   },
  { href: "/classes",    icon: icons.classes,    label: "Classes"    },
  { href: "/staff",      icon: icons.staff,      label: "Staff"      },
  { href: "/attendance", icon: icons.attendance, label: "Attendance" },
  { href: "/grades",     icon: icons.grades,     label: "Grades"     },
  { href: "/results",    icon: icons.results,    label: "Results"    },
  { href: "/exams",      icon: icons.exams,      label: "Exams"      },
  { href: "/fees",       icon: icons.fees,       label: "Fees"       },
  { href: "/library",    icon: icons.library,    label: "Library"    },
  { href: "/transport",  icon: icons.transport,  label: "Transport"  },
];

const PORTAL_NAV = [
  { href: "/portal/teacher", icon: icons.teacherPortal, label: "Teacher Portal" },
  { href: "/portal/student", icon: icons.studentPortal, label: "Student Portal" },
  { href: "/portal/parent",  icon: icons.parentPortal,  label: "Parent Portal"  },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try { await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" }); } catch {}
    router.push("/login");
  };

  const renderLink = (item: { href: string; icon: React.ReactNode; label: string }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link key={item.href} href={item.href}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 8,
            cursor: "pointer",
            backgroundColor: active ? "var(--color-ink)" : "transparent",
            color: active ? "#fff" : "var(--color-text-secondary)",
            fontSize: 13,
            fontWeight: active ? 500 : 400,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = "var(--color-page)";
              e.currentTarget.style.color = "var(--color-ink)";
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }
          }}
        >
          {item.icon}
          {item.label}
        </div>
      </Link>
    );
  };

  return (
    <nav
      style={{
        width: "var(--sidebar-width)",
        minHeight: "100vh",
        backgroundColor: "var(--color-surface)",
        borderRight: "var(--border-width) solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* School identity */}
      <div style={{ padding: "20px 18px 16px", borderBottom: "var(--border-width) solid var(--color-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: "var(--color-ink)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>S</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)", lineHeight: 1.2, margin: 0 }}>
              My School
            </p>
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>
              School System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ padding: "6px 12px 2px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)" }}>
          Management
        </div>
        {MAIN_NAV.map(renderLink)}

        <div style={{ padding: "14px 12px 2px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)" }}>
          Role Portals
        </div>
        {PORTAL_NAV.map(renderLink)}
      </div>

      {/* Logout */}
      <div style={{ padding: "10px 8px", borderTop: "var(--border-width) solid var(--color-border)" }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--color-text-secondary)",
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
          Sign out
        </button>
      </div>
    </nav>
  );
}
