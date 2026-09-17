"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  designation?: string | null;
  isActive: boolean;
  user?: {
    email?: string | null;
    role?: string | null;
  } | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName ?? "").trim().charAt(0);
  const last = (lastName ?? "").trim().charAt(0);
  const combined = `${first}${last}`.trim().toUpperCase();
  return combined || "—";
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    phone: "",
    gender: "",
    notes: "",
  });

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/staff?all=true`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message ?? `Failed to load staff records (${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setStaffList(data);
      } else {
        setStaffList([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load staff directory";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.role.trim()) {
      setFormError("First name, last name, and role are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role.trim(),
      };
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.gender.trim()) payload.gender = formData.gender.trim();
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      const res = await fetch(`${API}/api/v1/staff`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to add staff member.");
      }

      await fetchStaff();
      setFormData({
        firstName: "",
        lastName: "",
        role: "",
        phone: "",
        gender: "",
        notes: "",
      });
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((member) => {
      if (statusFilter === "ACTIVE" && !member.isActive) return false;
      if (statusFilter === "INACTIVE" && member.isActive) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      const role = (member.role ?? "").toLowerCase();
      const designation = (member.designation ?? "").toLowerCase();
      const email = (member.email ?? member.user?.email ?? "").toLowerCase();
      const phone = (member.phone ?? "").toLowerCase();

      return (
        fullName.includes(q) ||
        role.includes(q) ||
        designation.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    });
  }, [staffList, statusFilter, searchQuery]);

  return (
    <div className="page">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">
            {loading
              ? "Loading staff directory…"
              : `${staffList.length} staff member${staffList.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
        >
          Add staff member
        </button>
      </div>

      {/* Error notification */}
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
            onClick={fetchStaff}
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Skeleton Loading State */}
      {loading && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>Avatar</th>
                <th>Name</th>
                <th>Role / Designation</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  <td style={{ width: 56 }}>
                    <div
                      className="skeleton"
                      style={{ width: 34, height: 34, borderRadius: "50%" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 16, width: "65%", marginBottom: 6 }}
                    />
                    <div className="skeleton" style={{ height: 12, width: "40%" }} />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 16, width: "50%", marginBottom: 6 }}
                    />
                    <div className="skeleton" style={{ height: 12, width: "35%" }} />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 16, width: "70%", marginBottom: 6 }}
                    />
                    <div className="skeleton" style={{ height: 12, width: "45%" }} />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{
                        height: 22,
                        width: 70,
                        borderRadius: "var(--radius-pill-badge)",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Empty State */}
      {!loading && staffList.length === 0 && !error && (
        <div className="card">
          <div className="empty-state">
            <div
              className="empty-state-icon"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="empty-state-title">No staff records yet</h3>
            <p className="empty-state-text">Add your teaching and administrative staff.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setFormError(null);
                setIsModalOpen(true);
              }}
            >
              Add staff member
            </button>
          </div>
        </div>
      )}

      {/* Filter and Table Content */}
      {!loading && staffList.length > 0 && (
        <>
          {/* Controls Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
              <input
                type="search"
                className="input"
                placeholder="Search staff by name, role, contact…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className={`btn ${statusFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => setStatusFilter("ALL")}
              >
                All ({staffList.length})
              </button>
              <button
                type="button"
                className={`btn ${statusFilter === "ACTIVE" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => setStatusFilter("ACTIVE")}
              >
                Active ({staffList.filter((s) => s.isActive).length})
              </button>
              <button
                type="button"
                className={`btn ${statusFilter === "INACTIVE" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => setStatusFilter("INACTIVE")}
              >
                Inactive ({staffList.filter((s) => !s.isActive).length})
              </button>
            </div>
          </div>

          {/* 2. Staff Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {filteredStaff.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                }}
              >
                <p style={{ fontSize: 14, marginBottom: 12 }}>
                  No staff members match the current filter.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>Avatar</th>
                    <th>Name</th>
                    <th>Role / Designation</th>
                    <th>Contact</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((member) => {
                    const contactEmail = member.email ?? member.user?.email;
                    const roleText = member.role;
                    const designationText = member.designation;

                    return (
                      <tr key={member.id}>
                        {/* Avatar */}
                        <td style={{ width: 56 }}>
                          <div className="avatar">
                            {getInitials(member.firstName, member.lastName)}
                          </div>
                        </td>

                        {/* Name */}
                        <td>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "var(--color-ink)",
                              fontSize: 14,
                            }}
                          >
                            {member.firstName} {member.lastName}
                          </div>
                        </td>

                        {/* Role / Designation */}
                        <td>
                          <div
                            style={{
                              fontWeight: 500,
                              color: "var(--color-ink)",
                            }}
                          >
                            {roleText}
                          </div>
                          {designationText && designationText !== roleText && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              {designationText}
                            </div>
                          )}
                        </td>

                        {/* Contact */}
                        <td>
                          {contactEmail && (
                            <div style={{ color: "var(--color-ink)" }}>
                              {contactEmail}
                            </div>
                          )}
                          {member.phone && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              {member.phone}
                            </div>
                          )}
                          {!contactEmail && !member.phone && (
                            <span style={{ color: "var(--color-text-secondary)" }}>
                              —
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          {member.isActive ? (
                            <span className="pill-success">ACTIVE</span>
                          ) : (
                            <span className="pill-danger">INACTIVE</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Add Staff Member Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "color-mix(in srgb, var(--color-ink) 45%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={() => {
            if (!submitting) setIsModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              backgroundColor: "var(--color-surface)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  id="modal-title"
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--color-ink)",
                  }}
                >
                  Add staff member
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    marginTop: 2,
                  }}
                >
                  Enter details to record a new staff profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {formError && (
              <div
                className="pill-danger"
                style={{
                  display: "block",
                  marginBottom: 16,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleAddStaff}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label className="label" htmlFor="firstName">
                    First name *
                  </label>
                  <input
                    id="firstName"
                    className="input"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="lastName">
                    Last name *
                  </label>
                  <input
                    id="lastName"
                    className="input"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label" htmlFor="role">
                  Role *
                </label>
                <input
                  id="role"
                  className="input"
                  type="text"
                  required
                  list="staff-role-options"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  placeholder="e.g. Teacher, Driver, Security"
                />
                <datalist id="staff-role-options">
                  <option value="Teacher" />
                  <option value="Principal" />
                  <option value="Vice Principal" />
                  <option value="Administrator" />
                  <option value="Accountant" />
                  <option value="Librarian" />
                  <option value="Nurse" />
                  <option value="Driver" />
                  <option value="Security" />
                  <option value="Cleaner" />
                  <option value="Cook" />
                </datalist>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label className="label" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    className="input"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="e.g. 08012345678"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="gender">
                    Gender
                  </label>
                  <select
                    id="gender"
                    className="input"
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, gender: e.target.value }))
                    }
                  >
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label" htmlFor="notes">
                  Notes
                </label>
                <input
                  id="notes"
                  className="input"
                  type="text"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Additional remarks"
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Adding…" : "Add staff member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
