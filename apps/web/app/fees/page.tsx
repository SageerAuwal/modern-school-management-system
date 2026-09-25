"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PosReceiptSlip from "../components/PosReceiptSlip";
import ActionConfirmationModal from "../components/ActionConfirmationModal";
import RejectPaymentModal from "../components/RejectPaymentModal";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface PendingPaymentItem {
  id: string;
  amount: number;
  method: string;
  reference: string;
  createdAt: string;
  notes?: string | null;
  invoice: {
    id: string;
    totalAmount: number;
    paidAmount: number;
    student?: {
      firstName: string;
      lastName: string;
      admissionNumber?: string | null;
    } | null;
    term?: {
      name: string;
    } | null;
  };
}

interface Student {
  firstName: string;
  lastName: string;
  admissionNumber?: string | null;
}

interface Term {
  name: string;
}

interface FeeStructure {
  feeType?: string;
  name?: string;
}

interface InvoiceItem {
  id?: string;
  name: string;
  amount: number;
}

interface Invoice {
  id: string;
  student?: Student;
  term?: Term | null;
  feeStructure?: FeeStructure | null;
  items?: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate?: string | null;
  createdAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function renderStatusPill(status: string) {
  const normalized = (status || "").toUpperCase();
  switch (normalized) {
    case "PAID":
      return <span className="pill-success">Paid</span>;
    case "PARTIAL":
      return <span className="pill-warning">Partial</span>;
    case "UNPAID":
      return <span className="pill-danger">Unpaid</span>;
    case "CANCELLED":
      return <span className="pill-neutral">Cancelled</span>;
    case "WAIVED":
      return <span className="pill-info">Waived</span>;
    default:
      return <span className="pill-neutral">{status || "—"}</span>;
  }
}

function getFeeType(invoice: Invoice): string {
  if (invoice.feeStructure?.feeType) {
    return invoice.feeStructure.feeType;
  }
  if (invoice.feeStructure?.name) {
    return invoice.feeStructure.name;
  }
  if (invoice.items && invoice.items.length > 0) {
    return invoice.items.map((item) => item.name).join(", ");
  }
  return "—";
}

export default function FeesPage() {
  const router = useRouter();
  const { isAdmin, isBursar, isParent } = useCurrentUser();
  const canManageFees = isAdmin || isBursar;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentItem[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [confirmTargetPayment, setConfirmTargetPayment] = useState<PendingPaymentItem | null>(null);
  const [rejectTargetPayment, setRejectTargetPayment] = useState<PendingPaymentItem | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<Invoice | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const resInv = await fetch(`${API}/api/v1/fees/invoices`, { credentials: "include" });
      if (resInv.ok) {
        const data = await resInv.json();
        if (Array.isArray(data)) setInvoices(data);
      } else {
        const err = await resInv.json();
        setError(err.message || "Failed to load invoices");
      }

      if (canManageFees) {
        const resPend = await fetch(`${API}/api/v1/fees/invoices/payments/pending`, { credentials: "include" });
        if (resPend.ok) {
          const pendData = await resPend.json();
          if (Array.isArray(pendData)) setPendingPayments(pendData);
        }
      }
    } catch {
      setError("Network error while loading fees data");
    } finally {
      setLoading(false);
    }
  }, [canManageFees]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const executeConfirmPayment = async () => {
    if (!confirmTargetPayment) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/payments/${confirmTargetPayment.id}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setConfirmTargetPayment(null);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to confirm payment");
      }
    } catch {
      alert("Network error while confirming payment");
    } finally {
      setActionProcessing(false);
    }
  };

  const executeRejectPayment = async (reason: string) => {
    if (!rejectTargetPayment) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/payments/${rejectTargetPayment.id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setRejectTargetPayment(null);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to reject payment");
      }
    } catch {
      alert("Network error while rejecting payment");
    } finally {
      setActionProcessing(false);
    }
  };

  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + (inv.totalAmount || 0),
    0
  );
  const totalCollected = invoices.reduce(
    (sum, inv) => sum + (inv.paidAmount || 0),
    0
  );
  const totalOutstanding = invoices.reduce((sum, inv) => {
    const bal = (inv.totalAmount || 0) - (inv.paidAmount || 0);
    return sum + (bal > 0 ? bal : 0);
  }, 0);
  const overdueCount = invoices.filter((inv) => {
    const normalized = (inv.status || "").toUpperCase();
    if (
      normalized === "PAID" ||
      normalized === "CANCELLED" ||
      normalized === "WAIVED"
    ) {
      return false;
    }
    const bal = (inv.totalAmount || 0) - (inv.paidAmount || 0);
    if (bal <= 0) return false;
    if (!inv.dueDate) return false;
    return new Date(inv.dueDate).getTime() < Date.now();
  }).length;

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{isParent ? "Fees & Receipts" : "Fees"}</h1>
          <p className="page-subtitle">
            {isParent
              ? "Official school fee statements, payment records, and printable receipts for your wards."
              : `${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}`}
          </p>
        </div>
        {isAdmin && (
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/fees/structures" className="btn btn-secondary">
              Fee structures
            </Link>
            <Link href="/fees/new" className="btn btn-primary">
              Create invoice
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="card">
          <div className="stat-label">Total Invoiced</div>
          <div className="stat-value">
            {loading ? "—" : formatNaira(totalInvoiced)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value">
            {loading ? "—" : formatNaira(totalCollected)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value">
            {loading ? "—" : formatNaira(totalOutstanding)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Overdue Count</div>
          <div className="stat-value">{loading ? "—" : overdueCount}</div>
        </div>
      </div>

      {/* Bursary Verification Queue Banner (Admin/Bursar only) */}
      {canManageFees && pendingPayments.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: "16px 20px",
            borderRadius: "var(--radius-control, 12px)",
            backgroundColor: "#FEF3C7",
            border: "1px solid #FCD34D",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: "#92400E", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Bursary Payment Verification Required</span>
              <span style={{ backgroundColor: "#D97706", color: "#FFFFFF", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>
                {pendingPayments.length} Pending
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#B45309", marginTop: 4 }}>
              {pendingPayments.length} submitted parent/student payment(s) require Bursary verification before reflecting in school collected revenue.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ backgroundColor: "#D97706", borderColor: "#B45309", fontWeight: 700, fontSize: 12 }}
            onClick={() => setShowPendingModal(true)}
          >
            Review &amp; Verify Payments
          </button>
        </div>
      )}

      {/* Error Notification */}
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

      {/* Table / Skeleton / Empty State */}
      {loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Term</th>
                  <th>Fee Type</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Slip</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td>
                      <div
                        className="skeleton"
                        style={{ height: 16, width: "70%" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton"
                        style={{ height: 16, width: "60%" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton"
                        style={{ height: 16, width: "50%" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton"
                        style={{ height: 16, width: "60%" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton"
                        style={{ height: 16, width: "60%" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton"
                        style={{ height: 16, width: "60%" }}
                      />
                    </td>
                    <td>
                      <div
                        className="skeleton"
                        style={{
                          height: 20,
                          width: 64,
                          borderRadius: "var(--radius-pill-badge)",
                        }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        className="skeleton"
                        style={{
                          height: 24,
                          width: 60,
                          borderRadius: "var(--radius-control)",
                          margin: "0 auto",
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="card empty-state">
          <div
            className="empty-state-icon"
            style={{ display: "inline-flex", justifyContent: "center" }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <h3 className="empty-state-title">{isParent ? "No fee records yet" : "No invoices yet"}</h3>
          <p className="empty-state-text">
            {isParent
              ? "No fee invoices have been issued for your registered wards."
              : "Create fee structures first, then generate invoices for students."}
          </p>
          {isAdmin && (
            <div
              style={{
                display: "inline-flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/fees/structures" className="btn btn-secondary">
                Fee structures
              </Link>
              <Link href="/fees/new" className="btn btn-primary">
                Create invoice
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Term</th>
                  <th>Fee Type</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Slip</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const studentName = invoice.student
                    ? `${invoice.student.firstName} ${invoice.student.lastName}`.trim()
                    : "—";
                  const balance =
                    (invoice.totalAmount || 0) - (invoice.paidAmount || 0);

                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => router.push(`/fees/${invoice.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        style={{
                          fontWeight: 600,
                          color: "var(--color-ink)",
                        }}
                      >
                        <Link
                          href={`/fees/${invoice.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {studentName}
                        </Link>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>
                        {invoice.term?.name ?? "—"}
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>
                        {getFeeType(invoice)}
                      </td>
                      <td
                        style={{
                          fontWeight: 500,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatNaira(invoice.totalAmount)}
                      </td>
                      <td
                        style={{
                          fontWeight: 500,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatNaira(invoice.paidAmount)}
                      </td>
                      <td
                        style={{
                          fontWeight: 500,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatNaira(Math.max(0, balance))}
                      </td>
                      <td>{renderStatusPill(invoice.status)}</td>
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptInvoice(invoice)}
                          className="btn btn-secondary"
                          style={{
                            padding: "4px 10px",
                            fontSize: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                          title="Print POS Thermal Receipt"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                          </svg>
                          POS Slip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bursary Pending Payments Verification Queue Modal */}
      {showPendingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
          onClick={() => setShowPendingModal(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 780,
              backgroundColor: "var(--color-surface, #ffffff)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)", margin: 0 }}>
                  Bursary Payment Verification Queue
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
                  Verify and clear submitted parent and student fee payments into official school revenue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {pendingPayments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-secondary)", fontSize: 13 }}>
                No pending payments awaiting verification.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Term</th>
                      <th>Amount</th>
                      <th>Reference</th>
                      <th>Submitted</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.invoice.student ? `${p.invoice.student.firstName} ${p.invoice.student.lastName}` : "Student"}</strong>
                          {p.invoice.student?.admissionNumber && (
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                              {p.invoice.student.admissionNumber}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 12 }}>{p.invoice.term?.name || "Term"}</td>
                        <td style={{ fontWeight: 700, color: "var(--color-ink)" }}>{formatNaira(p.amount)}</td>
                        <td style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-text-secondary)" }}>
                          {p.reference}
                        </td>
                        <td style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                          {new Date(p.createdAt).toLocaleDateString("en-GB")}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: "4px 10px", fontSize: 11, backgroundColor: "#059669", color: "#ffffff" }}
                              onClick={() => setConfirmTargetPayment(p)}
                            >
                              Confirm &amp; Clear
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: "4px 10px", fontSize: 11, color: "var(--color-danger-text)" }}
                              onClick={() => setRejectTargetPayment(p)}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POS / ATM Thermal Receipt Modal */}
      {selectedReceiptInvoice && (
        <PosReceiptSlip
          invoice={selectedReceiptInvoice}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}

      {/* Action Confirmation Modal for Payment Acceptance */}
      <ActionConfirmationModal
        isOpen={Boolean(confirmTargetPayment)}
        title="Confirm & Verify Payment Submission"
        message="You are about to verify this payment submission and officially credit the student's fee invoice."
        warningNote="This action verifies the credit against school accounts, generates an official receipt, and updates the student ledger. This action is permanently audited."
        confirmVariant="success"
        confirmText="Verify &amp; Credit Account"
        cancelText="Cancel"
        isProcessing={actionProcessing}
        onCancel={() => setConfirmTargetPayment(null)}
        onConfirm={executeConfirmPayment}
        details={
          confirmTargetPayment
            ? [
                {
                  label: "Student",
                  value: confirmTargetPayment.invoice.student
                    ? `${confirmTargetPayment.invoice.student.firstName} ${confirmTargetPayment.invoice.student.lastName}`
                    : "Student",
                },
                {
                  label: "Admission No",
                  value: confirmTargetPayment.invoice.student?.admissionNumber || "—",
                },
                {
                  label: "Payment Amount",
                  value: formatNaira(confirmTargetPayment.amount),
                  highlight: true,
                },
                {
                  label: "Channel / Method",
                  value: confirmTargetPayment.method?.replace(/_/g, " ") || "Online",
                },
                {
                  label: "Submission Reference",
                  value: confirmTargetPayment.reference,
                },
                {
                  label: "Term",
                  value: confirmTargetPayment.invoice.term?.name || "Term",
                },
              ]
            : []
        }
      />

      {/* Reject Payment Reason Modal */}
      <RejectPaymentModal
        isOpen={Boolean(rejectTargetPayment)}
        onClose={() => setRejectTargetPayment(null)}
        onConfirm={executeRejectPayment}
        isProcessing={actionProcessing}
        paymentDetails={
          rejectTargetPayment
            ? {
                studentName: rejectTargetPayment.invoice.student
                  ? `${rejectTargetPayment.invoice.student.firstName} ${rejectTargetPayment.invoice.student.lastName}`
                  : "Student",
                admissionNumber: rejectTargetPayment.invoice.student?.admissionNumber || "—",
                amount: rejectTargetPayment.amount,
                reference: rejectTargetPayment.reference,
                method: rejectTargetPayment.method,
              }
            : null
        }
      />
    </div>
  );
}
