"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface ChildData {
  linkId: string;
  relationship: string | null;
  isPrimary: boolean;
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  photoUrl: string | null;
  classSection: {
    id: string;
    name: string;
    level: string;
  } | null;
  attendanceRate: number;
  attendanceRecordsCount: number;
  feeSummary: {
    totalInvoiced: number;
    totalPaid: number;
    outstandingBalance: number;
  };
  invoices: Array<{
    id: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: string | null;
    createdAt: string;
  }>;
  recentScores: Array<{
    id: string;
    ca1: number | null;
    ca2: number | null;
    exam: number | null;
    total: number | null;
    grade: string | null;
    subject: { id: string; name: string; code: string | null };
  }>;
}

interface ParentDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalFeeBalance: number;
  children: ChildData[];
}

interface AvailableStudent {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "Never";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Never";
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Never";
  }
}

export default function ParentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const parentId = resolvedParams.id;
  const { isAdmin } = useCurrentUser();
  const router = useRouter();

  const [parent, setParent] = useState<ParentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [linkRelationship, setLinkRelationship] = useState("Parent");
  const [submittingLink, setSubmittingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [togglingActive, setTogglingActive] = useState(false);

  const fetchParent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/parents/${parentId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `Failed to load parent (${res.status})`);
      }
      const data = await res.json();
      setParent(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load parent details");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const res = await fetch(`${API}/api/v1/students`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAvailableStudents(data);
          if (data.length > 0) setSelectedStudentId(data[0].id);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchParent();
    fetchAllStudents();
  }, [parentId]);

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
      const res = await fetch(`${API}/api/v1/parents/${parentId}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to reset password.");

      setActionSuccess("Password updated successfully.");
      setShowResetModal(false);
      setNewPassword("");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleToggleActive = async () => {
    if (!isAdmin || !parent) return;
    setTogglingActive(true);
    try {
      const res = await fetch(`${API}/api/v1/parents/${parentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !parent.isActive }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to update status.");

      setParent((prev) => prev ? { ...prev, isActive: !prev.isActive } : null);
      setActionSuccess(`Parent portal account ${!parent.isActive ? "activated" : "suspended"}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setTogglingActive(false);
    }
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedStudentId) return;
    setLinkError(null);
    setSubmittingLink(true);

    try {
      const res = await fetch(`${API}/api/v1/parents/${parentId}/link-student`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          relationship: linkRelationship,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to link student.");

      setActionSuccess("Student linked to parent successfully.");
      setShowLinkModal(false);
      await fetchParent();
    } catch (err: unknown) {
      setLinkError(err instanceof Error ? err.message : "Failed to link student.");
    } finally {
      setSubmittingLink(false);
    }
  };

  const handleUnlinkStudent = async (studentId: string, studentName: string) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Are you sure you want to unlink ${studentName} from this parent?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API}/api/v1/parents/${parentId}/unlink-student/${studentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to unlink student.");

      setActionSuccess(`Unlinked ${studentName} from parent.`);
      await fetchParent();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to unlink student.");
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

  if (error || !parent) {
    return (
      <div className="page">
        <div style={{ marginBottom: 16 }}>
          <Link href="/parents" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>
            &larr; Back to parents
          </Link>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <h3 className="empty-state-title">Parent not found</h3>
          <p className="empty-state-text">{error ?? "This parent record could not be loaded."}</p>
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/parents")}>
            Return to Parents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Navigation breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/parents"
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
          Back to parents directory
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

      {/* Parent Profile Header Card */}
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
            {parent.firstName.charAt(0)}{parent.lastName.charAt(0)}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                {parent.firstName} {parent.lastName}
              </h1>
              <span className={parent.isActive ? "pill-success" : "pill-danger"}>
                {parent.isActive ? "Portal Active" : "Portal Suspended"}
              </span>
            </div>

            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Email: <strong style={{ color: "var(--color-ink)" }}>{parent.email}</strong></span>
              <span>Phone: <strong style={{ color: "var(--color-ink)" }}>{parent.phone || "None"}</strong></span>
              <span>Last Login: <strong style={{ color: "var(--color-ink)" }}>{formatDate(parent.lastLoginAt)}</strong></span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setLinkError(null);
                setShowLinkModal(true);
              }}
            >
              Link Student
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setResetError(null);
                setNewPassword("");
                setShowResetModal(true);
              }}
            >
              Reset Password
            </button>
            <button
              type="button"
              className={parent.isActive ? "btn btn-secondary" : "btn btn-primary"}
              disabled={togglingActive}
              onClick={handleToggleActive}
            >
              {parent.isActive ? "Suspend Access" : "Reactivate Access"}
            </button>
          </div>
        )}
      </div>

      {/* Overview Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Enrolled Wards</div>
          <div className="stat-value">{parent.children.length}</div>
          <div className="stat-sub">Linked student profiles</div>
        </div>

        <div className="card">
          <div className="stat-label">Total Outstanding Fees</div>
          <div className="stat-value" style={{ color: parent.totalFeeBalance > 0 ? "var(--color-danger-text, #DC2626)" : "var(--color-success-text, #16A34A)" }}>
            ₦{parent.totalFeeBalance.toLocaleString("en-NG")}
          </div>
          <div className="stat-sub">Across all children</div>
        </div>

        <div className="card">
          <div className="stat-label">Account Created</div>
          <div className="stat-value" style={{ fontSize: 16, marginTop: 4 }}>
            {formatDate(parent.createdAt)}
          </div>
          <div className="stat-sub">Registered date</div>
        </div>
      </div>

      {/* Linked Children Section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
            Linked Wards & Students ({parent.children.length})
          </h2>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => setShowLinkModal(true)}
            >
              + Link Another Student
            </button>
          )}
        </div>

        {parent.children.length === 0 ? (
          <div className="card empty-state" style={{ textAlign: "center", padding: 36 }}>
            <h4 className="empty-state-title">No students linked yet</h4>
            <p className="empty-state-text" style={{ maxWidth: 360, margin: "6px auto 16px" }}>
              Link enrolled children to this parent account so they can track report cards and fees.
            </p>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowLinkModal(true)}
              >
                Link Student Now
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {parent.children.map((c) => (
              <div
                key={c.linkId}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: 18,
                  border: "1px solid var(--color-border)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <Link
                        href={`/students/${c.studentId}`}
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "var(--color-primary, #0E7D75)",
                          textDecoration: "none",
                        }}
                      >
                        {c.firstName} {c.lastName}
                      </Link>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        {c.admissionNumber || "No admission no"} &middot; {c.classSection?.name || "Unassigned"}
                      </div>
                    </div>

                    <span className="pill-neutral" style={{ fontSize: 11 }}>
                      {c.relationship || "Ward"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <div style={{ color: "var(--color-text-secondary)" }}>Attendance</div>
                      <div style={{ fontWeight: 600, color: "var(--color-ink)", marginTop: 2 }}>
                        {c.attendanceRate}% ({c.attendanceRecordsCount} marked)
                      </div>
                    </div>

                    <div>
                      <div style={{ color: "var(--color-text-secondary)" }}>Fee Balance</div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: c.feeSummary.outstandingBalance > 0 ? "var(--color-danger-text, #DC2626)" : "var(--color-success-text, #16A34A)",
                          marginTop: 2,
                        }}
                      >
                        ₦{c.feeSummary.outstandingBalance.toLocaleString("en-NG")}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
                  <Link
                    href={`/students/${c.studentId}`}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                  >
                    View Student Profile
                  </Link>

                  {isAdmin && (
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-danger-text, #DC2626)",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: 4,
                      }}
                      onClick={() => handleUnlinkStudent(c.studentId, `${c.firstName} ${c.lastName}`)}
                    >
                      Unlink
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Reset Password */}
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
                Reset Portal Password
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
              Enter a new password for {parent.firstName} {parent.lastName} ({parent.email}).
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

      {/* Modal: Link Student */}
      {showLinkModal && isAdmin && (
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
          onClick={() => setShowLinkModal(false)}
        >
          <div className="card" style={{ width: "100%", maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Link Student to Parent
              </h2>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                &times;
              </button>
            </div>

            {linkError && (
              <div className="pill-danger" style={{ marginBottom: 14, padding: "6px 10px", fontSize: 12 }}>
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkStudent}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
                <div>
                  <label className="label">Select Student *</label>
                  <select
                    className="input"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    required
                  >
                    {availableStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} {s.admissionNumber ? `(${s.admissionNumber})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Relationship</label>
                  <select
                    className="input"
                    value={linkRelationship}
                    onChange={(e) => setLinkRelationship(e.target.value)}
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Aunt">Aunt</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submittingLink}
                  onClick={() => setShowLinkModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingLink}
                >
                  {submittingLink ? "Linking..." : "Link Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
