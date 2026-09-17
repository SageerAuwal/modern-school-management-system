"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber?: string | null;
  enrollments?: Array<{
    classSection?: {
      name: string;
      level: string;
    };
  }>;
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
  academicYear: string;
  termId?: string | null;
}

interface SelectedItem {
  feeStructureId?: string;
  name: string;
  amount: number;
}

function formatNaira(amount: number) {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function NewInvoicePage() {
  const router = useRouter();

  // Mode: single student vs entire class
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // Options data
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructureItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form states
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [classSectionId, setClassSectionId] = useState("");
  const [termId, setTermId] = useState("");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Items selection
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemAmount, setCustomItemAmount] = useState("");

  // Status & submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      setLoadingInitial(true);
      try {
        const [resStudents, resClasses, resTerms, resStructures] = await Promise.all([
          fetch(`${API}/api/v1/students`, { credentials: "include" }),
          fetch(`${API}/api/v1/classes`, { credentials: "include" }),
          fetch(`${API}/api/v1/terms`, { credentials: "include" }),
          fetch(`${API}/api/v1/fees/structures`, { credentials: "include" }),
        ]);

        if (resStudents.ok) {
          const sData = await resStudents.json();
          if (Array.isArray(sData)) {
            setStudents(sData);
            if (sData.length > 0) setStudentId(sData[0].id);
          }
        }

        if (resClasses.ok) {
          const cData = await resClasses.json();
          if (Array.isArray(cData)) {
            setClasses(cData);
            if (cData.length > 0) setClassSectionId(cData[0].id);
          }
        }

        if (resTerms.ok) {
          const tData = await resTerms.json();
          if (Array.isArray(tData)) {
            setTerms(tData);
            const cur = tData.find((t: TermOption) => t.isCurrent);
            if (cur) {
              setTermId(cur.id);
            } else if (tData.length > 0) {
              setTermId(tData[0].id);
            }
          }
        }

        if (resStructures.ok) {
          const fData = await resStructures.json();
          if (Array.isArray(fData)) {
            setFeeStructures(fData);
            // Pre-select all active fee structures by default
            setSelectedItems(
              fData.map((f: FeeStructureItem) => ({
                feeStructureId: f.id,
                name: f.name,
                amount: Number(f.amount),
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load invoice initial data", err);
        setError("Failed to load required data. Please check connection.");
      } finally {
        setLoadingInitial(false);
      }
    }

    loadData();
  }, []);

  // Filtered students for quick search
  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const adm = (s.admissionNumber || "").toLowerCase();
    return fullName.includes(q) || adm.includes(q);
  });

  // Toggle fee structure selection
  const handleToggleStructure = (structure: FeeStructureItem) => {
    const existingIndex = selectedItems.findIndex((it) => it.feeStructureId === structure.id);
    if (existingIndex >= 0) {
      setSelectedItems((prev) => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          feeStructureId: structure.id,
          name: structure.name,
          amount: Number(structure.amount),
        },
      ]);
    }
  };

  // Add custom fee item
  const handleAddCustomItem = () => {
    const name = customItemName.trim();
    const amt = parseFloat(customItemAmount);
    if (!name) {
      setError("Please enter an item name (e.g. Science Lab Fee).");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    setSelectedItems((prev) => [...prev, { name, amount: amt }]);
    setCustomItemName("");
    setCustomItemAmount("");
    setError("");
  };

  // Remove fee item
  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Change amount of fee item
  const handleUpdateItemAmount = (index: number, newAmount: number) => {
    setSelectedItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, amount: Math.max(0, newAmount) } : it))
    );
  };

  const totalAmount = selectedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Submit invoice generation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (selectedItems.length === 0) {
      setError("Please select or add at least one fee item for this invoice.");
      return;
    }

    if (totalAmount <= 0) {
      setError("Total invoice amount must be greater than zero.");
      return;
    }

    if (mode === "single" && !studentId) {
      setError("Please select a student.");
      return;
    }

    if (mode === "bulk" && !classSectionId) {
      setError("Please select a class section.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "single") {
        const payload = {
          studentId,
          termId: termId || undefined,
          academicYear,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
          items: selectedItems.map((it) => ({
            feeStructureId: it.feeStructureId,
            name: it.name,
            amount: it.amount,
          })),
        };

        const res = await fetch(`${API}/api/v1/fees/invoices`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? "Could not create invoice. Check details.");
          return;
        }

        setSuccessMessage("Invoice generated successfully! Redirecting...");
        setTimeout(() => {
          router.push(`/fees/${data.id}`);
        }, 1000);
      } else {
        // Bulk mode
        const payload = {
          classSectionId,
          termId: termId || undefined,
          academicYear,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          items: selectedItems.map((it) => ({
            feeStructureId: it.feeStructureId,
            name: it.name,
            amount: it.amount,
          })),
        };

        const res = await fetch(`${API}/api/v1/fees/invoices/bulk`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? "Could not generate bulk invoices.");
          return;
        }

        const count = data.invoices?.length ?? data.count ?? "All";
        setSuccessMessage(`Successfully generated ${count} invoices for the class! Redirecting to fees...`);
        setTimeout(() => {
          router.push("/fees");
        }, 1500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 860, margin: "0 auto" }}>
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
          <h1 className="page-title">Generate Fee Invoice</h1>
          <p className="page-subtitle">
            Issue school fee bills to individual students or generate invoices for an entire class at once.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="pill-danger"
          style={{
            display: "block",
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="pill-success"
          style={{
            display: "block",
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            marginBottom: 20,
            fontSize: 14,
            backgroundColor: "var(--color-success-bg)",
            color: "var(--color-success-text)",
          }}
        >
          {successMessage}
        </div>
      )}

      {loadingInitial ? (
        <div className="card" style={{ padding: 28, textAlign: "center" }}>
          <div className="skeleton" style={{ height: 24, width: 220, margin: "0 auto 16px" }} />
          <div className="skeleton" style={{ height: 16, width: 340, margin: "0 auto 24px" }} />
          <div className="skeleton" style={{ height: 44, width: "100%", maxWidth: 500, margin: "0 auto" }} />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* 1. Mode Selector */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "var(--color-ink)" }}>
              1. Invoicing Target
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  borderRadius: "var(--radius-control)",
                  border: `2px solid ${
                    mode === "single" ? "var(--color-brand)" : "var(--color-border)"
                  }`,
                  backgroundColor: mode === "single" ? "var(--color-brand-subtle, #f0f7ff)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="invoicing-mode"
                  checked={mode === "single"}
                  onChange={() => setMode("single")}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--color-ink)" }}>
                    Single Student
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    Generate an individual official invoice for one specific student.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  borderRadius: "var(--radius-control)",
                  border: `2px solid ${
                    mode === "bulk" ? "var(--color-brand)" : "var(--color-border)"
                  }`,
                  backgroundColor: mode === "bulk" ? "var(--color-brand-subtle, #f0f7ff)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="invoicing-mode"
                  checked={mode === "bulk"}
                  onChange={() => setMode("bulk")}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--color-ink)" }}>
                    Entire Class (Bulk Invoicing)
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    Generate invoices for all actively enrolled students in a chosen class in one click.
                  </div>
                </div>
              </label>
            </div>

            {/* Target Selectors */}
            <div style={{ marginTop: 18 }}>
              {mode === "single" ? (
                <div>
                  <label className="label" htmlFor="student-picker">
                    Select Student *
                  </label>
                  <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Filter by name or admission number..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <select
                    id="student-picker"
                    className="input"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                  >
                    {filteredStudents.length === 0 ? (
                      <option value="">No matching students found</option>
                    ) : (
                      filteredStudents.map((s) => {
                        const className = s.enrollments?.[0]?.classSection?.name;
                        return (
                          <option key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} ({s.admissionNumber || "No Adm No"})
                            {className ? ` — Class: ${className}` : ""}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label" htmlFor="class-picker">
                    Select Class Section *
                  </label>
                  <select
                    id="class-picker"
                    className="input"
                    value={classSectionId}
                    onChange={(e) => setClassSectionId(e.target.value)}
                    required
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.level})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 2. Academic Session & Term */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "var(--color-ink)" }}>
              2. Term & Session Details
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <label className="label" htmlFor="term-select">
                  Academic Term
                </label>
                <select
                  id="term-select"
                  className="input"
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                >
                  <option value="">Select term...</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isCurrent ? "(Current Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="academic-year">
                  Academic Session *
                </label>
                <input
                  id="academic-year"
                  type="text"
                  className="input"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2025/2026"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="due-date">
                  Payment Due Date (Optional)
                </label>
                <input
                  id="due-date"
                  type="date"
                  className="input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. Fee Items & Structures */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
                  3. Fee Structure Items
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
                  Select established school fees or add custom fee levies.
                </p>
              </div>
              <Link href="/fees/structures" className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}>
                Manage fee structures
              </Link>
            </div>

            {/* Existing Fee Structures Checkboxes */}
            {feeStructures.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 10,
                  marginBottom: 16,
                  padding: 12,
                  backgroundColor: "var(--color-surface-subtle, #f8f9fa)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                {feeStructures.map((f) => {
                  const isChecked = selectedItems.some((it) => it.feeStructureId === f.id);
                  return (
                    <label
                      key={f.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        backgroundColor: isChecked ? "var(--color-brand-subtle, #eef5fc)" : "var(--color-surface, #fff)",
                        borderRadius: "var(--radius-control)",
                        border: `1px solid ${isChecked ? "var(--color-brand)" : "var(--color-border)"}`,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleStructure(f)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                          {f.level ? `Level: ${f.level}` : "All levels"}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-ink)" }}>
                        {formatNaira(f.amount)}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Selected Fee Items Table */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--color-ink)" }}>
                Invoice Items Breakdown:
              </div>
              {selectedItems.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    border: "1px dashed var(--color-border)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  No fee items selected yet. Choose from above or add a custom fee below.
                </div>
              ) : (
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ width: 160 }}>Amount (₦)</th>
                      <th style={{ width: 60, textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td>
                          <input
                            type="number"
                            className="input"
                            min="0"
                            step="100"
                            value={item.amount}
                            onChange={(e) => handleUpdateItemAmount(idx, parseFloat(e.target.value) || 0)}
                            style={{ padding: "4px 8px", fontSize: 13 }}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{
                              border: "none",
                              background: "none",
                              color: "var(--color-danger-text, #e53e3e)",
                              cursor: "pointer",
                              padding: 4,
                            }}
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700, fontSize: 14 }}>
                      <td>TOTAL INVOICE AMOUNT</td>
                      <td style={{ color: "var(--color-brand)" }}>{formatNaira(totalAmount)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Add Custom Item Row */}
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
                padding: 12,
                backgroundColor: "var(--color-surface-subtle, #fafafa)",
                borderRadius: "var(--radius-control)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 2, minWidth: 160 }}>
                <label className="label" style={{ fontSize: 12 }}>
                  Add Custom Levy / Item Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Graduation Levy, Sports Fee..."
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label className="label" style={{ fontSize: 12 }}>
                  Amount (₦)
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  min="0"
                  value={customItemAmount}
                  onChange={(e) => setCustomItemAmount(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddCustomItem}
                style={{ height: 38 }}
              >
                + Add Item
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="card" style={{ marginBottom: 24 }}>
            <label className="label" htmlFor="invoice-notes">
              Invoice Remarks / Instructions (Optional)
            </label>
            <textarea
              id="invoice-notes"
              className="input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please make full payment on or before the due date to avoid exclusion."
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Link href="/fees" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || selectedItems.length === 0}
              style={{ minWidth: 200, display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8 }}
            >
              {submitting ? (
                "Generating..."
              ) : mode === "single" ? (
                `Generate Invoice (${formatNaira(totalAmount)})`
              ) : (
                `Generate Invoices for Entire Class`
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
