"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface FeeStructure {
  id: string;
  name: string;
  level?: string | null;
  academicYear: string;
  amount: number;
  description?: string | null;
  isActive: boolean;
  term?: {
    id: string;
    name: string;
  } | null;
}

interface TermOption {
  id: string;
  name: string;
  isCurrent?: boolean;
}

function formatNaira(amount: number) {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function FeeStructuresPage() {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    level: "",
    termId: "",
    academicYear: "2025/2026",
    amount: "",
    description: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resStructures, resTerms] = await Promise.all([
        fetch(`${API}/api/v1/fees/structures`, { credentials: "include" }),
        fetch(`${API}/api/v1/terms`, { credentials: "include" }),
      ]);

      if (resStructures.ok) {
        const sData = await resStructures.json();
        if (Array.isArray(sData)) setStructures(sData);
      }
      if (resTerms.ok) {
        const tData = await resTerms.json();
        if (Array.isArray(tData)) {
          setTerms(tData);
          const cur = tData.find((t: TermOption) => t.isCurrent);
          if (cur) setForm((f) => ({ ...f, termId: cur.id }));
        }
      }
    } catch {
      setError("Failed to load fee structures. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const numAmount = parseFloat(form.amount);
    if (!form.name.trim()) {
      setError("Please provide a name for this fee structure.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please specify a valid amount in Naira.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        level: form.level.trim() || undefined,
        termId: form.termId || undefined,
        academicYear: form.academicYear.trim(),
        amount: numAmount,
        description: form.description.trim() || undefined,
      };

      const res = await fetch(`${API}/api/v1/fees/structures`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Could not create fee structure.");
        return;
      }

      setSuccess(`Fee structure "${data.name}" added successfully.`);
      setIsModalOpen(false);
      setForm({
        name: "",
        level: "",
        termId: terms[0]?.id || "",
        academicYear: "2025/2026",
        amount: "",
        description: "",
      });
      await loadData();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate "${name}"?`)) return;

    try {
      const res = await fetch(`${API}/api/v1/fees/structures/${id}/deactivate`, {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) {
        setSuccess(`Deactivated fee structure "${name}".`);
        loadData();
      } else {
        const data = await res.json();
        setError(data.message ?? "Failed to deactivate fee structure.");
      }
    } catch {
      setError("Network error while trying to deactivate.");
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <Link
            href="/fees"
            style={{
              fontSize: 13,
              color: "var(--color-text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Fees
          </Link>
          <h1 className="page-title">Fee Structures</h1>
          <p className="page-subtitle">
            Configure default tuition fees, development levies, exam fees, and other charges.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            + Add Fee Structure
          </button>
        </div>
      </div>

      {error && (
        <div
          className="pill-danger"
          style={{
            display: "block",
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="pill-success"
          style={{
            display: "block",
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            marginBottom: 16,
            fontSize: 13,
            backgroundColor: "var(--color-success-bg)",
            color: "var(--color-success-text)",
          }}
        >
          {success}
        </div>
      )}

      {/* Structures Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Fee Name</th>
              <th>Applicable Level</th>
              <th>Term</th>
              <th>Academic Session</th>
              <th>Amount</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx}>
                  <td><div className="skeleton" style={{ width: 140, height: 16 }} /></td>
                  <td><div className="skeleton" style={{ width: 80, height: 16 }} /></td>
                  <td><div className="skeleton" style={{ width: 90, height: 16 }} /></td>
                  <td><div className="skeleton" style={{ width: 90, height: 16 }} /></td>
                  <td><div className="skeleton" style={{ width: 80, height: 16 }} /></td>
                  <td><div className="skeleton" style={{ width: 60, height: 20 }} /></td>
                  <td></td>
                </tr>
              ))
            ) : structures.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32 }}>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                    No fee structures defined yet. Click &quot;+ Add Fee Structure&quot; to set up tuition fees.
                  </div>
                </td>
              </tr>
            ) : (
              structures.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                    {s.name}
                    {s.description && (
                      <div style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-secondary)" }}>
                        {s.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="pill-neutral">
                      {s.level || "All Levels"}
                    </span>
                  </td>
                  <td>{s.term?.name || "All Terms"}</td>
                  <td>{s.academicYear}</td>
                  <td style={{ fontWeight: 700, color: "var(--color-ink)" }}>
                    {formatNaira(s.amount)}
                  </td>
                  <td>
                    {s.isActive ? (
                      <span className="pill-success">Active</span>
                    ) : (
                      <span className="pill-neutral">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {s.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(s.id, s.name)}
                        style={{
                          border: "none",
                          background: "none",
                          color: "var(--color-danger-text)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Fee Structure Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              backgroundColor: "var(--color-surface, #fff)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              borderRadius: "var(--radius-card)",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Add New Fee Structure
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="label" htmlFor="fee-name">
                    Fee Title / Description *
                  </label>
                  <input
                    id="fee-name"
                    type="text"
                    className="input"
                    placeholder="e.g. Tuition Fee, Development Levy, PTA Levy"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label" htmlFor="fee-amount">
                      Amount (₦) *
                    </label>
                    <input
                      id="fee-amount"
                      type="number"
                      step="100"
                      min="0"
                      className="input"
                      placeholder="e.g. 65000"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="fee-academic-year">
                      Academic Session *
                    </label>
                    <input
                      id="fee-academic-year"
                      type="text"
                      className="input"
                      placeholder="2025/2026"
                      value={form.academicYear}
                      onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label" htmlFor="fee-term">
                      Term (Optional)
                    </label>
                    <select
                      id="fee-term"
                      className="input"
                      value={form.termId}
                      onChange={(e) => setForm({ ...form, termId: e.target.value })}
                    >
                      <option value="">All Terms / Annual</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="fee-level">
                      Level (Optional)
                    </label>
                    <select
                      id="fee-level"
                      className="input"
                      value={form.level}
                      onChange={(e) => setForm({ ...form, level: e.target.value })}
                    >
                      <option value="">All Levels</option>
                      <option value="JSS1">JSS 1</option>
                      <option value="JSS2">JSS 2</option>
                      <option value="JSS3">JSS 3</option>
                      <option value="SS1">SS 1</option>
                      <option value="SS2">SS 2</option>
                      <option value="SS3">SS 3</option>
                      <option value="PRIMARY">Primary</option>
                      <option value="NURSERY">Nursery</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="fee-desc">
                    Description / Notes (Optional)
                  </label>
                  <input
                    id="fee-desc"
                    type="text"
                    className="input"
                    placeholder="e.g. Compulsory levy for school infrastructural development"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Creating..." : "Create Fee Structure"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
