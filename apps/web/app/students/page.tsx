"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const [students, setStudents] = useState<Student[]>([]);
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

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditAdmissionNo(student.admissionNumber ?? "");
    setEditGender(student.gender ?? "FEMALE");
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
        <Link href="/students/new" className="btn btn-primary">
          Add a student
        </Link>
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
                <th style={{ textAlign: "right" }}>Actions</th>
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
                  <td><div className="skeleton" style={{ height: 24, width: 90, marginLeft: "auto" }} /></td>
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
          <Link href="/students/new" className="btn btn-primary">
            Add a student
          </Link>
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
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const currentClass = student.enrollments?.[0]?.classSection?.name;
                const isWithdrawn = student.enrollmentStatus === "WITHDRAWN";

                return (
                  <tr key={student.id}>
                    <td style={{ width: 48 }}>
                      <div className="avatar">
                        {getInitials(student.firstName, student.lastName)}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                      {student.firstName} {student.lastName}
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
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
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
          <div className="card" style={{ maxWidth: 480, width: "100%", backgroundColor: "#ffffff" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Edit Student Details</h3>

            {editError && (
              <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: "var(--radius-control)", backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger-text)", fontSize: 12 }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
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

              <div>
                <label className="label">Gender</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="input"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
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
      {withdrawingStudent && (
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
