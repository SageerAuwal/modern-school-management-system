"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import PosReceiptSlip from "../../components/PosReceiptSlip";
import OfficialBursaryInvoiceModal from "../../components/OfficialBursaryInvoiceModal";
import OnlinePaymentModal from "../../components/OnlinePaymentModal";
import ActionConfirmationModal from "../../components/ActionConfirmationModal";
import RejectPaymentModal from "../../components/RejectPaymentModal";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface Payment {
  id: string;
  amount: number;
  method: "CASH" | "PAYSTACK" | "BANK_DEPOSIT" | string;
  reference: string;
  status?: "PENDING" | "SUCCESS" | "FAILED" | string;
  createdAt: string;
  paidAt?: string | null;
  notes?: string | null;
}

interface InvoiceDetail {
  id: string;
  student: {
    id?: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string | null;
  };
  term?: {
    id?: string;
    name: string;
  } | null;
  feeStructure?: {
    feeType?: string;
    name?: string;
    amount?: number;
  } | null;
  items?: Array<{
    id?: string;
    name: string;
    amount: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  status: "UNPAID" | "PARTIAL" | "PAID" | "WAIVED" | "CANCELLED" | string;
  payments: Payment[];
  createdAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatNaira(amount: number) {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusPill(status?: string) {
  const normalized = status?.toUpperCase() ?? "UNPAID";
  switch (normalized) {
    case "PAID":
      return <span className="pill-success">Paid</span>;
    case "PARTIAL":
      return <span className="pill-warning">Partial</span>;
    case "UNPAID":
      return <span className="pill-danger">Unpaid</span>;
    case "WAIVED":
      return <span className="pill-info">Waived</span>;
    case "CANCELLED":
      return <span className="pill-neutral">Cancelled</span>;
    default:
      return <span className="pill-neutral">{status ?? "Unknown"}</span>;
  }
}

function InvoiceDetailSkeleton() {
  return (
    <div className="page" style={{ maxWidth: 840, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <div className="skeleton" style={{ width: 100, height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 220, height: 28 }} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div className="skeleton" style={{ width: 80, height: 12, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: 180, height: 22 }} />
          </div>
          <div
            className="skeleton"
            style={{ width: 70, height: 24, borderRadius: "var(--radius-pill-badge)" }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 16,
            paddingTop: 16,
            borderTop: "var(--border-width) solid var(--color-border)",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton" style={{ width: 70, height: 12, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: 110, height: 20 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "var(--border-width) solid var(--color-border)",
          }}
        >
          <div className="skeleton" style={{ width: 120, height: 18 }} />
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td><div className="skeleton" style={{ width: 90, height: 14 }} /></td>
                <td><div className="skeleton" style={{ width: 80, height: 14 }} /></td>
                <td>
                  <div
                    className="skeleton"
                    style={{ width: 60, height: 20, borderRadius: "var(--radius-pill-badge)" }}
                  />
                </td>
                <td><div className="skeleton" style={{ width: 140, height: 14 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const idParam = params?.id;
  const invoiceId = Array.isArray(idParam) ? idParam[0] : idParam;
  const { role, isAdmin } = useCurrentUser();
  const isBursar = role === "BURSAR";
  const canManage = isAdmin || isBursar;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment actions state
  const [showOfficialClearance, setShowOfficialClearance] = useState(false);
  const [showPosReceipt, setShowPosReceipt] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashMethod, setCashMethod] = useState<"CASH" | "BANK_DEPOSIT">("CASH");
  const [cashNotes, setCashNotes] = useState("");
  const [savingCash, setSavingCash] = useState(false);
  const [payError, setPayError] = useState("");
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);

  // 2-Step Confirmation States
  const [confirmTargetPayment, setConfirmTargetPayment] = useState<Payment | null>(null);
  const [rejectTargetPayment, setRejectTargetPayment] = useState<Payment | null>(null);
  const [confirmCashPayment, setConfirmCashPayment] = useState<{ amount: number; method: string; notes?: string } | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [isWaiveModalOpen, setIsWaiveModalOpen] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [submittingWaive, setSubmittingWaive] = useState(false);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/${invoiceId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Could not load invoice.");
        return;
      }
      setInvoice(data);
    } catch {
      setError("Network error. Could not load invoice.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const balance = invoice ? Math.max(0, invoice.totalAmount - invoice.paidAmount) : 0;
  const isNotPaid = Boolean(
    invoice &&
      invoice.status !== "PAID" &&
      invoice.status !== "CANCELLED" &&
      invoice.status !== "WAIVED" &&
      balance > 0
  );

  const shortId = invoice?.id
    ? invoice.id.slice(0, 8).toUpperCase()
    : typeof invoiceId === "string"
    ? invoiceId.slice(0, 8).toUpperCase()
    : "";

  const openCashModal = () => {
    if (!canManage) return;
    setPayError("");
    setCashAmount(balance > 0 ? String(balance) : "");
    setCashMethod("CASH");
    setCashNotes("");
    setIsCashModalOpen(true);
  };

  const handleCashFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    const numericAmount = parseFloat(cashAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setPayError("Enter a valid payment amount greater than zero.");
      return;
    }
    if (numericAmount > balance) {
      setPayError(`Amount cannot exceed the remaining balance of ${formatNaira(balance)}.`);
      return;
    }

    setIsCashModalOpen(false);
    setConfirmCashPayment({
      amount: numericAmount,
      method: cashMethod,
      notes: cashNotes.trim() || undefined,
    });
  };

  const handleConfirmCashExecution = async () => {
    if (!confirmCashPayment || !canManage) return;
    setSavingCash(true);
    setPayError("");

    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/${invoiceId}/pay/cash`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmCashPayment),
      });

      const data = await res.json();
      if (!res.ok) {
        setPayError(data.message ?? "Could not record payment.");
        return;
      }

      setConfirmCashPayment(null);
      setCashAmount("");
      setCashNotes("");
      await loadInvoice();
      setShowPosReceipt(true);
    } catch {
      setPayError("Network error. Please try again.");
    } finally {
      setSavingCash(false);
    }
  };

  const handleConfirmPaymentExecution = async () => {
    if (!confirmTargetPayment) return;
    const paymentId = confirmTargetPayment.id;
    setVerifyingPaymentId(paymentId);
    setPayError("");
    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/payments/${paymentId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.message || "Failed to confirm payment");
        return;
      }
      setConfirmTargetPayment(null);
      await loadInvoice();
    } catch {
      setPayError("Network error while confirming payment");
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const handleRejectPaymentExecution = async (reason: string) => {
    if (!rejectTargetPayment) return;
    const paymentId = rejectTargetPayment.id;
    setVerifyingPaymentId(paymentId);
    setPayError("");
    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/payments/${paymentId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || "Unverified by Bursary" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.message || "Failed to reject payment");
        return;
      }
      setRejectTargetPayment(null);
      await loadInvoice();
    } catch {
      setPayError("Network error while rejecting payment");
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const handleCancelInvoiceExecution = async () => {
    if (!canManage || !invoiceId) return;
    setSubmittingCancel(true);
    setPayError("");
    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/${invoiceId}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(data.message || "Failed to cancel invoice");
        return;
      }
      setIsCancelModalOpen(false);
      await loadInvoice();
    } catch {
      setPayError("Network error while cancelling invoice");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleWaiveInvoiceExecution = async () => {
    if (!isAdmin || !invoiceId) return;
    setSubmittingWaive(true);
    setPayError("");
    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/${invoiceId}/waive`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: waiveReason.trim() || "Administrative Board Fee Waiver" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(data.message || "Failed to waive fee");
        return;
      }
      setIsWaiveModalOpen(false);
      setWaiveReason("");
      await loadInvoice();
    } catch {
      setPayError("Network error while waiving fee");
    } finally {
      setSubmittingWaive(false);
    }
  };

  const studentName = invoice?.student
    ? `${invoice.student.firstName} ${invoice.student.lastName}`.trim()
    : "—";
  const termName = invoice?.term?.name ?? "—";
  const feeTypeName =
    invoice?.feeStructure?.feeType ??
    invoice?.feeStructure?.name ??
    invoice?.items?.[0]?.name ??
    "Tuition & Levies";

  if (loading) {
    return <InvoiceDetailSkeleton />;
  }

  if (error || !invoice) {
    return (
      <div className="page" style={{ maxWidth: 840, margin: "0 auto" }}>
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to fees
            </Link>
            <h1 className="page-title">Invoice</h1>
          </div>
        </div>

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
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="empty-state-title">Invoice not found</h3>
          <p className="empty-state-text">
            {error || "The requested invoice could not be located. Return to the fees list to choose an invoice."}
          </p>
          <Link href="/fees" className="btn btn-secondary">
            Return to fees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 840, margin: "0 auto" }}>
      {/* 1. Page Header */}
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to fees
          </Link>
          <h1 className="page-title">Invoice #{shortId}</h1>
          <p className="page-subtitle">Issued on {formatDate(invoice.createdAt)}</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowOfficialClearance(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#0B2545",
              borderColor: "#0B2545",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Official Clearance Certificate
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowPosReceipt(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Treasury Receipt Slip
          </button>

          {isNotPaid && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsOnlineModalOpen(true)}
                style={{ backgroundColor: "var(--color-brand-teal, #0E7D75)", fontWeight: 700 }}
              >
                Submit Payment (Manual Transfer / Paystack)
              </button>

              {canManage && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={openCashModal}
                  >
                    Record counter payment
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsCancelModalOpen(true)}
                    style={{ color: "var(--color-danger-text)" }}
                  >
                    Cancel Invoice
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsWaiveModalOpen(true)}
                    >
                      Waive Fee
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {searchParams.get("paid") === "1" && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            backgroundColor: "var(--color-success-bg)",
            color: "var(--color-success-text)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Payment received. The invoice records have been updated.
        </div>
      )}

      {payError && !isCashModalOpen && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            backgroundColor: "var(--color-danger-bg)",
            color: "var(--color-danger-text)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {payError}
        </div>
      )}

      {/* 2. Summary Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <span className="stat-label" style={{ display: "block", marginBottom: 4 }}>
              Student Name
            </span>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              {studentName}
            </div>
            {invoice.student?.admissionNumber && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  fontFamily: "monospace",
                  marginTop: 4,
                }}
              >
                {invoice.student.admissionNumber}
              </p>
            )}
          </div>
          <div>{getStatusPill(invoice.status)}</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 16,
            paddingTop: 16,
            borderTop: "var(--border-width) solid var(--color-border)",
          }}
        >
          <div>
            <div className="stat-label">Term</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-ink)" }}>
              {termName}
            </div>
          </div>
          <div>
            <div className="stat-label">Fee Type</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-ink)" }}>
              {feeTypeName}
            </div>
          </div>
          <div>
            <div className="stat-label">Total Amount</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>
              {formatNaira(invoice.totalAmount)}
            </div>
          </div>
          <div>
            <div className="stat-label">Paid Amount</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-success-text)" }}>
              {formatNaira(invoice.paidAmount)}
            </div>
          </div>
          <div>
            <div className="stat-label">Balance</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: balance > 0 ? "var(--color-danger-text)" : "var(--color-ink)",
              }}
            >
              {formatNaira(balance)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Payments Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        <div
          style={{
            padding: "16px 18px 12px 18px",
            borderBottom: "var(--border-width) solid var(--color-border)",
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Payments
          </h2>
        </div>

        {invoice.payments && invoice.payments.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Status</th>
                  {canManage && <th>Bursary Verification</th>}
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => {
                  const isPending = (payment.status || "").toUpperCase() === "PENDING";
                  const isSuccess = (payment.status || "").toUpperCase() === "SUCCESS";
                  const isFailed = (payment.status || "").toUpperCase() === "FAILED";

                  return (
                    <tr key={payment.id}>
                      <td style={{ color: "var(--color-text-secondary)" }}>
                        {formatDate(payment.paidAt || payment.createdAt)}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                        {formatNaira(payment.amount)}
                      </td>
                      <td>
                        <span className="pill-neutral">{payment.method}</span>
                      </td>
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {payment.reference}
                      </td>
                      <td>
                        {isPending ? (
                          <span className="pill pill-warning" style={{ fontSize: 11, fontWeight: 700 }}>
                            Awaiting Bursary Verification
                          </span>
                        ) : isSuccess ? (
                          <span className="pill pill-success" style={{ fontSize: 11, fontWeight: 700 }}>
                            Verified &amp; Cleared
                          </span>
                        ) : (
                          <span className="pill pill-danger" style={{ fontSize: 11, fontWeight: 700 }}>
                            Rejected
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td>
                          {isPending ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: "4px 10px", fontSize: 11, backgroundColor: "#059669", color: "#ffffff" }}
                                disabled={verifyingPaymentId === payment.id}
                                onClick={() => setConfirmTargetPayment(payment)}
                              >
                                {verifyingPaymentId === payment.id ? "Confirming..." : "Confirm & Clear"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: "4px 10px", fontSize: 11, color: "var(--color-danger-text)" }}
                                disabled={verifyingPaymentId === payment.id}
                                onClick={() => setRejectTargetPayment(payment)}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                              {isSuccess ? "Cleared into school revenue" : "Rejected submission"}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "40px 24px" }}>
            <div
              className="empty-state-icon"
              style={{ display: "inline-flex", justifyContent: "center" }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="10" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <h3 className="empty-state-title">No payments recorded yet</h3>
            <p className="empty-state-text">
              Record a counter payment or submit a bank transfer to clear this invoice balance.
            </p>
            {isNotPaid && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsOnlineModalOpen(true)}
                  style={{ backgroundColor: "var(--color-brand-teal, #0E7D75)" }}
                >
                  Submit Payment (Bank Transfer / Paystack)
                </button>
                {canManage && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={openCashModal}
                  >
                    Record counter payment
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Action Buttons if not PAID */}
      {isNotPaid && (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            paddingTop: 4,
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsOnlineModalOpen(true)}
            style={{ backgroundColor: "var(--color-brand-teal, #0E7D75)" }}
          >
            Submit Payment (Bank Transfer / Paystack)
          </button>
          {canManage && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={openCashModal}
            >
              Record counter payment
            </button>
          )}
        </div>
      )}

