"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/v1/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Required for httpOnly cookies
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Invalid email or password");
        return;
      }

      if (data.mfaRequired) {
        router.push(`/mfa?token=${data.preAuthToken}`);
        return;
      }

      // Redirect based on role
      const role: string = data.user?.role ?? "";
      if (role === "ADMIN") router.push("/dashboard/admin");
      else if (role === "TEACHER") router.push("/dashboard/teacher");
      else if (role === "PARENT") router.push("/dashboard/parent");
      else router.push("/dashboard");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-page)",
        padding: "24px",
      }}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 400 }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "var(--color-ink)",
              marginBottom: 4,
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Sign in to your school portal
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="pill-danger"
            style={{
              marginBottom: 16,
              display: "block",
              textAlign: "center",
              borderRadius: "var(--radius-control)",
              padding: "10px 14px",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "var(--border-width) solid var(--color-border)",
                borderRadius: "var(--radius-control)",
                fontSize: 14,
                color: "var(--color-ink)",
                backgroundColor: "var(--color-surface)",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="you@school.edu"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "var(--border-width) solid var(--color-border)",
                borderRadius: "var(--radius-control)",
                fontSize: 14,
                color: "var(--color-ink)",
                backgroundColor: "var(--color-surface)",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="••••••••"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: "11px 0",
              backgroundColor: loading ? "#6b7280" : "var(--color-ink)",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--radius-control)",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              width: "100%",
              transition: "background-color 0.15s",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
