"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface AssignedClass {
  id: string;
  name: string;
  level: string;
  academicYear: string;
  capacity?: number | null;
}

interface AssignedSubject {
  id: string;
  classSection: {
    id: string;
    name: string;
    level: string;
  };
  subject: {
    id: string;
    name: string;
    code: string | null;
  };
}

interface StaffDetail {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  address: string | null;
  gender: string | null;
  photoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
  email: string | null;
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    mfaEnabled: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  } | null;
  teachingAssignments: {
    classes: AssignedClass[];
    subjects: AssignedSubject[];
  };
  activityMetrics: {
    attendanceRecordsMarked: number;
    scoresSubmitted: number;
  };
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

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const staffId = resolvedParams.id;
  const { isAdmin } = useCurrentUser();
  const router = useRouter();

  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [togglingActive, setTogglingActive] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/staff/${staffId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `Failed to load staff record (${res.status})`);
      }
      const data = await res.json();
      setStaff(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load staff details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [staffId]);

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
      const res = await fetch(`${API}/api/v1/staff/${staffId}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to reset password.");

      setActionSuccess("Staff portal password updated successfully.");
      setShowResetModal(false);
      setNewPassword("");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleToggleActive = async () => {
    if (!isAdmin || !staff) return;
    setTogglingActive(true);
    const endpoint = staff.isActive ? "deactivate" : "reactivate";

    try {
      const res = await fetch(`${API}/api/v1/staff/${staffId}/${endpoint}`, {
        method: "PATCH",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to update status.");

      setStaff((prev) => prev ? { ...prev, isActive: !prev.isActive } : null);
      setActionSuccess(`Staff member ${!staff.isActive ? "reactivated" : "deactivated"} successfully.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setTogglingActive(false);
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

  if (error || !staff) {
    return (
      <div className="page">
        <div style={{ marginBottom: 16 }}>
          <Link href="/staff" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>
            &larr; Back to staff
          </Link>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <h3 className="empty-state-title">Staff record not found</h3>
          <p className="empty-state-text">{error ?? "This staff record could not be loaded."}</p>
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/staff")}>
            Return to Staff Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/staff"
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
          Back to staff directory
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

      {/* Staff Profile Header Card */}
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
            {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                {staff.firstName} {staff.lastName}
              </h1>
              <span className={staff.isActive ? "pill-success" : "pill-danger"}>
                {staff.isActive ? "Active Staff" : "Inactive"}
              </span>
            </div>

            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Role: <strong style={{ color: "var(--color-ink)" }}>{staff.role}</strong></span>
              {staff.phone && <span>Phone: <strong style={{ color: "var(--color-ink)" }}>{staff.phone}</strong></span>}
              {staff.email && <span>Email: <strong style={{ color: "var(--color-ink)" }}>{staff.email}</strong></span>}
              <span>Joined: <strong style={{ color: "var(--color-ink)" }}>{formatDate(staff.startDate)}</strong></span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {staff.user && (
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
            )}
            <button
              type="button"
              className={staff.isActive ? "btn btn-secondary" : "btn btn-primary"}
              disabled={togglingActive}
              onClick={handleToggleActive}
            >
              {staff.isActive ? "Deactivate Staff" : "Reactivate Staff"}
            </button>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Portal Account</div>
          <div className="stat-value" style={{ fontSize: 16, marginTop: 4 }}>
            {staff.user ? (
              <span className={staff.user.isActive ? "pill-success" : "pill-danger"} style={{ fontSize: 12 }}>
                {staff.user.role} ({staff.user.isActive ? "Enabled" : "Disabled"})
              </span>
            ) : (
              <span className="pill-neutral" style={{ fontSize: 12 }}>No Portal Login</span>
            )}
          </div>
          <div className="stat-sub">
            {staff.user?.lastLoginAt ? `Last login: ${formatDate(staff.user.lastLoginAt)}` : "Never logged in"}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Classes Taught</div>
          <div className="stat-value">{staff.teachingAssignments.classes.length}</div>
          <div className="stat-sub">Class teacher assignments</div>
        </div>

        <div className="card">
          <div className="stat-label">Subject Loads</div>
          <div className="stat-value">{staff.teachingAssignments.subjects.length}</div>
          <div className="stat-sub">Assigned class subjects</div>
        </div>

        <div className="card">
          <div className="stat-label">Scores Entered</div>
          <div className="stat-value">{staff.activityMetrics.scoresSubmitted}</div>
          <div className="stat-sub">{staff.activityMetrics.attendanceRecordsMarked} attendance marks</div>
        </div>
      </div>

      {/* Two Column Layout: Teaching Assignments & Portal Details */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
        {/* Left Column: Teaching Assignments */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px 0", color: "var(--color-ink)" }}>
            Academic Responsibilities
          </h2>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>
              Assigned as Class Teacher
            </div>
            {staff.teachingAssignments.classes.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                Not assigned as a class teacher for any section.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {staff.teachingAssignments.classes.map((cls) => (
                  <Link
                    key={cls.id}
                    href={`/classes`}
                    className="pill-neutral"
                    style={{
                      textDecoration: "none",
                      padding: "6px 12px",
                      borderRadius: "var(--radius-control)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {cls.name} ({cls.level})
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>
              Assigned Subjects
            </div>
            {staff.teachingAssignments.subjects.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                No subject assignments recorded.
              </p>
            ) : (
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.teachingAssignments.subjects.map((sub) => (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 600 }}>
                        {sub.subject.name} {sub.subject.code ? `(${sub.subject.code})` : ""}
                      </td>
                      <td>{sub.classSection.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Portal Account Status & HR Record */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px 0", color: "var(--color-ink)" }}>
            Portal & Employment Information
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Portal Username / Email: </span>
              <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                {staff.user?.email || staff.email || "No portal account linked"}
              </span>
            </div>

            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Portal Role: </span>
              <span style={{ fontWeight: 600 }}>{staff.user?.role || staff.role}</span>
            </div>

            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Last Portal Login: </span>
              <span>{formatDate(staff.user?.lastLoginAt)}</span>
            </div>

            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Gender: </span>
              <span>{staff.gender || "Not specified"}</span>
            </div>

            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Home Address: </span>
              <span>{staff.address || "Not specified"}</span>
            </div>

            {staff.notes && (
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Administrative Notes: </span>
                <p style={{ margin: "4px 0 0 0", color: "var(--color-ink)" }}>{staff.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Reset Staff Password */}
      {showResetModal && isAdmin && staff.user && (
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
                Reset Staff Password
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
              Set a new login password for {staff.firstName} {staff.lastName} ({staff.user.email}).
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
