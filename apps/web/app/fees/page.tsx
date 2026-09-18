"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PosReceiptSlip from "../components/PosReceiptSlip";
import { useCurrentUser } from "../hooks/useCurrentUser";

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
  const { isAdmin } = useCurrentUser();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    fetch(`${API}/api/v1/fees/invoices`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load invoices");
        }
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          if (Array.isArray(data)) {
            setInvoices(data);
            setError("");
          } else {
            setError(data.message ?? "Failed to load invoices");
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message ?? "Network error");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

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
          <h1 className="page-title">Fees</h1>
          <p className="page-subtitle">
            {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
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
          <h3 className="empty-state-title">No invoices yet</h3>
          <p className="empty-state-text">
            Create fee structures first, then generate invoices for students.
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

      {/* POS / ATM Thermal Receipt Modal */}
      {selectedReceiptInvoice && (
        <PosReceiptSlip
          invoice={selectedReceiptInvoice}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}
    </div>
  );
}
