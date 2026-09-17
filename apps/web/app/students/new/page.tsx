"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
      const res = await fetch(`${API}/api/v1/students`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Could not add student. Check required fields."); return; }
      router.push("/students");
    } catch { setError("Cannot reach the server."); }
    finally { setLoading(false); }
  }

  const Field = ({ label, k, type = "text", required, opts }: { label: string; k: string; type?: string; required?: boolean; opts?: string[] }) => (
    <div>
      <label className="label">{label}{required && " *"}</label>
      {opts ? (
        <select
          value={form[k as keyof typeof form]}
          onChange={(e) => set(k, e.target.value)}
          className="input"
        >
          <option value="">Select</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[k as keyof typeof form]}
          onChange={(e) => set(k, e.target.value)}
          className="input"
          required={required}
        />
      )}
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 680, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <Link href="/students" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            ← Back to students
          </Link>
          <h1 className="page-title" style={{ marginTop: 8 }}>Add a student</h1>
          <p className="page-subtitle">Enter the student&apos;s details to create their record.</p>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 16, padding: "10px 14px",
          borderRadius: "var(--radius-control)",
          backgroundColor: "var(--color-danger-bg)",
          color: "var(--color-danger-text)",
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 16 }}>
          <p className="stat-label" style={{ marginBottom: -4 }}>Personal Info</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="First Name" k="firstName" required />
            <Field label="Last Name" k="lastName" required />
          </div>
          <Field label="Other Names" k="otherNames" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Date of Birth" k="dateOfBirth" type="date" />
            <Field label="Gender" k="gender" opts={["MALE", "FEMALE", "OTHER"]} />
          </div>
          <Field label="Blood Group" k="bloodGroup" opts={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} />
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 16 }}>
          <p className="stat-label" style={{ marginBottom: -4 }}>Enrollment Info</p>
          <Field label="Admission Number" k="admissionNumber" />
          <Field label="Religion" k="religion" />
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
          <p className="stat-label" style={{ marginBottom: -4 }}>Address &amp; Origin</p>
          <Field label="Home Address" k="address" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="State of Origin" k="stateOfOrigin" />
            <Field label="LGA" k="lga" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => router.back()} className="btn btn-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.firstName || !form.lastName || loading}
            className="btn btn-primary"
            style={{ flex: 2 }}
          >
            {loading ? "Saving..." : "Save student record"}
          </button>
        </div>
      </form>
    </div>
  );
}
