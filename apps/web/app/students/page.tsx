"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoCaptureInput from "../components/PhotoCaptureInput";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface Enrollment {
  classSection: {
    id: string;
    name: string;
    level: string;
  };
  academicYear: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  gender: string | null;
  photoUrl?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianRelationship?: string | null;
  guardianPhotoUrl?: string | null;
  enrollmentStatus: string;
  enrollments: Enrollment[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.trim().charAt(0) ?? "";
  const last = lastName?.trim().charAt(0) ?? "";
  return (first + last).toUpperCase() || "—";
}

function getStatusPillClass(status: string): string {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "pill-success";
    case "WITHDRAWN":
      return "pill-danger";
    case "TRANSFERRED":
      return "pill-warning";
    case "GRADUATED":
      return "pill-neutral";
    default:
      return "pill-neutral";
  }
}

export default function StudentsPage() {
  const router = useRouter();
  const { isAdmin } = useCurrentUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; level: string }>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Edit State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editAdmissionNo, setEditAdmissionNo] = useState("");
  const [editGender, setEditGender] = useState("FEMALE");
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [editClassSectionId, setEditClassSectionId] = useState<string>("");
  const [editGuardianName, setEditGuardianName] = useState<string>("");
  const [editGuardianPhone, setEditGuardianPhone] = useState<string>("");
  const [editGuardianRelationship, setEditGuardianRelationship] = useState<string>("Mother");
  const [editGuardianPhotoUrl, setEditGuardianPhotoUrl] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Withdraw State
  const [withdrawingStudent, setWithdrawingStudent] = useState<Student | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("Transfer to another institution");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  function fetchStudents() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }

    fetch(`${API}/api/v1/students?${params.toString()}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load students");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setStudents(data);
          setError("");
        } else {
          setError(data.message ?? "Failed to load students");
        }
      })
      .catch((err) => {
        setError(err.message ?? "Failed to load students");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchStudents();
  }, [search]);

  useEffect(() => {
    fetch(`${API}/api/v1/classes`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClasses(data);
      })
      .catch(() => {});
  }, []);

  function openEditModal(student: Student) {
    if (!isAdmin) return;
    setEditingStudent(student);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditAdmissionNo(student.admissionNumber ?? "");
    setEditGender(student.gender ?? "FEMALE");
    setEditPhotoUrl(student.photoUrl ?? null);
    setEditClassSectionId(student.enrollments?.[0]?.classSection?.id ?? "");
    setEditGuardianName(student.guardianName ?? "");
    setEditGuardianPhone(student.guardianPhone ?? "");
    setEditGuardianRelationship(student.guardianRelationship ?? "Mother");
    setEditGuardianPhotoUrl(student.guardianPhotoUrl ?? null);
    setEditError("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingEdit(true);
    setEditError("");

    try {
      const res = await fetch(`${API}/api/v1/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          admissionNumber: editAdmissionNo || undefined,
          gender: editGender,
          classSectionId: editClassSectionId || undefined,
          photoUrl: editPhotoUrl,
          guardianName: editGuardianName || null,
          guardianPhone: editGuardianPhone || null,
          guardianRelationship: editGuardianRelationship || null,
          guardianPhotoUrl: editGuardianPhotoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.message ?? "Could not update student details.");
        return;
      }

      setActionSuccess(`Updated ${editFirstName} ${editLastName} successfully.`);
      setEditingStudent(null);
      fetchStudents();
    } catch {
      setEditError("Connection error. Could not reach the API.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleConfirmWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!withdrawingStudent) return;
    setSubmittingWithdraw(true);

    try {
      const res = await fetch(`${API}/api/v1/students/${withdrawingStudent.id}/withdraw`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: withdrawReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Failed to withdraw student.");
        return;
      }

      setActionSuccess(`Student ${withdrawingStudent.firstName} ${withdrawingStudent.lastName} withdrawn.`);
      setWithdrawingStudent(null);
      fetchStudents();
    } catch {
      setError("Network error withdrawing student.");
    } finally {
      setSubmittingWithdraw(false);
    }
  }

  async function handleReenroll(student: Student) {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API}/api/v1/students/${student.id}/reenroll`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Failed to re-enroll student.");
        return;
      }

      setActionSuccess(`Student ${student.firstName} ${student.lastName} re-enrolled successfully.`);
      fetchStudents();
    } catch {
      setError("Network error re-enrolling student.");
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">
            {students.length} {students.length === 1 ? "student" : "students"} registered
          </p>
        </div>
        {isAdmin && (
          <Link href="/students/new" className="btn btn-primary">
            Add a student
          </Link>
        )}
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-control)", backgroundColor: "var(--color-success-bg)", color: "var(--color-success-text)", fontSize: 13 }}>
          {actionSuccess}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20, maxWidth: 380 }}>
        <input
          type="search"
          className="input"
          placeholder="Search by name or admission number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="pill-danger"
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginBottom: 16,
            padding: "8px 14px",
            borderRadius: "var(--radius-control)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>Avatar</th>
                <th>Name</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Status</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td style={{ width: 48 }}>
                    <div className="skeleton" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                  </td>
                  <td><div className="skeleton" style={{ height: 16, width: "65%" }} /></td>
                  <td><div className="skeleton" style={{ height: 16, width: "45%" }} /></td>
                  <td><div className="skeleton" style={{ height: 16, width: "50%" }} /></td>
                  <td><div className="skeleton" style={{ height: 20, width: 72, borderRadius: "var(--radius-pill-badge)" }} /></td>
                  {isAdmin && <td><div className="skeleton" style={{ height: 24, width: 90, marginLeft: "auto" }} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : students.length === 0 ? (
        /* Empty State */
        <div className="card empty-state">
          <div className="empty-state-icon" style={{ display: "inline-flex", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 className="empty-state-title">No students yet</h3>
          <p className="empty-state-text">Add your first student to start tracking enrollment.</p>
          {isAdmin && (
            <Link href="/students/new" className="btn btn-primary">
              Add a student
            </Link>
          )}
        </div>
      ) : (
        /* Students Table with Edit & Remove/Withdraw Actions */
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>Avatar</th>
                <th>Name</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Status</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const currentClass = student.enrollments?.[0]?.classSection?.name;
                const isWithdrawn = student.enrollmentStatus === "WITHDRAWN";

                return (
                  <tr key={student.id}>
                    <td style={{ width: 48 }}>
                      <div
                        className="avatar"
                        style={{
                          overflow: "hidden",
                          padding: 0,
                          backgroundColor: "var(--color-page)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {student.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={student.photoUrl}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          getInitials(student.firstName, student.lastName)
                        )}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/students/${student.id}`}
                        style={{
                          fontWeight: 600,
                          color: "var(--color-ink)",
                          textDecoration: "none",
                        }}
                      >
                        {student.firstName} {student.lastName}
                      </Link>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {student.admissionNumber ?? "—"}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {currentClass ?? "—"}
                    </td>
                    <td>
                      <span className={getStatusPillClass(student.enrollmentStatus)}>
                        {student.enrollmentStatus}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <Link
                            href={`/students/${student.id}`}
                            className="btn btn-secondary"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="btn btn-secondary"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                          >
                            Edit
                          </button>
                          {isWithdrawn ? (
                            <button
                              type="button"
                              onClick={() => handleReenroll(student)}
                              className="btn btn-secondary"
                              style={{ padding: "4px 10px", fontSize: 12, color: "var(--color-success-text)" }}
                            >
                              Re-enroll
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setWithdrawingStudent(student)}
                              className="btn btn-secondary"
                              style={{ padding: "4px 10px", fontSize: 12, color: "var(--color-danger-text)" }}
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && isAdmin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 100,
          }}
        >
          <div className="card" style={{ maxWidth: 520, width: "100%", backgroundColor: "#ffffff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Edit Student Details</h3>

            {editError && (
              <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: "var(--radius-control)", backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger-text)", fontSize: 12 }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Student Photo */}
              <PhotoCaptureInput
                photoUrl={editPhotoUrl}
                onChange={(url) => setEditPhotoUrl(url)}
                label="Student Photo (Camera or Upload)"
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Admission Number</label>
                <input
                  type="text"
                  value={editAdmissionNo}
                  onChange={(e) => setEditAdmissionNo(e.target.value)}
                  className="input"
                  placeholder="e.g. SMS/2025/001"
                />
              </div>

              {/* Gender Pills */}
              <div>
                <label className="label" style={{ marginBottom: 6, display: "block" }}>Gender *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "FEMALE", label: "Female" },
                    { id: "MALE", label: "Male" },
                    { id: "OTHER", label: "Other" },
                  ].map((g) => {
                    const isSelected = editGender === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setEditGender(g.id)}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          borderRadius: "var(--radius-control)",
                          border: isSelected ? "2px solid var(--color-ink)" : "1px solid var(--color-border)",
                          backgroundColor: isSelected ? "var(--color-ink)" : "var(--color-surface)",
                          color: isSelected ? "#ffffff" : "var(--color-ink)",
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: 12,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Class Dropdown */}
              <div>
                <label className="label">Assigned Class</label>
                <select
                  value={editClassSectionId}
                  onChange={(e) => setEditClassSectionId(e.target.value)}
                  className="input"
                  style={{ fontWeight: 600 }}
                >
                  <option value="">No class assigned</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.level})
                    </option>
                  ))}
                </select>
              </div>

              {/* Parent / Guardian Section */}
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14, marginTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: "var(--color-ink)" }}>
                  Parent / Guardian Details &amp; Photo
                </p>

                <PhotoCaptureInput
                  photoUrl={editGuardianPhotoUrl}
                  onChange={(url) => setEditGuardianPhotoUrl(url)}
                  label="Parent / Guardian Photo (Camera or Upload)"
                />

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 10, marginTop: 10 }}>
                  <div>
                    <label className="label">Parent Name</label>
                    <input
                      type="text"
                      value={editGuardianName}
                      onChange={(e) => setEditGuardianName(e.target.value)}
                      className="input"
                      placeholder="e.g. Alhaji Ibrahim Auwal"
                    />
                  </div>
                  <div>
                    <label className="label">Relationship</label>
                    <select
                      value={editGuardianRelationship}
                      onChange={(e) => setEditGuardianRelationship(e.target.value)}
                      className="input"
                    >
                      {["Father", "Mother", "Guardian", "Uncle", "Aunt", "Sibling", "Grandparent", "Other"].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label className="label">Parent Phone Number</label>
                  <input
                    type="text"
                    value={editGuardianPhone}
                    onChange={(e) => setEditGuardianPhone(e.target.value)}
                    className="input"
                    placeholder="e.g. 08012345678"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {withdrawingStudent && isAdmin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 100,
          }}
        >
          <div className="card" style={{ maxWidth: 440, width: "100%", backgroundColor: "#ffffff" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--color-danger-text)" }}>
              Withdraw Student
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
              Are you sure you want to withdraw <strong>{withdrawingStudent.firstName} {withdrawingStudent.lastName}</strong>?
              This will mark their enrollment as WITHDRAWN while preserving their historical grades and records.
            </p>

            <form onSubmit={handleConfirmWithdraw} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">Reason for Withdrawal</label>
                <input
                  type="text"
                  required
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  className="input"
                  placeholder="e.g. Relocated to another state"
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setWithdrawingStudent(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdraw}
                  className="btn btn-danger"
                  style={{ flex: 2 }}
                >
                  {submittingWithdraw ? "Withdrawing..." : "Confirm Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
