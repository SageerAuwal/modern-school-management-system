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
    title: "Administrator Portal",
    description: "Manage school infrastructure, academic sessions, fee structures, and bursary clearances.",
    identifierLabel: "Admin or Bursar Email",
    identifierPlaceholder: "admin@school.local or bursar@school.local",
    ctaText: "Sign in as Administrator",
  },
  teacher: {
    label: "Teacher",
    title: "Teacher Portal",
    description: "Access classroom rosters, mark daily roll call, and submit student scores.",
    identifierLabel: "Teacher Email",
    identifierPlaceholder: "teacher@school.local",
    ctaText: "Sign in as Teacher",
  },
  parent: {
    label: "Parent",
    title: "Parent Portal",
    description: "Inspect terminal report cards, pay school fee invoices, and track attendance.",
    identifierLabel: "Parent Email or Phone",
    identifierPlaceholder: "parent@school.local",
    ctaText: "Sign in as Parent",
  },
  student: {
    label: "Student",
    title: "Student Portal",
    description: "Inspect terminal examination results, active book loans, and bus schedules.",
    identifierLabel: "Student Email or Admission No",
    identifierPlaceholder: "SMS/2025/001 or student@school.local",
    ctaText: "Sign in as Student",
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

      const returnedRole: string = (data.user?.role || "").toUpperCase();

      // Enforce strict role matching for each login tab
      if (selectedRole === "admin" && returnedRole !== "ADMIN") {
        await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
        setError("Access denied: This portal tab is restricted to Administrators only. Please select your role tab above.");
        return;
      }
      if (selectedRole === "teacher" && returnedRole !== "TEACHER" && returnedRole !== "STAFF") {
        await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
        setError("Access denied: This portal tab is restricted to Teachers only. Please select your role tab above.");
        return;
      }
      if (selectedRole === "parent" && returnedRole !== "PARENT") {
        await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
        setError("Access denied: This portal tab is restricted to Parents & Guardians only. Please select your role tab above.");
        return;
      }
      if (selectedRole === "student" && returnedRole !== "STUDENT") {
        await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
        setError("Access denied: This portal tab is restricted to Students only. Please select your role tab above.");
        return;
      }

      if (returnedRole === "TEACHER" || returnedRole === "STAFF") {
        router.push("/portal/teacher");
      } else if (returnedRole === "STUDENT") {
        router.push("/portal/student");
      } else if (returnedRole === "PARENT") {
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
                  padding: "8px 6px",
                  borderRadius: "calc(var(--radius-control) - 2px)",
                  border: "none",
                  backgroundColor: active ? "var(--color-surface)" : "transparent",
                  color: active ? "var(--color-ink)" : "var(--color-text-secondary)",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "center",
                }}
              >
                {ROLE_CONFIGS[role].label}
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

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">{currentConfig.identifierLabel}</label>
            <input
              type="text"
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={currentConfig.identifierPlaceholder}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="label" style={{ margin: 0 }}>Password</label>
            </div>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 8, height: 44, fontSize: 14, fontWeight: 700 }}
          >
            {loading ? "Verifying..." : currentConfig.ctaText}
          </button>
        </form>
      </div>

      {/* Right Column: High-End Institutional Branding Showcase Panel */}
      <div
        style={{
          flex: 1.2,
          backgroundColor: "#0A3B32",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 40,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 490, width: "100%", color: "rgba(255,255,255,0.9)" }}>
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
              padding: "6px 20px",
              borderRadius: 20,
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#FFFFFF",
              fontSize: 12.5,
              fontStyle: "italic",
              fontWeight: 600,
              marginBottom: 22,
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
              borderRadius: 14,
              padding: "16px 20px",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              backdropFilter: "blur(6px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F7C844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)", lineHeight: 1.45 }}>
                <strong style={{ color: "#fff", display: "inline" }}>Address: </strong>
                Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F7C844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)" }}>
                <strong style={{ color: "#fff" }}>Contact: </strong>
                08029839848
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F7C844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)" }}>
                <strong style={{ color: "#fff" }}>Email: </strong>
                brightfutureacademykashere@gmail.com
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
