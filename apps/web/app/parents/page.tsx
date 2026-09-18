"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import Link from "next/link";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface LinkedStudent {
  id: string;
  relationship: string | null;
  isPrimary: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string | null;
    currentClass: string | null;
  };
}

interface ParentRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  children: LinkedStudent[];
  childrenCount: number;
}

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  enrollments?: Array<{ classSection?: { name?: string } }>;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = (firstName ?? "").trim().charAt(0);
  const l = (lastName ?? "").trim().charAt(0);
  return `${f}${l}`.trim().toUpperCase() || "PA";
}

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

export default function ParentsPage() {
  const { isAdmin } = useCurrentUser();
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Register Parent Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    relationship: "Mother",
    studentIds: [] as string[],
  });

  // Created Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick Reset Password Modal State
  const [resetModalParent, setResetModalParent] = useState<ParentRecord | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const fetchParents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/parents`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message ?? `Failed to load parents (${res.status})`);
      }
      const data = await res.json();
      setParents(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load parents");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API}/api/v1/students`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, []);

  const filteredParents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return parents.filter((p) => {
      if (statusFilter === "ACTIVE" && !p.isActive) return false;
      if (statusFilter === "INACTIVE" && p.isActive) return false;

      if (!q) return true;

      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const emailMatch = p.email.toLowerCase().includes(q);
      const phoneMatch = (p.phone ?? "").toLowerCase().includes(q);
      const childMatch = p.children.some((c) =>
        `${c.student.firstName} ${c.student.lastName}`.toLowerCase().includes(q)
      );

      return fullName.includes(q) || emailMatch || phoneMatch || childMatch;
    });
  }, [parents, searchQuery, statusFilter]);

  const activeCount = useMemo(() => parents.filter((p) => p.isActive).length, [parents]);
  const totalWardsCount = useMemo(
    () => parents.reduce((sum, p) => sum + (p.childrenCount || 0), 0),
    [parents]
  );

  const handleRegisterParent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    setRegisterError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setRegisterError("First name, last name, and email are required.");
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setRegisterError("Password must be at least 6 characters.");
      return;
    }

    setSubmittingRegister(true);
    try {
      const res = await fetch(`${API}/api/v1/parents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim() || undefined,
          relationship: formData.relationship,
          studentIds: formData.studentIds,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to register parent.");
      }

      setCreatedCredentials({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        role: "Parent / Guardian",
      });

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        relationship: "Mother",
        studentIds: [],
      });

      setIsRegisterModalOpen(false);
      await fetchParents();
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : "Failed to register parent.");
    } finally {
      setSubmittingRegister(false);
    }
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin || !resetModalParent) return;
    setResetError(null);

    if (!newPasswordInput || newPasswordInput.length < 6) {
      setResetError("New password must be at least 6 characters.");
      return;
    }

    setSubmittingReset(true);
    try {
      const res = await fetch(`${API}/api/v1/parents/${resetModalParent.id}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to reset password.");
      }

      setActionSuccess(`Password reset successfully for ${resetModalParent.firstName} ${resetModalParent.lastName}.`);
      setResetModalParent(null);
      setNewPasswordInput("");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Modern School Portal Login Credentials\nPortal URL: ${window.location.origin}/login\nRole: ${createdCredentials.role}\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pwd }));
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Parents & Guardians</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Manage parent portal accounts, track linked students, and audit account access.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setRegisterError(null);
              setIsRegisterModalOpen(true);
            }}
          >
            Register Parent
          </button>
        )}
      </div>

      {/* Stats Summary Grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Total Parents</div>
          <div className="stat-value">{parents.length}</div>
          <div className="stat-sub">Registered accounts</div>
        </div>

        <div className="card">
          <div className="stat-label">Active Portals</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-sub">Enabled for login</div>
        </div>

        <div className="card">
          <div className="stat-label">Linked Students</div>
          <div className="stat-value">{totalWardsCount}</div>
          <div className="stat-sub">Wards across all classes</div>
        </div>
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
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "inherit",
              padding: "0 4px",
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div
          className="pill-danger"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchParents}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            type="text"
            className="input"
            placeholder="Search by parent name, email, phone, or child's name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setStatusFilter(filterKey)}
              className={statusFilter === filterKey ? "btn btn-primary" : "btn btn-secondary"}
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              {filterKey === "ALL" ? "All Parents" : filterKey === "ACTIVE" ? "Active Only" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Empty State */}
      {loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>Avatar</th>
                <th>Parent Name</th>
                <th>Contact Details</th>
                <th>Linked Wards</th>
                <th>Portal Status</th>
                <th>Last Login</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td><div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%" }} /></td>
                  <td><div className="skeleton" style={{ height: 16, width: 140 }} /></td>
                  <td><div className="skeleton" style={{ height: 14, width: 160 }} /></td>
                  <td><div className="skeleton" style={{ height: 20, width: 100 }} /></td>
                  <td><div className="skeleton" style={{ height: 20, width: 70 }} /></td>
                  <td><div className="skeleton" style={{ height: 14, width: 90 }} /></td>
                  {isAdmin && <td><div className="skeleton" style={{ height: 28, width: 80, marginLeft: "auto" }} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredParents.length === 0 ? (
        <div className="card empty-state" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h3 className="empty-state-title">No parents found</h3>
          <p className="empty-state-text" style={{ maxWidth: 420, margin: "8px auto 20px" }}>
            {searchQuery
              ? "No parent records match your search query."
              : "No parent accounts have been registered yet. Register parent accounts to enable family portal access."}
          </p>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsRegisterModalOpen(true)}
            >
              Register First Parent
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>Avatar</th>
                <th>Parent Name</th>
                <th>Contact Details</th>
                <th>Linked Wards</th>
                <th>Portal Status</th>
                <th>Last Login</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredParents.map((parent) => (
                <tr key={parent.id}>
                  <td>
                    <div
                      className="avatar"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "var(--color-primary-subtle, #E6F4F2)",
                        color: "var(--color-primary, #0E7D75)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {getInitials(parent.firstName, parent.lastName)}
                    </div>
                  </td>

                  <td>
                    <Link
                      href={`/parents/${parent.id}`}
                      style={{
                        fontWeight: 600,
                        color: "var(--color-primary, #0E7D75)",
                        textDecoration: "none",
                      }}
                    >
                      {parent.firstName} {parent.lastName}
                    </Link>
                  </td>

                  <td>
                    <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{parent.email}</div>
                    {parent.phone && (
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        {parent.phone}
                      </div>
                    )}
                  </td>

                  <td>
                    {parent.children.length === 0 ? (
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        None linked
                      </span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {parent.children.map((c) => (
                          <Link
                            key={c.id}
                            href={`/students/${c.student.id}`}
                            className="pill-neutral"
                            style={{
                              fontSize: 11,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-pill-badge)",
                            }}
                          >
                            {c.student.firstName} {c.student.lastName}
                            {c.student.currentClass ? ` (${c.student.currentClass})` : ""}
                          </Link>
                        ))}
                      </div>
                    )}
                  </td>

                  <td>
                    <span className={parent.isActive ? "pill-success" : "pill-danger"}>
                      {parent.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {formatDate(parent.lastLoginAt)}
                  </td>

                  {isAdmin && (
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <Link
                          href={`/parents/${parent.id}`}
                          className="btn btn-secondary"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                        >
                          View Account
                        </Link>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                          onClick={() => {
                            setResetError(null);
                            setNewPasswordInput("");
                            setResetModalParent(parent);
                          }}
                        >
                          Reset Pass
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Register Parent with Portal Account */}
      {isRegisterModalOpen && isAdmin && (
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
          onClick={() => setIsRegisterModalOpen(false)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Register Parent / Guardian
              </h2>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                &times;
              </button>
            </div>

            {registerError && (
              <div className="pill-danger" style={{ marginBottom: 16, padding: "8px 12px", fontSize: 13 }}>
                {registerError}
              </div>
            )}

            <form onSubmit={handleRegisterParent}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">First Name *</label>
                    <input
                      type="text"
                      className="input"
                      required
                      placeholder="e.g. Fatima"
                      value={formData.firstName}
                      onChange={(e) => setFormData((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="label">Last Name *</label>
                    <input
                      type="text"
                      className="input"
                      required
                      placeholder="e.g. Bello"
                      value={formData.lastName}
                      onChange={(e) => setFormData((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Phone Number</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="08012345678"
                      value={formData.phone}
                      onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="label">Relationship</label>
                    <select
                      className="input"
                      value={formData.relationship}
                      onChange={(e) => setFormData((f) => ({ ...f, relationship: e.target.value }))}
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Uncle">Uncle</option>
                      <option value="Aunt">Aunt</option>
                    </select>
                  </div>
                </div>

                {/* Portal Login Details Card */}
                <div
                  style={{
                    backgroundColor: "var(--color-surface-sunken, #F8FAFC)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-control)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>
                    Portal Login Credentials
                  </div>

                  <div>
                    <label className="label">Login Email *</label>
                    <input
                      type="email"
                      className="input"
                      required
                      placeholder="parent.name@school.local"
                      value={formData.email}
                      onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label className="label" style={{ margin: 0 }}>Password *</label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-primary, #0E7D75)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Auto-generate
                      </button>
                    </div>
                    <input
                      type="text"
                      className="input"
                      required
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Link Student Selector */}
                <div>
                  <label className="label">Link Enrolled Student(s)</label>
                  <select
                    className="input"
                    multiple
                    size={4}
                    value={formData.studentIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                      setFormData((f) => ({ ...f, studentIds: selected }));
                    }}
                    style={{ minHeight: 90 }}
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} {s.admissionNumber ? `(${s.admissionNumber})` : ""}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                    Hold Ctrl (or Cmd) to select multiple students.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submittingRegister}
                  onClick={() => setIsRegisterModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingRegister}
                >
                  {submittingRegister ? "Creating Account..." : "Create Parent Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Created Credentials Slip */}
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
          <div
            className="card"
            style={{ width: "100%", maxWidth: 440 }}
          >
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                className="pill-success"
                style={{ display: "inline-block", padding: "4px 12px", marginBottom: 8, fontSize: 12 }}
              >
                Account Created Successfully
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0", color: "var(--color-ink)" }}>
                {createdCredentials.name}
              </h2>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
                Share these portal credentials with the parent.
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
                <span style={{ color: "var(--color-text-secondary)" }}>Role: </span>
                <span style={{ fontWeight: 600 }}>{createdCredentials.role}</span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Username / Email: </span>
                <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{createdCredentials.email}</span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Temporary Password: </span>
                <span style={{ fontWeight: 700, color: "var(--color-primary, #0E7D75)" }}>{createdCredentials.password}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={handleCopyCredentials}
              >
                {copied ? "Copied!" : "Copy Details"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setCreatedCredentials(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Reset Password */}
      {resetModalParent && isAdmin && (
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
          onClick={() => setResetModalParent(null)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Reset Parent Password
              </h2>
              <button
                type="button"
                onClick={() => setResetModalParent(null)}
                style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
              Set a new login password for <strong>{resetModalParent.firstName} {resetModalParent.lastName}</strong> ({resetModalParent.email}).
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
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submittingReset}
                  onClick={() => setResetModalParent(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingReset}
                >
                  {submittingReset ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
