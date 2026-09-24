"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type RoleType = "admin" | "teacher" | "parent" | "student";

interface RoleConfig {
  label: string;
  identifierLabel: string;
  identifierPlaceholder: string;
}

const ROLE_CONFIGS: Record<RoleType, RoleConfig> = {
  admin: {
    label: "Administrator",
    identifierLabel: "Admin or Bursar Email",
    identifierPlaceholder: "admin@school.local",
  },
  teacher: {
    label: "Teacher / Staff",
    identifierLabel: "Teacher, Nurse or Staff Email",
    identifierPlaceholder: "teacher@school.local or nurse@school.local",
  },
  parent: {
    label: "Parent",
    identifierLabel: "Parent Email or Phone",
    identifierPlaceholder: "parent@school.local",
  },
  student: {
    label: "Student",
    identifierLabel: "Student Email or Admission No",
    identifierPlaceholder: "SMS/2025/001 or student@school.local",
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
      if (selectedRole === "admin" && returnedRole !== "ADMIN" && returnedRole !== "BURSAR") {
        await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
        setError("Access denied: This portal tab is restricted to Administrators and Bursars only.");
        return;
      }
      if (
        selectedRole === "teacher" &&
        returnedRole !== "TEACHER" &&
        returnedRole !== "STAFF" &&
        returnedRole !== "NURSE" &&
        returnedRole !== "LIBRARIAN" &&
        returnedRole !== "TRANSPORT_COORDINATOR"
      ) {
        await fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
        setError("Access denied: This portal tab is restricted to Teachers and Staff. Please select your role tab above.");
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

      if (returnedRole === "NURSE") {
        router.push("/clinic");
      } else if (returnedRole === "LIBRARIAN") {
        router.push("/library");
      } else if (returnedRole === "TRANSPORT_COORDINATOR") {
        router.push("/transport");
      } else if (returnedRole === "TEACHER" || returnedRole === "STAFF") {
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
    <main style={{ minHeight: "100vh", display: "flex", backgroundColor: "var(--color-surface-subtle, #F8FAFC)" }}>
      {/* Left Column: Form with Clean Institutional Card */}
      <div
        style={{
          flex: 1.1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 32px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* Brand Header: Centered Prestigious Institutional Seal */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid var(--color-border, #E1E8F0)",
                boxShadow: "0 4px 16px rgba(11, 37, 69, 0.08), 0 0 0 3px rgba(11, 37, 69, 0.03)",
                overflow: "hidden",
                padding: 4,
                marginBottom: 12,
              }}
            >
              <img
                src="/school-logo.png"
                alt="Bright Future Academy"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--color-brand-navy, #0B2545)",
                lineHeight: 1.2,
                margin: "0 0 4px",
                letterSpacing: "-0.02em",
              }}
            >
              Bright Future Academy
            </h1>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--color-text-secondary, #5C6E82)",
                margin: 0,
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}
            >
              Guided By Principles, Driven By Purpose
            </p>
          </div>

          {/* Form Card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--color-border, #E1E8F0)",
              borderRadius: 16,
              padding: "28px 28px 32px",
              boxShadow: "0 4px 20px rgba(11, 37, 69, 0.04)",
            }}
          >
            {/* Role Selector Tabs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 4,
                padding: 4,
                backgroundColor: "#F1F5F9",
                borderRadius: 10,
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
                      borderRadius: 8,
                      border: "none",
                      backgroundColor: active ? "var(--color-brand-navy, #0B2545)" : "transparent",
                      color: active ? "#FFFFFF" : "var(--color-text-secondary)",
                      fontSize: 12.5,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                    }}
                  >
                    {ROLE_CONFIGS[role].label}
                  </button>
                );
              })}
            </div>

            {/* Error Alert */}
            {error && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "10px 14px",
                  borderRadius: 10,
                  backgroundColor: "var(--color-danger-bg, #FAECE7)",
                  color: "var(--color-danger-text, #993C1D)",
                  fontSize: 13,
                  lineHeight: 1.4,
                  border: "1px solid rgba(153, 60, 29, 0.2)",
                }}
              >
                {error}
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label className="label" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", marginBottom: 6, display: "block" }}>
                  {currentConfig.identifierLabel}
                </label>
                <input
                  type="text"
                  className="input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={currentConfig.identifierPlaceholder}
                  autoComplete="username"
                  required
                  style={{
                    height: 42,
                    fontSize: 13.5,
                    borderRadius: 10,
                    border: "1px solid var(--color-border, #E1E8F0)",
                    backgroundColor: "#FFFFFF",
                  }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", marginBottom: 6, display: "block" }}>
                  Password
                </label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  style={{
                    height: 42,
                    fontSize: 13.5,
                    borderRadius: 10,
                    border: "1px solid var(--color-border, #E1E8F0)",
                    backgroundColor: "#FFFFFF",
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  marginTop: 6,
                  height: 44,
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 10,
                  backgroundColor: "var(--color-brand-navy, #0B2545)",
                  color: "#FFFFFF",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Verifying Credentials..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Column: Institutional Showcase in Deep Royal Navy */}
      <div
        style={{
          flex: 1.1,
          backgroundColor: "#0B2545",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "48px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 460, width: "100%", color: "rgba(255,255,255,0.92)", zIndex: 1 }}>
          {/* Official Crest Badge */}
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 3px rgba(229, 152, 40, 0.4)",
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

          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.04em", margin: "0 0 6px" }}>
            BRIGHT FUTURE ACADEMY
          </h2>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#E59828",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            ESTABLISHED 2025 - KASHERE
          </div>

          <div
            style={{
              display: "inline-block",
              padding: "6px 22px",
              borderRadius: 20,
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(229, 152, 40, 0.3)",
              color: "#FFFFFF",
              fontSize: 12.5,
              fontStyle: "italic",
              fontWeight: 600,
              marginBottom: 24,
              letterSpacing: "0.02em",
            }}
          >
            &ldquo;Guided By Principles, Driven By Purpose&rdquo;
          </div>

          {/* Institutional Contact & Location Card */}
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 14,
              padding: "16px 20px",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#E59828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)", lineHeight: 1.45 }}>
                <strong style={{ color: "#fff", display: "inline" }}>Address: </strong>
                Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#E59828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)" }}>
                <strong style={{ color: "#fff" }}>Contact: </strong>
                08029839848
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#E59828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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
