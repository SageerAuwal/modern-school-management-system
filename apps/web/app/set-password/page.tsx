"use client";

import { useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/v1/auth/set-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, confirmPassword: confirm, inviteToken: token }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card" style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div className="pill-success" style={{ display: "inline-block", marginBottom: 12, padding: "6px 16px" }}>
          Password set!
        </div>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          Redirecting you to login…
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 400, width: "100%" }}>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Set your password
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Create a strong password to activate your account
        </p>
      </div>

      {error && (
        <div
          className="pill-danger"
          style={{
            display: "block",
            marginBottom: 16,
            borderRadius: "var(--radius-control)",
            padding: "10px 14px",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            New Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{ width: "100%", padding: "10px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Confirm Password
          </label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            style={{ width: "100%", padding: "10px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            placeholder="Re-enter your password"
          />
        </div>

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
          }}
        >
          {loading ? "Setting password…" : "Set Password & Activate Account"}
        </button>
      </form>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-page)", padding: "24px" }}>
      <Suspense fallback={<div>Loading…</div>}>
        <SetPasswordForm />
      </Suspense>
    </main>
  );
}
