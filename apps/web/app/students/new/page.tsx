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

interface TermOption {
  id: string;
  name: string;
  isCurrent?: boolean;
}

interface FeeStructureItem {
  id: string;
  name: string;
  amount: number;
  level?: string | null;
}

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Auto-invoice states
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(true);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [feeStructures, setFeeStructures] = useState<FeeStructureItem[]>([]);
  const [selectedStructureIds, setSelectedStructureIds] = useState<string[]>([]);

  // Student Portal Account states
  const [createPortalAccount, setCreatePortalAccount] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
    invoiceId?: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStudentPassword(pwd);
  };

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

  // Load available classes, terms, and fee structures
  useEffect(() => {
    async function loadData() {
      try {
        const [resClasses, resTerms, resFees] = await Promise.all([
          fetch(`${API}/api/v1/classes`, { credentials: "include" }),
          fetch(`${API}/api/v1/terms`, { credentials: "include" }),
          fetch(`${API}/api/v1/fees/structures`, { credentials: "include" }),
        ]);

        if (resClasses.ok) {
          const data = await resClasses.json();
          if (Array.isArray(data)) {
            setClasses(data);
            if (data.length > 0) {
              setForm((f) => ({ ...f, classSectionId: data[0].id }));
            }
          }
        }

        if (resTerms.ok) {
          const tData = await resTerms.json();
          if (Array.isArray(tData)) {
            setTerms(tData);
            const cur = tData.find((t: TermOption) => t.isCurrent);
            if (cur) setSelectedTermId(cur.id);
            else if (tData.length > 0) setSelectedTermId(tData[0].id);
          }
        }

        if (resFees.ok) {
          const fData = await resFees.json();
          if (Array.isArray(fData)) {
            setFeeStructures(fData);
            // Pre-select all active fee structures by default
            setSelectedStructureIds(fData.map((f: FeeStructureItem) => f.id));
          }
        }
      } catch (err) {
        console.error("Failed to load classes or fee structures", err);
      } finally {
        setLoadingClasses(false);
      }
    }
    loadData();
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

    if (createPortalAccount) {
      if (!studentEmail.trim()) {
        setError("Student portal email is required when portal account is enabled.");
        return;
      }
      if (!studentPassword || studentPassword.length < 6) {
        setError("Student portal password must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);
    try {
      const body: Record<string, any> = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "")
      );

      if (createPortalAccount) {
        body.createPortalAccount = true;
        body.email = studentEmail.trim();
        body.password = studentPassword;
      }

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

      // If auto-generate invoice is enabled, create invoice
      let createdInvoiceId: string | null = null;
      if (autoGenerateInvoice && selectedStructureIds.length > 0) {
        try {
          const selectedItems = feeStructures
            .filter((f) => selectedStructureIds.includes(f.id))
            .map((f) => ({ feeStructureId: f.id, name: f.name, amount: f.amount }));

          if (selectedItems.length > 0) {
            const invRes = await fetch(`${API}/api/v1/fees/invoices`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentId: data.id,
                termId: selectedTermId || undefined,
                academicYear: "2025/2026",
                items: selectedItems,
              }),
            });
            if (invRes.ok) {
              const invData = await invRes.json();
              createdInvoiceId = invData.id;
            }
          }
        } catch (err) {
          console.error("Auto-generate invoice error", err);
        }
      }

      if (createPortalAccount && studentPassword) {
        setCreatedCredentials({
          name: `${form.firstName} ${form.lastName}`,
          email: studentEmail.trim(),
          password: studentPassword,
          role: "STUDENT",
          invoiceId: createdInvoiceId,
        });
      } else if (createdInvoiceId) {
        router.push(`/fees/${createdInvoiceId}`);
      } else {
        router.push("/students");
      }
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

        {/* Student Portal Login Account Card */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 24,
            border: createPortalAccount ? "1.5px solid var(--color-brand)" : undefined,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <p className="stat-label" style={{ marginBottom: 4, color: "var(--color-ink)", fontWeight: 700 }}>
                Student Portal Login Account
              </p>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                Create login details so the student can access their academic dashboard, view grades, and check attendance.
              </p>
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: "var(--color-ink)", whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={createPortalAccount}
                onChange={(e) => {
                  setCreatePortalAccount(e.target.checked);
                  if (e.target.checked && !studentPassword) {
                    generateRandomPassword();
                  }
                }}
                style={{ width: 16, height: 16 }}
              />
              <span>Enable portal access</span>
            </label>
          </div>

          {createPortalAccount && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="label" htmlFor="student-email" style={{ fontSize: 12 }}>
                    Student Portal Email / Login *
                  </label>
                  <input
                    id="student-email"
                    className="input"
                    type="email"
                    required={createPortalAccount}
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@school.com"
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label className="label" htmlFor="student-pwd" style={{ fontSize: 12, margin: 0 }}>
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      style={{
                        border: "none",
                        background: "none",
                        fontSize: 11,
                        color: "var(--color-primary, #0E7D75)",
                        cursor: "pointer",
                        padding: 0,
                        fontWeight: 600,
                      }}
                    >
                      Generate
                    </button>
                  </div>
                  <input
                    id="student-pwd"
                    className="input"
                    type="text"
                    required={createPortalAccount}
                    minLength={6}
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tuition & Fee Billing Card */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 24,
            border: autoGenerateInvoice ? "1.5px solid var(--color-brand)" : undefined,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <p className="stat-label" style={{ marginBottom: 4, color: "var(--color-ink)", fontWeight: 700 }}>
                School Fee Billing &amp; Invoice
              </p>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                Automatically generate official school fee invoice upon admission and print the ATM/POS receipt slip immediately.
              </p>
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: "var(--color-ink)", whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={autoGenerateInvoice}
                onChange={(e) => setAutoGenerateInvoice(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>Generate invoice</span>
            </label>
          </div>

          {autoGenerateInvoice && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="label" style={{ fontSize: 12 }}>Academic Term</label>
                  <select
                    className="input"
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isCurrent ? "(Current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" style={{ fontSize: 12 }}>Academic Session</label>
                  <input className="input" value="2025/2026" readOnly />
                </div>
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, marginBottom: 8 }}>Select Fee Structures to Apply</label>
                {feeStructures.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    No fee structures defined yet. You can create them in <Link href="/fees/structures" style={{ textDecoration: "underline" }}>Fee Structures</Link>.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {feeStructures.map((f) => {
                      const isChecked = selectedStructureIds.includes(f.id);
                      return (
                        <label
                          key={f.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: "var(--radius-control)",
                            backgroundColor: isChecked ? "var(--color-brand-subtle, #f0f7ff)" : "var(--color-surface, #fff)",
                            border: `1px solid ${isChecked ? "var(--color-brand)" : "var(--color-border)"}`,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedStructureIds((prev) => prev.filter((id) => id !== f.id));
                                } else {
                                  setSelectedStructureIds((prev) => [...prev, f.id]);
                                }
                              }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>
                            ₦{Number(f.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "var(--color-surface-subtle, #f9fafb)", borderRadius: "var(--radius-control)" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Total Initial Bill:</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--color-brand)" }}>
                  ₦{feeStructures
                    .filter((f) => selectedStructureIds.includes(f.id))
                    .reduce((sum, f) => sum + Number(f.amount), 0)
                    .toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
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

      {/* Created Credentials Modal */}
      {createdCredentials && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "color-mix(in srgb, var(--color-ink) 50%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
            padding: 16,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 440 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                className="pill-success"
                style={{ display: "inline-block", padding: "4px 12px", marginBottom: 8, fontSize: 12 }}
              >
                Student Account Created
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0", color: "var(--color-ink)" }}>
                {createdCredentials.name}
              </h2>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
                Share these portal login credentials with the student or parent.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "var(--color-surface-sunken, #F8FAFC)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-control)",
                padding: 14,
                marginBottom: 16,
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Portal URL: </span>
                <span style={{ fontWeight: 600 }}>/login</span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Portal Role: </span>
                <span style={{ fontWeight: 600 }}>{createdCredentials.role}</span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Username / Email: </span>
                <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{createdCredentials.email}</span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Temporary Password: </span>
                <span style={{ fontWeight: 700, color: "var(--color-primary, #0E7D75)" }}>
                  {createdCredentials.password}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  const text = `Modern School Portal Login Credentials\nPortal URL: ${window.location.origin}/login\nRole: ${createdCredentials.role}\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
              >
                {copied ? "Copied!" : "Copy Details"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  const invId = createdCredentials.invoiceId;
                  setCreatedCredentials(null);
                  if (invId) {
                    router.push(`/fees/${invId}`);
                  } else {
                    router.push("/students");
                  }
                }}
              >
                {createdCredentials.invoiceId ? "Proceed to Invoice" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
