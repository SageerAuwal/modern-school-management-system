"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import PhotoCaptureInput from "../components/PhotoCaptureInput";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  designation?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
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
  const { isAdmin } = useCurrentUser();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Add Staff Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [addFormData, setAddFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    phone: "",
    gender: "",
    photoUrl: "",
    notes: "",
  });

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    phone: "",
    gender: "",
    photoUrl: "",
    notes: "",
  });

  // Delete Staff Modal State
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

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
    if (!isAdmin) return;
    setAddFormError(null);

    if (!addFormData.firstName.trim() || !addFormData.lastName.trim() || !addFormData.role.trim()) {
      setAddFormError("First name, last name, and role are required.");
      return;
    }

    setSubmittingAdd(true);
    try {
      const payload: Record<string, string> = {
        firstName: addFormData.firstName.trim(),
        lastName: addFormData.lastName.trim(),
        role: addFormData.role.trim(),
      };
      if (addFormData.phone.trim()) payload.phone = addFormData.phone.trim();
      if (addFormData.gender.trim()) payload.gender = addFormData.gender.trim();
      if (addFormData.photoUrl) payload.photoUrl = addFormData.photoUrl;
      if (addFormData.notes.trim()) payload.notes = addFormData.notes.trim();

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
      setActionSuccess(`Staff member ${payload.firstName} ${payload.lastName} registered successfully.`);
      setAddFormData({
        firstName: "",
        lastName: "",
        role: "",
        phone: "",
        gender: "",
        photoUrl: "",
        notes: "",
      });
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setAddFormError(msg);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const openEditModal = (member: StaffMember) => {
    if (!isAdmin) return;
    setEditingStaff(member);
    setEditFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      phone: member.phone ?? "",
      gender: member.gender ?? "",
      photoUrl: member.photoUrl ?? "",
      notes: member.notes ?? "",
    });
    setEditFormError(null);
  };

  const handleSaveEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStaff || !isAdmin) return;
    setEditFormError(null);

    if (!editFormData.firstName.trim() || !editFormData.lastName.trim() || !editFormData.role.trim()) {
      setEditFormError("First name, last name, and role are required.");
      return;
    }

    setSubmittingEdit(true);
    try {
      const payload: Record<string, string> = {
        firstName: editFormData.firstName.trim(),
        lastName: editFormData.lastName.trim(),
        role: editFormData.role.trim(),
      };
      if (editFormData.phone.trim()) payload.phone = editFormData.phone.trim();
      if (editFormData.gender.trim()) payload.gender = editFormData.gender.trim();
      payload.photoUrl = editFormData.photoUrl;
      if (editFormData.notes.trim()) payload.notes = editFormData.notes.trim();

      const res = await fetch(`${API}/api/v1/staff/${editingStaff.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to update staff member.");
      }

      await fetchStaff();
      setActionSuccess(`Updated ${payload.firstName} ${payload.lastName} successfully.`);
      setEditingStaff(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setEditFormError(msg);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeactivate = async (member: StaffMember) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API}/api/v1/staff/${member.id}/deactivate`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to deactivate staff member.");
      }
      setActionSuccess(`Staff member ${member.firstName} ${member.lastName} deactivated.`);
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deactivating staff member.";
      setError(msg);
    }
  };

  const handleReactivate = async (member: StaffMember) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API}/api/v1/staff/${member.id}/reactivate`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to reactivate staff member.");
      }
      setActionSuccess(`Staff member ${member.firstName} ${member.lastName} reactivated.`);
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error reactivating staff member.";
      setError(msg);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff || !isAdmin) return;
    setSubmittingDelete(true);
    try {
      const res = await fetch(`${API}/api/v1/staff/${deletingStaff.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to delete staff member.");
      }
      setActionSuccess(`Staff member ${deletingStaff.firstName} ${deletingStaff.lastName} permanently removed.`);
      setDeletingStaff(null);
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting staff member.";
      setError(msg);
    } finally {
      setSubmittingDelete(false);
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
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setAddFormError(null);
              setIsAddModalOpen(true);
            }}
          >
            Add staff member
          </button>
        )}
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            backgroundColor: "var(--color-success-bg)",
            color: "var(--color-success-text)",
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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

      {/* Loading Skeleton State */}
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
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
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
                  {isAdmin && (
                    <td>
                      <div
                        className="skeleton"
                        style={{
                          height: 24,
                          width: 140,
                          marginLeft: "auto",
                        }}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
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
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setAddFormError(null);
                  setIsAddModalOpen(true);
                }}
              >
                Add staff member
              </button>
            )}
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

          {/* 2. Staff Table with Actions Column */}
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
                    {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
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
                          <div
                            className="avatar"
                            style={{
                              overflow: "hidden",
                              padding: 0,
                              backgroundColor: "var(--color-page)",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            {member.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.photoUrl}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              getInitials(member.firstName, member.lastName)
                            )}
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

                        {/* Actions (Edit / Deactivate / Reactivate / Remove) */}
                        {isAdmin && (
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => openEditModal(member)}
                                className="btn btn-secondary"
                                style={{ padding: "4px 10px", fontSize: 12 }}
                              >
                                Edit
                              </button>

                              {member.isActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeactivate(member)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: 12,
                                    color: "var(--color-warning-text, #b45309)",
                                  }}
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleReactivate(member)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: 12,
                                    color: "var(--color-success-text)",
                                  }}
                                >
                                  Reactivate
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeletingStaff(member)}
                                className="btn btn-secondary"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 12,
                                  color: "var(--color-danger-text)",
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        )}
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
      {isAddModalOpen && isAdmin && (
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
          aria-labelledby="modal-add-title"
          onClick={() => {
            if (!submittingAdd) setIsAddModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 500,
              backgroundColor: "var(--color-surface)",
              maxHeight: "90vh",
              overflowY: "auto",
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
                  id="modal-add-title"
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
                onClick={() => setIsAddModalOpen(false)}
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

            {addFormError && (
              <div
                className="pill-danger"
                style={{
                  display: "block",
                  marginBottom: 16,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                }}
              >
                {addFormError}
              </div>
            )}

            <form onSubmit={handleAddStaff}>
              {/* Photo Input (Camera or Upload) */}
              <PhotoCaptureInput
                photoUrl={addFormData.photoUrl || null}
                onChange={(url) =>
                  setAddFormData((prev) => ({ ...prev, photoUrl: url || "" }))
                }
                label="Staff Passport Photo (Camera or Upload)"
              />
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
                    value={addFormData.firstName}
                    onChange={(e) =>
                      setAddFormData((prev) => ({ ...prev, firstName: e.target.value }))
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
                    value={addFormData.lastName}
                    onChange={(e) =>
                      setAddFormData((prev) => ({ ...prev, lastName: e.target.value }))
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
                  value={addFormData.role}
                  onChange={(e) =>
                    setAddFormData((prev) => ({ ...prev, role: e.target.value }))
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
                    value={addFormData.phone}
                    onChange={(e) =>
                      setAddFormData((prev) => ({ ...prev, phone: e.target.value }))
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
                    value={addFormData.gender}
                    onChange={(e) =>
                      setAddFormData((prev) => ({ ...prev, gender: e.target.value }))
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
                  value={addFormData.notes}
                  onChange={(e) =>
                    setAddFormData((prev) => ({ ...prev, notes: e.target.value }))
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
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submittingAdd}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingAdd}
                >
                  {submittingAdd ? "Adding…" : "Add staff member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Member Modal */}
      {editingStaff && isAdmin && (
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
          aria-labelledby="modal-edit-title"
          onClick={() => {
            if (!submittingEdit) setEditingStaff(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 500,
              backgroundColor: "var(--color-surface)",
              maxHeight: "90vh",
              overflowY: "auto",
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
                  id="modal-edit-title"
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--color-ink)",
                  }}
                >
                  Edit staff member
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    marginTop: 2,
                  }}
                >
                  Modify information for {editingStaff.firstName} {editingStaff.lastName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
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

            {editFormError && (
              <div
                className="pill-danger"
                style={{
                  display: "block",
                  marginBottom: 16,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                }}
              >
                {editFormError}
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              {/* Photo Input (Camera or Upload) */}
              <PhotoCaptureInput
                photoUrl={editFormData.photoUrl || null}
                onChange={(url) =>
                  setEditFormData((prev) => ({ ...prev, photoUrl: url || "" }))
                }
                label="Staff Passport Photo (Camera or Upload)"
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label className="label" htmlFor="edit-firstName">
                    First name *
                  </label>
                  <input
                    id="edit-firstName"
                    className="input"
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="edit-lastName">
                    Last name *
                  </label>
                  <input
                    id="edit-lastName"
                    className="input"
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label" htmlFor="edit-role">
                  Role *
                </label>
                <input
                  id="edit-role"
                  className="input"
                  type="text"
                  required
                  list="staff-role-options"
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  placeholder="e.g. Teacher, Driver, Security"
                />
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
                  <label className="label" htmlFor="edit-phone">
                    Phone number
                  </label>
                  <input
                    id="edit-phone"
                    className="input"
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="edit-gender">
                    Gender
                  </label>
                  <select
                    id="edit-gender"
                    className="input"
                    value={editFormData.gender}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, gender: e.target.value }))
                    }
                  >
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label" htmlFor="edit-notes">
                  Notes
                </label>
                <input
                  id="edit-notes"
                  className="input"
                  type="text"
                  value={editFormData.notes}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
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
                  onClick={() => setEditingStaff(null)}
                  disabled={submittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingEdit}
                >
                  {submittingEdit ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && isAdmin && (
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
          aria-labelledby="modal-delete-title"
          onClick={() => {
            if (!submittingDelete) setDeletingStaff(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: "var(--color-surface)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: 16 }}>
              <h2
                id="modal-delete-title"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--color-danger-text)",
                  marginBottom: 6,
                }}
              >
                Remove staff member?
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                Are you sure you want to permanently remove{" "}
                <strong style={{ color: "var(--color-ink)" }}>
                  {deletingStaff.firstName} {deletingStaff.lastName}
                </strong>{" "}
                ({deletingStaff.role}) from the staff registry?
              </p>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>
                Tip: If this person is merely on leave or temporarily inactive, you can use{" "}
                <strong>Deactivate</strong> instead to preserve their historical records.
              </p>
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
                onClick={() => setDeletingStaff(null)}
                disabled={submittingDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  backgroundColor: "var(--color-danger-text)",
                  borderColor: "var(--color-danger-text)",
                  color: "#fff",
                }}
                onClick={handleConfirmDelete}
                disabled={submittingDelete}
              >
                {submittingDelete ? "Removing…" : "Confirm removal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
