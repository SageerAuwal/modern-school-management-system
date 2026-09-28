"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhotoCaptureInput from "../../components/PhotoCaptureInput";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Field must be declared at module scope — NOT inside NewStudentPage.
// If declared inside the page function, React creates a new component type on
// every render (every keystroke), unmounts the old <input> DOM node, and
// mounts a fresh one, destroying focus. Module scope gives a stable reference.
function Field({
  label,
  k,
  type = "text",
  required,
  opts,
  placeholder,
  form,
  set,
}: {
  label: string;
  k: string;
  type?: string;
  required?: boolean;
  opts?: string[];
  placeholder?: string;
  form: Record<string, string>;
  set: (k: string, v: string) => void;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && " *"}
      </label>
      {opts ? (
        <select
          value={form[k]}
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
          value={form[k]}
          onChange={(e) => set(k, e.target.value)}
          className="input"
          required={required}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

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

interface ParentOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
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

  // Parent / Guardian linking states
  const [existingParents, setExistingParents] = useState<ParentOption[]>([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedParentRelationship, setSelectedParentRelationship] = useState("Mother");

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
  const [enrollmentNotice, setEnrollmentNotice] = useState<{
    studentName: string;
    studentId: string;
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
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Load available classes, terms, and fee structures
  useEffect(() => {
    async function loadData() {
      try {
        const [resClasses, resTerms, resFees, resParents] = await Promise.all([
          fetch(`${API}/api/v1/classes`, { credentials: "include" }),
          fetch(`${API}/api/v1/terms`, { credentials: "include" }),
          fetch(`${API}/api/v1/fees/structures`, { credentials: "include" }),
          fetch(`${API}/api/v1/parents`, { credentials: "include" }),
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

        if (resParents.ok) {
          const pData = await resParents.json();
          if (Array.isArray(pData)) {
            setExistingParents(pData);
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
        console.error("Failed to load classes, parents, or fee structures", err);
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

      // If a parent was selected, link this student to the parent
      if (selectedParentId && data?.id) {
        try {
          await fetch(`${API}/api/v1/parents/${selectedParentId}/link-student`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              studentId: data.id,
              relationship: selectedParentRelationship || "Parent",
            }),
          });
        } catch (linkErr) {
          console.error("Auto-link parent error", linkErr);
        }
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
                notes: "ADMISSION_REGISTRATION",
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
      } else {
        setEnrollmentNotice({
          studentName: `${form.firstName} ${form.lastName}`,
          studentId: data.id,
          invoiceId: createdInvoiceId,
        });
      }
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setLoading(false);
    }
  }



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
            <Field label="First Name" k="firstName" required placeholder="e.g. Amina" form={form} set={set} />
            <Field label="Last Name" k="lastName" required placeholder="e.g. Sageer" form={form} set={set} />
          </div>

          <Field label="Other Names" k="otherNames" placeholder="e.g. Fatima" form={form} set={set} />

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
            <Field label="Date of Birth" k="dateOfBirth" type="date" form={form} set={set} />
            <Field
              label="Blood Group"
              k="bloodGroup"
              opts={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
              form={form}
              set={set}
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
            form={form}
            set={set}
          />
          <Field label="Religion" k="religion" placeholder="e.g. Islam, Christianity" form={form} set={set} />
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
          <Field label="Home Address" k="address" placeholder="Residential address" form={form} set={set} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="State of Origin" k="stateOfOrigin" placeholder="e.g. Kano" form={form} set={set} />
            <Field label="LGA" k="lga" placeholder="e.g. Municipal" form={form} set={set} />
          </div>
        </div>

        {/* Parent / Guardian Link Card (Optional) */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <p className="stat-label" style={{ marginBottom: 4, color: "var(--color-ink)", fontWeight: 700 }}>
              Parent / Guardian Assignment (Optional)
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
              Link this student to an existing registered parent or guardian. Parents and siblings are officially managed in the Parents Directory.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
            <div>
              <label className="label">Registered Parent / Guardian</label>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="input"
              >
                <option value="">-- No Parent Linked Yet (Link Later) --</option>
                {existingParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.phone || p.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Relationship</label>
              <select
                value={selectedParentRelationship}
                onChange={(e) => setSelectedParentRelationship(e.target.value)}
                className="input"
                disabled={!selectedParentId}
              >
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Guardian">Guardian</option>
                <option value="Uncle">Uncle</option>
                <option value="Aunt">Aunt</option>
                <option value="Sibling">Sibling</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", backgroundColor: "var(--color-surface-subtle)", padding: "10px 12px", borderRadius: "var(--radius-control)" }}>
            Tip: If the parent is not yet registered in the school, you can complete student admission now and create/link the parent anytime under <strong>Parents Directory</strong> or from the student&apos;s profile.
          </div>
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
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 440, padding: 24 }}>
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

            {createdCredentials.invoiceId && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-control)",
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FCD34D",
                  fontSize: 12,
                  color: "#92400E",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Admission Bill Sent to Bursar Desk</div>
                An admission invoice was generated. In accordance with institutional policy, this payment remains unverified until approved and cleared by the School Bursar or an Administrator.
              </div>
            )}

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
                {createdCredentials.invoiceId ? "View Admission Bill" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Enrollment Notice Modal (when portal account is not created) */}
      {enrollmentNotice && (
        <div className="modal-overlay">
          <div
            className="modal-card"
            style={{
              maxWidth: 500,
              padding: 24,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  backgroundColor: "#E6F4F2",
                  color: "#0E7D75",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: "4px 0", color: "var(--color-ink)" }}>
                Student Enrolled Successfully
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                {enrollmentNotice.studentName} has been registered in the student registry.
              </p>
            </div>

            {enrollmentNotice.invoiceId ? (
              <div
                style={{
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FCD34D",
                  borderRadius: "var(--radius-control)",
                  padding: 14,
                  marginBottom: 20,
                  fontSize: 12.5,
                  color: "#92400E",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Admission Payment Awaiting Bursary Clearance</span>
                  <span className="pill-warning" style={{ fontSize: 10 }}>UNVERIFIED</span>
                </div>
                <p style={{ margin: 0 }}>
                  An admission invoice was generated and routed to the Bursary queue. By school regulation, this payment is unverified until approved by the School Bursar or Administrator.
                </p>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "var(--color-surface-sunken, #F8FAFC)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-control)",
                  padding: 12,
                  marginBottom: 20,
                  fontSize: 12.5,
                  color: "var(--color-text-secondary)",
                }}
              >
                Student record is active and ready for class attendance, scores, and timetable assignments.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {enrollmentNotice.invoiceId && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      const invId = enrollmentNotice.invoiceId;
                      setEnrollmentNotice(null);
                      router.push("/fees/bursar");
                    }}
                  >
                    Go to Bursar Verification Desk
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      const invId = enrollmentNotice.invoiceId;
                      setEnrollmentNotice(null);
                      router.push(`/fees/${invId}`);
                    }}
                  >
                    View Admission Invoice
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  const stId = enrollmentNotice.studentId;
                  setEnrollmentNotice(null);
                  router.push(`/students/${stId}`);
                }}
              >
                View Student Profile
              </button>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", justifyContent: "center", color: "var(--color-text-secondary)", fontSize: 12 }}
                onClick={() => {
                  setEnrollmentNotice(null);
                  router.push("/students");
                }}
              >
                Return to Students Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
