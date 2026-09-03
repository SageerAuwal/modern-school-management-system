"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", otherNames: "",
    dateOfBirth: "", gender: "", admissionNumber: "",
    address: "", stateOfOrigin: "", lga: "", religion: "",
    bloodGroup: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "")
      );
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/v1/students`,
        { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Failed to create student"); return; }
      router.push(`/students/${data.id}`);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  const Field = ({ label, k, type = "text", opts }: { label: string; k: string; type?: string; opts?: string[] }) => (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {opts ? (
        <select value={form[k as keyof typeof form]} onChange={(e) => set(k, e.target.value)}
          style={{ width: "100%", padding: "9px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, backgroundColor: "var(--color-surface)", color: "var(--color-ink)", outline: "none" }}>
          <option value="">Select…</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[k as keyof typeof form]} onChange={(e) => set(k, e.target.value)}
          style={{ width: "100%", padding: "9px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, backgroundColor: "var(--color-surface)", color: "var(--color-ink)", outline: "none", boxSizing: "border-box" }} />
      )}
    </div>
  );

  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Add New Student</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Fill in the student&apos;s details below</p>
        </div>

        {error && (
          <div className="pill-danger" style={{ display: "block", marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-control)", fontSize: 13 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: -4 }}>Personal Info</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="First Name *" k="firstName" />
              <Field label="Last Name *" k="lastName" />
            </div>
            <Field label="Other Names" k="otherNames" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Date of Birth" k="dateOfBirth" type="date" />
              <Field label="Gender" k="gender" opts={["MALE", "FEMALE", "OTHER"]} />
            </div>
            <Field label="Blood Group" k="bloodGroup" opts={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} />
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: -4 }}>Enrollment Info</p>
            <Field label="Admission Number" k="admissionNumber" />
            <Field label="Religion" k="religion" />
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: -4 }}>Address & Origin</p>
            <Field label="Home Address" k="address" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="State of Origin" k="stateOfOrigin" />
              <Field label="LGA" k="lga" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={() => router.back()}
              style={{ flex: 1, padding: "10px 0", border: "var(--border-width) solid var(--color-border)", backgroundColor: "transparent", borderRadius: "var(--radius-control)", fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={!form.firstName || !form.lastName || loading}
              style={{ flex: 2, padding: "10px 0", backgroundColor: (!form.firstName || !form.lastName || loading) ? "#6b7280" : "var(--color-ink)", color: "#fff", border: "none", borderRadius: "var(--radius-control)", fontSize: 14, fontWeight: 500, cursor: (!form.firstName || !form.lastName || loading) ? "not-allowed" : "pointer" }}>
              {loading ? "Saving…" : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