      {/* Cash Payment Dialog */}
      {isCashModalOpen && canManage && (
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
          aria-labelledby="cash-payment-title"
          onClick={() => {
            if (!savingCash) setIsCashModalOpen(false);
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  id="cash-payment-title"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--color-ink)",
                    margin: 0,
                  }}
                >
                  Record counter payment
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    marginTop: 2,
                    marginBottom: 0,
                  }}
                >
                  Current invoice balance: {formatNaira(balance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCashModalOpen(false)}
                disabled={savingCash}
                aria-label="Close dialog"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                  padding: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="18"
                  height="18"
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

            {payError && (
              <div
                style={{
                  marginBottom: 14,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                  backgroundColor: "var(--color-danger-bg)",
                  color: "var(--color-danger-text)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {payError}
              </div>
            )}

            <form onSubmit={handleCashFormSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="label" htmlFor="cash-amount">
                    Amount (₦)
                  </label>
                  <input
                    id="cash-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    max={balance}
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="input"
                    placeholder={`Max ${formatNaira(balance)}`}
                    required
                    disabled={savingCash}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="cash-method">
                    Payment Method
                  </label>
                  <select
                    id="cash-method"
                    value={cashMethod}
                    onChange={(e) =>
                      setCashMethod(e.target.value as "CASH" | "BANK_DEPOSIT")
                    }
                    className="input"
                    disabled={savingCash}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_DEPOSIT">Bank Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="cash-notes">
                    Notes / Reference (Optional)
                  </label>
                  <input
                    id="cash-notes"
                    type="text"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    placeholder="Bank teller number or receipt note"
                    className="input"
                    disabled={savingCash}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsCashModalOpen(false)}
                    disabled={savingCash}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingCash}
                  >
                    Proceed to Confirm
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official A4 Institutional Clearance Certificate Modal */}
      {showOfficialClearance && invoice && (
        <OfficialBursaryInvoiceModal
          invoice={invoice}
          onClose={() => setShowOfficialClearance(false)}
        />
      )}

      {/* Thermal POS / ATM Receipt Slip Modal */}
      {showPosReceipt && invoice && (
        <PosReceiptSlip
          invoice={invoice}
          onClose={() => setShowPosReceipt(false)}
        />
      )}

      {/* Online Payment Modal */}
      {isOnlineModalOpen && invoice && (
        <OnlinePaymentModal
          isOpen={isOnlineModalOpen}
          onClose={() => setIsOnlineModalOpen(false)}
          invoice={{
            id: invoice.id,
            totalAmount: invoice.totalAmount,
            paidAmount: invoice.paidAmount,
            status: invoice.status,
            term: invoice.term,
            student: invoice.student,
          }}
          onSuccess={() => {
            loadInvoice();
          }}
        />
      )}

      {/* 2-Step Confirmation: Confirm Pending Payment */}
      {confirmTargetPayment && (
        <ActionConfirmationModal
          isOpen={Boolean(confirmTargetPayment)}
          title="Confirm & Clear Payment Submission"
          message="Verify the bank transfer details below against the school bank statement before confirming this payment."
          confirmText="Confirm & Clear Funds"
          confirmVariant="success"
          isProcessing={verifyingPaymentId === confirmTargetPayment.id}
          onConfirm={handleConfirmPaymentExecution}
          onCancel={() => setConfirmTargetPayment(null)}
          details={[
            { label: "Invoice ID", value: `#${shortId}` },
            { label: "Student Name", value: studentName },
            { label: "Payment Reference", value: confirmTargetPayment.reference, highlight: true },
            { label: "Payment Method", value: confirmTargetPayment.method },
            { label: "Amount to Clear", value: formatNaira(confirmTargetPayment.amount), highlight: true },
          ]}
          warningNote="Confirming will officially clear these funds into the school treasury, credit the student invoice balance, and authorize official A4 clearance printing."
        />
      )}

      {/* Rejection Modal for Pending Payment */}
      {rejectTargetPayment && (
        <RejectPaymentModal
          isOpen={Boolean(rejectTargetPayment)}
          onClose={() => setRejectTargetPayment(null)}
          onConfirm={handleRejectPaymentExecution}
          isProcessing={verifyingPaymentId === rejectTargetPayment.id}
          paymentDetails={{
            studentName,
            amount: rejectTargetPayment.amount,
            reference: rejectTargetPayment.reference,
            method: rejectTargetPayment.method,
          }}
        />
      )}

      {/* 2-Step Confirmation: Counter Payment */}
      {confirmCashPayment && (
        <ActionConfirmationModal
          isOpen={Boolean(confirmCashPayment)}
          title="Confirm Counter Payment Posting"
          message="Verify the counter collection receipt details below before posting."
          confirmText="Confirm & Post Payment"
          confirmVariant="primary"
          isProcessing={savingCash}
          onConfirm={handleConfirmCashExecution}
          onCancel={() => setConfirmCashPayment(null)}
          details={[
            { label: "Student Name", value: studentName },
            { label: "Invoice ID", value: `#${shortId}` },
            { label: "Payment Method", value: confirmCashPayment.method },
            { label: "Amount Received", value: formatNaira(confirmCashPayment.amount), highlight: true },
            { label: "Remarks / Reference", value: confirmCashPayment.notes || "Direct counter payment" },
          ]}
          warningNote="This transaction will immediately credit the invoice balance and update the active cashier drawer audit trail."
        />
      )}

      {/* 2-Step Confirmation: Invoice Cancellation */}
      {isCancelModalOpen && (
        <ActionConfirmationModal
          isOpen={isCancelModalOpen}
          title="Confirm Invoice Cancellation"
          message="Are you sure you want to cancel this student fee invoice?"
          confirmText="Confirm & Cancel Invoice"
          confirmVariant="danger"
          isProcessing={submittingCancel}
          onConfirm={handleCancelInvoiceExecution}
          onCancel={() => setIsCancelModalOpen(false)}
          details={[
            { label: "Invoice ID", value: `#${shortId}` },
            { label: "Student Name", value: studentName },
            { label: "Outstanding Balance", value: formatNaira(balance), highlight: true },
          ]}
          warningNote="Cancelling this invoice will permanently mark it as CANCELLED in the billing records and prevent any further payments against it."
        />
      )}

      {/* Fee Waiver Modal with 2-Step Confirmation */}
      {isWaiveModalOpen && (
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
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: 440, backgroundColor: "var(--color-surface)" }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "var(--color-ink)" }}>
              Waive Student Fee Balance
            </h3>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 14px" }}>
              Provide the official administrative board resolution or reason for waiving this fee invoice.
            </p>
            <div style={{ marginBottom: 14 }}>
              <label className="label" htmlFor="waive-reason">
                Official Waiver Justification
              </label>
              <textarea
                id="waive-reason"
                rows={3}
                className="input"
                style={{ width: "100%", resize: "vertical" }}
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="e.g. Full Academic Scholarship Award / Executive Council Discretion"
                required
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsWaiveModalOpen(false)}
                disabled={submittingWaive}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: "#D97706", borderColor: "#D97706" }}
                disabled={submittingWaive || !waiveReason.trim()}
                onClick={handleWaiveInvoiceExecution}
              >
                {submittingWaive ? "Processing..." : "Confirm Fee Waiver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={<InvoiceDetailSkeleton />}>
      <InvoiceDetailContent />
    </Suspense>
  );
}
