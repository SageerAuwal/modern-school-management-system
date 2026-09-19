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
    label: "Administrator / Bursar",
    title: "Administration & Bursary Portal",
    description: "Manage school infrastructure, academic sessions, fee payments, and bursary clearances.",
    identifierLabel: "Admin or Bursar Email",
    identifierPlaceholder: "admin@school.local or bursar@school.local",
    ctaText: "Sign in to Admin / Bursary Workspace",
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--color-border)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              overflow: "hidden",
              padding: 2,
              flexShrink: 0,
            }}
          >
            <img
              src="/school-logo.png"
              alt="Bright Future Academy"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1.2, margin: 0 }}>
              Bright Future Academy
            </p>
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0, fontWeight: 500 }}>
              Guided By Principles, Driven By Purpose
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
          backgroundColor: "#0F261E",
          backgroundImage: "radial-gradient(circle at 50% 25%, rgba(14, 125, 117, 0.4) 0%, rgba(15, 38, 30, 0.98) 80%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 40,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420, color: "rgba(255,255,255,0.9)" }}>
          {/* Official High-Res School Crest */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45), 0 0 0 4px rgba(255, 255, 255, 0.2)",
              padding: 6,
              overflow: "hidden",
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

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#ffffff", letterSpacing: "0.03em", margin: "0 0 4px" }}>
            BRIGHT FUTURE ACADEMY
          </h2>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#F7C844",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            ESTABLISHED 2025 - KASHERE
          </div>

          <div
            style={{
              display: "inline-block",
              padding: "5px 16px",
              borderRadius: 20,
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#FFFFFF",
              fontSize: 12,
              fontStyle: "italic",
              fontWeight: 600,
              marginBottom: 20,
              letterSpacing: "0.02em",
            }}
          >
            &ldquo;Guided By Principles, Driven By Purpose&rdquo;
          </div>

          {/* Institutional Contact & Location Card */}
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 12,
              padding: "14px 18px",
              textAlign: "left",
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              backdropFilter: "blur(6px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F7C844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", lineHeight: 1.4 }}>
                <strong style={{ color: "#fff", display: "block" }}>Address:</strong>
                Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F7C844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                <strong style={{ color: "#fff" }}>Contact: </strong>
                08029839848
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F7C844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                <strong style={{ color: "#fff" }}>Email: </strong>
                brightfutureacademykashere@gmail.com
              </div>
            </div>
          </div>

          <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}>
              Offline Ready
            </span>
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}>
              WAEC Grading
            </span>
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}>
              Terminal Reports
            </span>
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}>
              Bursary Clearance
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
