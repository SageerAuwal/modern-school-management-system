"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface GuardianData {
  id: string;
  relationship: string | null;
  isPrimary: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    photoUrl: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
  } | null;
}

interface StudentDetail {
  id: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  admissionNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  stateOfOrigin: string | null;
  lga: string | null;
  religion: string | null;
  bloodGroup: string | null;
  medicalNotes: string | null;
  photoUrl: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
  enrollmentStatus: string;
  enrolledAt: string;
  withdrawnAt: string | null;
  enrollments: Array<{
    id: string;
    classSection: {
      id: string;
      name: string;
      level: string;
      academicYear: string;
    };
  }>;
  attendanceRecords: Array<{
    id: string;
    date: string;
    status: string;
    note: string | null;
  }>;
  scores: Array<{
    id: string;
    ca1: number | null;
    ca2: number | null;
    exam: number | null;
    total: number | null;
    grade: string | null;
    subject: { id: string; name: string; code: string | null };
    term: { id: string; name: string; academicYear: string } | null;
  }>;
  invoices: Array<{
    id: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: string | null;
    createdAt: string;
    payments?: Array<{ id: string; amount: number; method: string; paidAt: string }>;
  }>;
  bookLoans: Array<{
    id: string;
    dueDate: string;
    returnedAt: string | null;
    status: string;
    fine: number;
    book: { id: string; title: string; author: string };
  }>;
  guardians: GuardianData[];
  portalUser: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  } | null;
  attendanceStats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    excusedDays: number;
    rate: number;
  };
  feeSummary: {
    totalInvoiced: number;
    totalPaid: number;
    outstandingBalance: number;
  };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getGradePillClass(grade?: string | null): string {
  switch ((grade ?? "").toUpperCase()) {
    case "A":
    case "B":
      return "pill-success";
    case "C":
      return "pill-info";
    case "D":
    case "E":
      return "pill-warning";
    case "F":
      return "pill-danger";
    default:
      return "pill-neutral";
  }
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const { isAdmin } = useCurrentUser();
  const router = useRouter();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"academic" | "attendance" | "fees" | "portal">("academic");

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const fetchStudent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/students/${studentId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `Failed to load student record (${res.status})`);
      }
      const data = await res.json();
      setStudent(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setResetError(null);

    if (!newPassword || newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }

    setSubmittingReset(true);
    try {
      const res = await fetch(`${API}/api/v1/students/${studentId}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to reset password.");

      setActionSuccess("Student portal password updated successfully.");
      setShowResetModal(false);
      setNewPassword("");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setSubmittingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div style={{ marginBottom: 16 }}>
          <div className="skeleton" style={{ height: 20, width: 140 }} />
        </div>
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="skeleton" style={{ height: 28, width: 220, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, width: 340 }} />
        </div>
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="card"><div className="skeleton" style={{ height: 60 }} /></div>
          <div className="card"><div className="skeleton" style={{ height: 60 }} /></div>
          <div className="card"><div className="skeleton" style={{ height: 60 }} /></div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="page">
        <div style={{ marginBottom: 16 }}>
          <Link href="/students" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>
            &larr; Back to students
          </Link>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <h3 className="empty-state-title">Student not found</h3>
          <p className="empty-state-text">{error ?? "This student record could not be loaded."}</p>
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/students")}>
            Return to Students Directory
          </button>
        </div>
      </div>
    );
  }

  const currentClass = student.enrollments[0]?.classSection?.name ?? "Not enrolled";

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/students"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--color-text-secondary)",
            textDecoration: "none",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to students directory
        </Link>
      </div>

      {/* Success alert */}
      {actionSuccess && (
        <div
          className="pill-success"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
          }}
        >
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "inherit" }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Student Profile Header Card */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "var(--color-primary-subtle, #E6F4F2)",
              color: "var(--color-primary, #0E7D75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                {student.firstName} {student.lastName} {student.otherNames || ""}
              </h1>
              <span className={student.enrollmentStatus === "ACTIVE" ? "pill-success" : "pill-danger"}>
                {student.enrollmentStatus}
              </span>
            </div>

            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Adm No: <strong style={{ color: "var(--color-ink)", fontFamily: "monospace" }}>{student.admissionNumber || "—"}</strong></span>
              <span>Class: <strong style={{ color: "var(--color-ink)" }}>{currentClass}</strong></span>
              <span>Gender: <strong style={{ color: "var(--color-ink)" }}>{student.gender || "—"}</strong></span>
              <span>Enrolled: <strong style={{ color: "var(--color-ink)" }}>{formatDate(student.enrolledAt)}</strong></span>
            </div>
          </div>
        </div>

        {isAdmin && student.portalUser && (
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setResetError(null);
                setNewPassword("");
                setShowResetModal(true);
              }}
            >
              Reset Student Password
            </button>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Attendance Rate</div>
          <div className="stat-value">{student.attendanceStats.rate}%</div>
          <div className="stat-sub">
            {student.attendanceStats.presentDays} present of {student.attendanceStats.totalDays} days
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Outstanding Fees</div>
          <div
            className="stat-value"
            style={{
              color: student.feeSummary.outstandingBalance > 0 ? "var(--color-danger-text, #DC2626)" : "var(--color-success-text, #16A34A)",
            }}
          >
            ₦{student.feeSummary.outstandingBalance.toLocaleString("en-NG")}
          </div>
          <div className="stat-sub">Total billed: ₦{student.feeSummary.totalInvoiced.toLocaleString("en-NG")}</div>
        </div>

        <div className="card">
          <div className="stat-label">Subjects Evaluated</div>
          <div className="stat-value">{student.scores.length}</div>
          <div className="stat-sub">Continuous assessments</div>
        </div>

        <div className="card">
          <div className="stat-label">Library Books</div>
          <div className="stat-value">{student.bookLoans.length}</div>
          <div className="stat-sub">Borrow history</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
        <button
          type="button"
          onClick={() => setActiveTab("academic")}
          className={activeTab === "academic" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "6px 14px" }}
        >
          Academic Performance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={activeTab === "attendance" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "6px 14px" }}
        >
          Attendance Record
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fees")}
          className={activeTab === "fees" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "6px 14px" }}
        >
          Fee Invoices & Payments
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("portal")}
          className={activeTab === "portal" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "6px 14px" }}
        >
          Portal & Linked Guardians
        </button>
      </div>

      {/* Tab 1: Academic Performance */}
      {activeTab === "academic" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
              Continuous Assessment & Exam Scores
            </h2>
          </div>

          {student.scores.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
              No assessment scores have been recorded for this student yet.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Term / Academic Session</th>
                  <th style={{ textAlign: "right" }}>CA 1 (20)</th>
                  <th style={{ textAlign: "right" }}>CA 2 (20)</th>
                  <th style={{ textAlign: "right" }}>Exam (60)</th>
                  <th style={{ textAlign: "right" }}>Total (100)</th>
                  <th style={{ textAlign: "center" }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {student.scores.map((score) => (
                  <tr key={score.id}>
                    <td style={{ fontWeight: 600 }}>
                      {score.subject.name} {score.subject.code ? `(${score.subject.code})` : ""}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
                      {score.term?.name || "Term 1"} &middot; {score.term?.academicYear || "2025/2026"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{score.ca1 ?? "—"}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{score.ca2 ?? "—"}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{score.exam ?? "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {score.total ?? "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={getGradePillClass(score.grade)}>
                        {score.grade || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Attendance Record */}
      {activeTab === "attendance" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
              Attendance History (Recent Days)
            </h2>
            <span className="pill-success" style={{ fontSize: 12 }}>
              {student.attendanceStats.rate}% Overall Rate
            </span>
          </div>

          {student.attendanceRecords.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
              No attendance logs found for this student.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Attendance Status</th>
                  <th>Notes / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {student.attendanceRecords.map((att) => {
                  let pillClass = "pill-neutral";
                  if (att.status === "PRESENT") pillClass = "pill-success";
                  else if (att.status === "ABSENT") pillClass = "pill-danger";
                  else if (att.status === "LATE") pillClass = "pill-warning";
                  else if (att.status === "EXCUSED") pillClass = "pill-info";

                  return (
                    <tr key={att.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(att.date)}</td>
                      <td>
                        <span className={pillClass}>{att.status}</span>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                        {att.note || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Fees & Billing */}
      {activeTab === "fees" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
              Invoices & Payment Receipts
            </h2>
          </div>

          {student.invoices.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
              No fee invoices have been issued for this student yet.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date Issued</th>
                  <th>Total Billed</th>
                  <th>Amount Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {student.invoices.map((inv) => {
                  const bal = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
                  return (
                    <tr key={inv.id}>
                      <td>{formatDate(inv.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>₦{Number(inv.totalAmount).toLocaleString("en-NG")}</td>
                      <td style={{ color: "var(--color-success-text, #16A34A)" }}>
                        ₦{Number(inv.paidAmount).toLocaleString("en-NG")}
                      </td>
                      <td style={{ fontWeight: 700, color: bal > 0 ? "var(--color-danger-text, #DC2626)" : "inherit" }}>
                        ₦{bal.toLocaleString("en-NG")}
                      </td>
                      <td>
                        <span className={inv.status === "PAID" ? "pill-success" : inv.status === "PARTIAL" ? "pill-warning" : "pill-danger"}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/fees/${inv.id}`} className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 8px" }}>
                          View Invoice
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 4: Portal & Linked Guardians */}
      {activeTab === "portal" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {/* Left: Student Portal Account */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px 0", color: "var(--color-ink)" }}>
              Student Portal Access
            </h2>

            {student.portalUser ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>Login Email: </span>
                  <span style={{ fontWeight: 600 }}>{student.portalUser.email}</span>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>Portal Status: </span>
                  <span className={student.portalUser.isActive ? "pill-success" : "pill-danger"}>
                    {student.portalUser.isActive ? "Active" : "Suspended"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>Last Login: </span>
                  <span>{formatDate(student.portalUser.lastLoginAt)}</span>
                </div>

                {isAdmin && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setResetError(null);
                        setNewPassword("");
                        setShowResetModal(true);
                      }}
                    >
                      Reset Student Password
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                No student portal account created for this student. Student uses standard school records.
              </p>
            )}
          </div>

          {/* Right: Linked Guardians */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px 0", color: "var(--color-ink)" }}>
              Linked Parents & Guardians ({student.guardians.length})
            </h2>

            {student.guardians.length === 0 ? (
              <div>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  No registered portal parents linked yet.
                </p>
                {student.guardianName && (
                  <div style={{ fontSize: 13, color: "var(--color-ink)" }}>
                    Paper Record: <strong>{student.guardianName}</strong> ({student.guardianRelationship || "Guardian"}) &middot; {student.guardianPhone || "No phone"}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {student.guardians.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      padding: 12,
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-control)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--color-ink)", fontSize: 14 }}>
                        {g.user ? `${g.user.firstName} ${g.user.lastName}` : "Guardian"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        {g.relationship || "Guardian"} &middot; {g.user?.email || "No email"} &middot; {g.user?.phone || ""}
                      </div>
                    </div>

                    {g.user && (
                      <Link
                        href={`/parents/${g.user.id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: "4px 8px" }}
                      >
                        Parent Account
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Reset Student Password */}
      {showResetModal && isAdmin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "color-mix(in srgb, var(--color-ink) 50%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: 16,
          }}
          onClick={() => setShowResetModal(false)}
        >
          <div className="card" style={{ width: "100%", maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Reset Student Password
              </h2>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
              Enter a new login password for {student.firstName} {student.lastName}.
            </p>

            {resetError && (
              <div className="pill-danger" style={{ marginBottom: 14, padding: "6px 10px", fontSize: 12 }}>
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">New Password *</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submittingReset}
                  onClick={() => setShowResetModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingReset}
                >
                  {submittingReset ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
