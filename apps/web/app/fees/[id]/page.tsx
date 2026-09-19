"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import PosReceiptSlip from "../../components/PosReceiptSlip";
import OnlinePaymentModal from "../../components/OnlinePaymentModal";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface Payment {
  id: string;
  amount: number;
  method: "CASH" | "PAYSTACK" | "BANK_DEPOSIT" | string;
  reference: string;
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
  const { isAdmin } = useCurrentUser();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment actions state
  const [showPosReceipt, setShowPosReceipt] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashMethod, setCashMethod] = useState<"CASH" | "BANK_DEPOSIT">("CASH");
  const [cashNotes, setCashNotes] = useState("");
  const [savingCash, setSavingCash] = useState(false);
  const [submittingPaystack, setSubmittingPaystack] = useState(false);
  const [payError, setPayError] = useState("");
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);

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
    if (!isAdmin) return;
    setPayError("");
    setCashAmount(balance > 0 ? String(balance) : "");
    setCashMethod("CASH");
    setCashNotes("");
    setIsCashModalOpen(true);
  };

  const handleRecordCashPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;
    const numericAmount = parseFloat(cashAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setPayError("Enter a valid payment amount greater than zero.");
      return;
    }
    if (numericAmount > balance) {
      setPayError(`Amount cannot exceed the remaining balance of ${formatNaira(balance)}.`);
      return;
    }

    setSavingCash(true);
    setPayError("");

    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/${invoiceId}/pay/cash`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          method: cashMethod,
          notes: cashNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPayError(data.message ?? "Could not record payment.");
        return;
      }

      setIsCashModalOpen(false);
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

  const handlePaystack = async () => {
    if (!invoiceId) return;
    setSubmittingPaystack(true);
    setPayError("");

    try {
      const callbackUrl = `${window.location.origin}/fees/${invoiceId}?paid=1`;
      const res = await fetch(`${API}/api/v1/fees/invoices/${invoiceId}/pay/paystack`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPayError(data.message ?? "Could not initiate Paystack payment.");
        return;
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setPayError("Paystack payment link not received.");
      }
    } catch {
      setPayError("Network error. Please try again.");
    } finally {
      setSubmittingPaystack(false);
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
            Print POS Slip
          </button>

          {isNotPaid && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsOnlineModalOpen(true)}
                style={{ backgroundColor: "var(--color-brand-teal, #0E7D75)", fontWeight: 700 }}
              >
                Pay Online (Card / Transfer)
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={openCashModal}
                >
                  Record cash payment
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePaystack}
                disabled={submittingPaystack}
              >
                {submittingPaystack ? "Connecting..." : "Pay via Paystack"}
              </button>
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
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
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
                  </tr>
                ))}
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
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <h3 className="empty-state-title">No payments recorded yet</h3>
            <p className="empty-state-text">
              Record a cash payment or initiate an online transaction to clear this invoice balance.
            </p>
            {isNotPaid && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openCashModal}
                  >
                    Record cash payment
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePaystack}
                  disabled={submittingPaystack}
                >
                  {submittingPaystack ? "Connecting..." : "Pay via Paystack"}
                </button>
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
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCashModal}
            >
              Record cash payment
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePaystack}
            disabled={submittingPaystack}
          >
            {submittingPaystack ? "Connecting..." : "Pay via Paystack"}
          </button>
        </div>
      )}

      {/* Cash Payment Dialog */}
      {isCashModalOpen && isAdmin && (
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
                  Record cash payment
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

            <form onSubmit={handleRecordCashPayment}>
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
                    {savingCash ? "Recording payment..." : "Record payment"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
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
