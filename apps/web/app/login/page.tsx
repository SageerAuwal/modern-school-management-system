"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Incorrect email or password."); return; }
      if (data.mfaRequired) { router.push(`/mfa?token=${data.preAuthToken}`); return; }
      router.push("/dashboard");
    } catch {
      setError("Cannot reach the server. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", backgroundColor: "var(--color-page)" }}>
      {/* Left: branding */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 40px",
          maxWidth: 480,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: "var(--color-ink)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700,
            }}
          >
            S
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-ink)" }}>
            School Management System
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--color-ink)",
            lineHeight: 1.25,
            marginBottom: 8,
          }}
        >
          Manage your school<br />in one place
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 36 }}>
          Students, attendance, grades, fees, library, and transport.
          All tracked. All in sync.
        </p>

        {/* Error */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 340 }}>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@school.local"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 8, padding: "11px 0", width: "100%" }}>
            {loading ? "Signing in..." : "Sign in to your portal"}
          </button>
        </form>
      </div>

      {/* Right: decorative panel */}
      <div
        style={{
          flex: 1,
          backgroundColor: "var(--color-ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.7)", padding: 40 }}>
          <p style={{ fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 12 }}>
            Everything<br />your school needs
          </p>
          <p style={{ fontSize: 14, maxWidth: 300, margin: "0 auto", lineHeight: 1.6 }}>
            Attendance. Grades. Fees. Library. Transport.
            One system for your entire school.
          </p>
        </div>
      </div>
    </main>
  );
}
