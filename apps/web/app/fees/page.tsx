"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Invoice {
  id: string;
  totalAmount: number;
  paidAmount: number;
  status: "UNPAID" | "PARTIAL" | "PAID" | "WAIVED" | "CANCELLED";
  academicYear: string;
  dueDate: string | null;
  student: { id: string; firstName: string; lastName: string; admissionNumber: string | null };
  term: { id: string; name: string } | null;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  UNPAID:    { bg: "#fee2e2", color: "#991b1b", label: "Unpaid" },
  PARTIAL:   { bg: "#fef9c3", color: "#854d0e", label: "Partial" },
  PAID:      { bg: "#dcfce7", color: "#166534", label: "Paid" },
  WAIVED:    { bg: "#e0f2fe", color: "#075985", label: "Waived" },
  CANCELLED: { bg: "#f1f5f9", color: "#64748b", label: "Cancelled" },
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FeesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (yearFilter) params.set("academicYear", yearFilter);

    fetch(`${API}/api/v1/fees/invoices?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInvoices(data);
        else setError(data.message ?? "Failed to load invoices");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [statusFilter, yearFilter]);

  const totalOutstanding = invoices
    .filter((i) => ["UNPAID", "PARTIAL"].includes(i.status))
    .reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

  const totalCollected = invoices
    .reduce((sum, i) => sum + i.paidAmount, 0);

  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>Fee Management</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Invoices, payments & outstanding balances</p>
        </div>
        <Link href="/fees/new"
          style={{ padding: "9px 18px", backgroundColor: "var(--color-ink)", color: "#fff", borderRadius: "var(--radius-control)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
          + New Invoice
        </Link>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Invoiced", value: formatNaira(invoices.reduce((s, i) => s + i.totalAmount, 0)), bg: "#f8fafc" },
          { label: "Collected", value: formatNaira(totalCollected), bg: "#f0fdf4" },
          { label: "Outstanding", value: formatNaira(totalOutstanding), bg: "#fef2f2" },
          { label: "Total Invoices", value: invoices.length.toString(), bg: "#f0f9ff" },
        ].map((card) => (
          <div key={card.label} className="card" style={{ backgroundColor: card.bg }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 6 }}>{card.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)" }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, backgroundColor: "var(--color-surface)", color: "var(--color-ink)", outline: "none" }}>
          <option value="">All Statuses</option>
          {["UNPAID", "PARTIAL", "PAID", "WAIVED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="text" placeholder="Academic year e.g. 2025/2026" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, backgroundColor: "var(--color-surface)", color: "var(--color-ink)", outline: "none", width: 220 }} />
      </div>

      {error && <div className="pill-danger" style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {loading && <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading…</p>}

      {/* Invoices table */}
      {!loading && !error && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {invoices.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
              No invoices found. <Link href="/fees/new" style={{ color: "var(--color-ink)", fontWeight: 500 }}>Create the first one.</Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                  {["Student", "Term", "Total", "Paid", "Balance", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const balance = inv.totalAmount - inv.paidAmount;
                  const st = STATUS_STYLES[inv.status];
                  return (
                    <tr key={inv.id} style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-ink)", margin: 0 }}>{inv.student.firstName} {inv.student.lastName}</p>
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, fontFamily: "monospace" }}>{inv.student.admissionNumber ?? ""}</p>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                        {inv.term?.name ?? "—"}<br />
                        <span style={{ fontSize: 11 }}>{inv.academicYear}</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 500 }}>{formatNaira(inv.totalAmount)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 14, color: "#166534" }}>{formatNaira(inv.paidAmount)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: balance > 0 ? 600 : 400, color: balance > 0 ? "#991b1b" : "var(--color-text-secondary)" }}>
                        {balance > 0 ? formatNaira(balance) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Link href={`/fees/${inv.id}`} style={{ fontSize: 13, color: "var(--color-ink)", textDecoration: "none", fontWeight: 500 }}>View →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}
