"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhotoCaptureInput from "../../components/PhotoCaptureInput";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    otherNames: "",
    dateOfBirth: "",
    gender: "FEMALE",
    classSectionId: "",
    admissionNumber: "",
    address: "",
    stateOfOrigin: "",
    lga: "",
    religion: "",
    bloodGroup: "",
    photoUrl: "",
    guardianName: "",
    guardianRelationship: "Mother",
    guardianPhone: "",
    guardianPhotoUrl: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Load available classes for immediate assignment
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch(`${API}/api/v1/classes`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setClasses(data);
            if (data.length > 0) {
              setForm((f) => ({ ...f, classSectionId: data[0].id }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load classes", err);
      } finally {
        setLoadingClasses(false);
      }
    }
    loadClasses();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    if (!form.gender) {
      setError("Please select the student's gender.");
      return;
    }

    setLoading(true);
    try {
      const body = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "")
      );

      const res = await fetch(`${API}/api/v1/students`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Could not add student. Check required fields.");
        return;
      }
      router.push("/students");
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setLoading(false);
    }
  }

  const Field = ({
    label,
    k,
    type = "text",
    required,
    opts,
    placeholder,
  }: {
    label: string;
    k: string;
    type?: string;
    required?: boolean;
    opts?: string[];
    placeholder?: string;
  }) => (
    <div>
      <label className="label">
        {label}
        {required && " *"}
      </label>
      {opts ? (
        <select
          value={form[k as keyof typeof form]}
          onChange={(e) => set(k, e.target.value)}
          className="input"
          required={required}
        >
          <option value="">Select</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={form[k as keyof typeof form]}
          onChange={(e) => set(k, e.target.value)}
          className="input"
          required={required}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 680, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <Link
            href="/students"
            style={{ fontSize: 13, color: "var(--color-text-secondary)" }}
          >
            ← Back to students
          </Link>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Add a student
          </h1>
          <p className="page-subtitle">
            Enter the student&apos;s details to create their official record and assign their class.
          </p>
        </div>
      </div>

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

      <form onSubmit={handleSubmit}>
        {/* Personal Info Card */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            marginBottom: 16,
          }}
        >
          <p className="stat-label" style={{ marginBottom: -4 }}>
            Personal Info
          </p>

          {/* Photo Upload / Camera Capture */}
          <PhotoCaptureInput
            photoUrl={form.photoUrl || null}
            onChange={(url) => set("photoUrl", url || "")}
            label="Student Passport Photo (Camera or Upload)"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="First Name" k="firstName" required placeholder="e.g. Amina" />
            <Field label="Last Name" k="lastName" required placeholder="e.g. Sageer" />
          </div>

          <Field label="Other Names" k="otherNames" placeholder="e.g. Fatima" />

          {/* Prominent Gender Selector with visual buttons */}
          <div>
            <label className="label" style={{ marginBottom: 6, display: "block" }}>
              Gender *
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { id: "FEMALE", label: "Female" },
                { id: "MALE", label: "Male" },
                { id: "OTHER", label: "Other" },
              ].map((g) => {
                const isSelected = form.gender === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => set("gender", g.id)}
                    style={{
                      flex: 1,
                      padding: "8px 14px",
                      borderRadius: "var(--radius-control)",
                      border: isSelected
                        ? "2px solid var(--color-ink)"
                        : "1px solid var(--color-border)",
                      backgroundColor: isSelected
                        ? "var(--color-ink)"
                        : "var(--color-surface)",
                      color: isSelected ? "#ffffff" : "var(--color-ink)",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Date of Birth" k="dateOfBirth" type="date" />
            <Field
              label="Blood Group"
              k="bloodGroup"
              opts={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
            />
          </div>
        </div>

        {/* Enrollment Info Card with Class Assignment */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            marginBottom: 16,
          }}
        >
          <p className="stat-label" style={{ marginBottom: -4 }}>
            Enrollment &amp; Classroom Assignment
          </p>

          {/* Assigned Class Dropdown */}
          <div>
            <label className="label" htmlFor="classSectionId">
              Assigned Class *
            </label>
            {loadingClasses ? (
              <div className="skeleton" style={{ height: 38 }} />
            ) : classes.length === 0 ? (
              <div>
                <p style={{ fontSize: 12, color: "var(--color-danger-text)" }}>
                  No classes created yet. Please create a class under &quot;Classes&quot; first, or assign later.
                </p>
              </div>
            ) : (
              <select
                id="classSectionId"
                value={form.classSectionId}
                onChange={(e) => set("classSectionId", e.target.value)}
                className="input"
                required
                style={{ fontWeight: 600 }}
              >
                <option value="">Select a classroom to assign</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.level})
                  </option>
                ))}
              </select>
            )}
          </div>

          <Field
            label="Admission Number"
            k="admissionNumber"
            placeholder="e.g. SMS/2026/001 (auto-generated if empty)"
          />
          <Field label="Religion" k="religion" placeholder="e.g. Islam, Christianity" />
        </div>

        {/* Address & Origin Card */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            marginBottom: 16,
          }}
        >
          <p className="stat-label" style={{ marginBottom: -4 }}>
            Address &amp; Origin
          </p>
          <Field label="Home Address" k="address" placeholder="Residential address" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="State of Origin" k="stateOfOrigin" placeholder="e.g. Kano" />
            <Field label="LGA" k="lga" placeholder="e.g. Municipal" />
          </div>
        </div>

        {/* Parent / Guardian Card */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            marginBottom: 24,
          }}
        >
          <p className="stat-label" style={{ marginBottom: -4 }}>
            Parent / Guardian Details &amp; Photo
          </p>

          {/* Parent Photo Upload / Live Camera */}
          <PhotoCaptureInput
            photoUrl={form.guardianPhotoUrl || null}
            onChange={(url) => set("guardianPhotoUrl", url || "")}
            label="Parent / Guardian Photo (Camera or Upload)"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
            <Field label="Parent / Guardian Name" k="guardianName" placeholder="e.g. Alhaji Ibrahim Auwal" />
            <Field
              label="Relationship"
              k="guardianRelationship"
              opts={["Father", "Mother", "Guardian", "Uncle", "Aunt", "Sibling", "Grandparent", "Other"]}
            />
          </div>

          <Field label="Parent Phone Number" k="guardianPhone" placeholder="e.g. 08012345678" />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
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
