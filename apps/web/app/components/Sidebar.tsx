"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard",   icon: "⊞", label: "Dashboard"  },
  { href: "/students",    icon: "🎓", label: "Students"   },
  { href: "/attendance",  icon: "✅", label: "Attendance" },
  { href: "/grades",      icon: "📝", label: "Grades"     },
  { href: "/fees",        icon: "💰", label: "Fees"       },
  { href: "/library",     icon: "📚", label: "Library"    },
  { href: "/transport",   icon: "🚌", label: "Transport"  },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
    router.push("/login");
  };

  return (
    <nav style={{
      width: 220,
      minHeight: "100vh",
      backgroundColor: "var(--color-surface)",
      borderRight: "var(--border-width) solid var(--color-border)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      {/* Logo / school name */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "var(--border-width) solid var(--color-border)" }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink)", margin: 0, lineHeight: 1.2 }}>School</p>
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>Management System</p>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                backgroundColor: active ? "var(--color-ink)" : "transparent",
                color: active ? "#fff" : "var(--color-ink)",
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: "background-color 0.15s",
              }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <div style={{ padding: "12px 10px", borderTop: "var(--border-width) solid var(--color-border)" }}>
        <button onClick={handleLogout} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px", borderRadius: 8, border: "none",
          backgroundColor: "transparent", cursor: "pointer",
          fontSize: 13, color: "var(--color-text-secondary)",
        }}>
          <span>⎋</span> Logout
        </button>
      </div>
    </nav>
  );
}
