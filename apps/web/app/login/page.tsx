"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type RoleType = "admin" | "teacher" | "parent" | "student";

interface RoleConfig {
  label: string;
  title: string;
  description: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  ctaText: string;
}

const ROLE_CONFIGS: Record<RoleType, RoleConfig> = {
  admin: {
    label: "Administrator",
    title: "School Administration",
    description: "Manage school infrastructure, staff, academic sessions, and finance.",
    identifierLabel: "Admin Email",
    identifierPlaceholder: "admin@school.local",
    ctaText: "Sign in to Admin Dashboard",
  },
  teacher: {
    label: "Teacher / Staff",
    title: "Teacher & Staff Portal",
    description: "Access classroom rosters, mark daily roll call, and submit student scores.",
    identifierLabel: "Staff Email",
    identifierPlaceholder: "teacher@school.local",
    ctaText: "Sign in to Teacher Workspace",
  },
  parent: {
    label: "Parent / Guardian",
    title: "Parent & Guardian Portal",
    description: "Inspect terminal report cards, pay school fee invoices, and track attendance.",
    identifierLabel: "Parent Email or Phone",
    identifierPlaceholder: "parent@school.local",
    ctaText: "Sign in to Parent Portal",
  },
  student: {
    label: "Student",
    title: "Student Portal",
    description: "Inspect terminal examination results, active book loans, and bus schedules.",
    identifierLabel: "Student Email or Admission No",
    identifierPlaceholder: "SMS/2025/001 or student@school.local",
    ctaText: "Sign in to Student Portal",
  },
};

const ADMISSION_MAP: Record<string, string> = {
  "sms/2025/001": "student.amina@school.local",
  "sms/2025/002": "student.zainab@school.local",
  "sms/2025/003": "student.david@school.local",
  "sms/2025/004": "student.yusuf@school.local",
  "sms/2025/005": "student.khadija@school.local",
};

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleType>("admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentConfig = ROLE_CONFIGS[selectedRole];

  function handleRoleChange(role: RoleType) {
    setSelectedRole(role);
    setError("");
    setIdentifier("");
    setPassword("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // If admission number was entered in student tab, map to student email
    let resolvedEmail = identifier.trim();
    const cleanLower = resolvedEmail.toLowerCase();
    if (ADMISSION_MAP[cleanLower]) {
      resolvedEmail = ADMISSION_MAP[cleanLower];
    }

    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: resolvedEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Incorrect credentials. Please verify your details.");
        return;
      }

      if (data.mfaRequired) {
        router.push(`/mfa?token=${data.preAuthToken}`);
        return;
      }

      const role: string = (data.user?.role || selectedRole || "").toUpperCase();
      if (role === "TEACHER" || role === "STAFF") {
        router.push("/portal/teacher");
      } else if (role === "STUDENT") {
        router.push("/portal/student");
      } else if (role === "PARENT") {
        router.push("/portal/parent");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Cannot reach the server. Please verify the API is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", backgroundColor: "var(--color-page)" }}>
      {/* Left Column: Form with Role Tabs */}
      <div
        style={{
          flex: 1.1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "40px 48px",
          maxWidth: 540,
        }}
      >
        {/* Brand identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "var(--color-ink)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            S
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink)", lineHeight: 1.2, margin: 0 }}>
              My School
            </p>
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>
              Integrated Management System
            </p>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 4,
            padding: 4,
            backgroundColor: "var(--color-border)",
            borderRadius: "var(--radius-control)",
            marginBottom: 24,
          }}
        >
          {(["admin", "teacher", "parent", "student"] as RoleType[]).map((role) => {
            const active = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleChange(role)}
                style={{
                  padding: "8px 4px",
                  borderRadius: "calc(var(--radius-control) - 2px)",
                  border: "none",
                  backgroundColor: active ? "var(--color-surface)" : "transparent",
                  color: active ? "var(--color-ink)" : "var(--color-text-secondary)",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "center",
                }}
              >
                {ROLE_CONFIGS[role].label.split(" ")[0]}
              </button>
            );
          })}
        </div>

        {/* Dynamic Role Headline */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--color-ink)",
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            {currentConfig.title}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
            {currentConfig.description}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: "var(--radius-control)",
              backgroundColor: "var(--color-danger-bg)",
              color: "var(--color-danger-text)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="identifier" className="label">
              {currentConfig.identifierLabel}
            </label>
            <input
              id="identifier"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="input"
              placeholder={currentConfig.identifierPlaceholder}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ marginTop: 6, padding: "11px 0", width: "100%" }}
          >
            {loading ? "Authenticating..." : currentConfig.ctaText}
          </button>
        </form>
      </div>

      {/* Right Column: Decorative Brand Showcase */}
      <div
        style={{
          flex: 1,
          backgroundColor: "var(--color-ink)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 40,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360, color: "rgba(255,255,255,0.85)" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.12)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            S
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: "#ffffff", lineHeight: 1.25, marginBottom: 12 }}>
            One Portal for Your Whole School
          </h2>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.65)" }}>
            Attendance registers, report card generation, continuous assessments, school fee invoicing, library loans, and transport fleet tracking.
          </p>
          <div style={{ marginTop: 24, display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}>
              Offline Ready
            </span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}>
              WAEC Grading
            </span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}>
              Terminal Reports
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
