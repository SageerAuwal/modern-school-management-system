"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface InvoiceDetail {
  id: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  academicYear: string;
  dueDate: string | null;
  notes: string | null;
  student: { id: string; firstName: string; lastName: string; admissionNumber: string | null };
  term: { id: string; name: string } | null;
  items: Array<{ id: string; name: string; amount: number }>;
  payments: Array<{
    id: string; amount: number; method: string;
    status: string; reference: string; paidAt: string | null; notes: string | null;
  }>;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const METHOD_LABELS: Record<string, string> = {
  CASH: "💵 Cash", BANK_DEPOSIT: "🏦 Bank Deposit", PAYSTACK: "💳 Paystack",
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment form state
  const [payMode, setPayMode] = useState<"cash" | "paystack" | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [cashMethod, setCashMethod] = useState<"CASH" | "BANK_DEPOSIT">("CASH");
  const [cashNotes, setCashNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/v1/fees/invoices/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setInvoice(data);
        else setError(data.message ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (id) load(); }, [id]);

  const balance = invoice ? invoice.totalAmount - invoice.paidAmount : 0;
  const canPay = invoice && ["UNPAID", "PARTIAL"].includes(invoice.status) && balance > 0;

  const handleCashPay = async () => {
    const amount = parseFloat(cashAmount);
    if (!amount || amount <= 0) { setPayError("Enter a valid amount"); return; }
    if (amount > balance) { setPayError(`Cannot exceed balance ${formatNaira(balance)}`); return; }
    setSaving(true); setPayError("");
    try {
      const res = await fetch(`${API}/api/v1/fees/invoices/${id}/pay/cash`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method: cashMethod, notes: cashNotes }),
      });
      const data = await res.json();
      if (!res.ok) { setPayError(data.message ?? "Failed"); return; }
      setPayMode(null); setCashAmount(""); setCashNotes("");
      load(); // Refresh invoice
    } catch { setPayError("Network error"); }
    finally { setSaving(false); }
  };

  const handlePaystack = async () => {
    setSaving(true); setPayError("");
    try {
      const callbackUrl = `${window.location.origin}/fees/${id}?paid=1`;
      const res = await fetch(`${API}/api/v1/fees/invoices/${id}/pay/paystack`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setPayError(data.message ?? "Failed"); return; }
      window.location.href = data.authorizationUrl; // Redirect to Paystack
    } catch { setPayError("Network error"); }
    finally { setSaving(false); }
  };

  if (loading) return <main style={{ padding: 32 }}><p style={{ color: "var(--color-text-secondary)" }}>Loading…</p></main>;
  if (error) return <main style={{ padding: 32 }}><p style={{ color: "#991b1b" }}>{error}</p></main>;
  if (!invoice) return null;

  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* Invoice header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Invoice</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {invoice.student.firstName} {invoice.student.lastName}
              {invoice.student.admissionNumber ? ` · ${invoice.student.admissionNumber}` : ""}
            </p>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {invoice.term?.name ?? "—"} · {invoice.academicYear}
            </p>
          </div>
          <span style={{
            padding: "6px 14px", borderRadius: 999, fontWeight: 700, fontSize: 13,
            backgroundColor: { UNPAID: "#fee2e2", PARTIAL: "#fef9c3", PAID: "#dcfce7", WAIVED: "#e0f2fe", CANCELLED: "#f1f5f9" }[invoice.status] ?? "#f1f5f9",
            color: { UNPAID: "#991b1b", PARTIAL: "#854d0e", PAID: "#166534", WAIVED: "#075985", CANCELLED: "#64748b" }[invoice.status] ?? "#64748b",
          }}>{invoice.status}</span>
        </div>

        {/* Line items */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 14 }}>Fee Breakdown</p>
          {invoice.items.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "var(--border-width) solid var(--color-border)" }}>
              <span style={{ fontSize: 14 }}>{item.name}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{formatNaira(item.amount)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0" }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{formatNaira(invoice.totalAmount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0" }}>
            <span style={{ fontSize: 13, color: "#166534" }}>Paid</span>
            <span style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>{formatNaira(invoice.paidAmount)}</span>
          </div>
          {balance > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#991b1b" }}>Balance Due</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>{formatNaira(balance)}</span>
            </div>
          )}
        </div>

        {/* Pay buttons */}
        {canPay && !payMode && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button onClick={() => setPayMode("cash")}
              style={{ flex: 1, padding: "11px 0", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, cursor: "pointer", backgroundColor: "var(--color-surface)" }}>
              💵 Record Cash / Bank
            </button>
            <button onClick={() => setPayMode("paystack")}
              style={{ flex: 1, padding: "11px 0", backgroundColor: "#0ba4db", color: "#fff", border: "none", borderRadius: "var(--radius-control)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              💳 Pay via Paystack
            </button>
          </div>
        )}

        {/* Cash payment form */}
        {payMode === "cash" && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Record Cash / Bank Payment</p>
            {payError && <p style={{ color: "#991b1b", fontSize: 13, marginBottom: 10 }}>{payError}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Amount (₦)</label>
                <input type="number" min={1} max={balance} value={cashAmount} onChange={(e) => setCashAmount(e.target.value)}
                  placeholder={`Max ${formatNaira(balance)}`}
                  style={{ width: "100%", padding: "9px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Method</label>
                <select value={cashMethod} onChange={(e) => setCashMethod(e.target.value as "CASH" | "BANK_DEPOSIT")}
                  style={{ width: "100%", padding: "9px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14 }}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_DEPOSIT">Bank Deposit / Teller</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Notes (optional)</label>
                <input type="text" value={cashNotes} onChange={(e) => setCashNotes(e.target.value)} placeholder="Teller no., receipt no., etc."
                  style={{ width: "100%", padding: "9px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, boxSizing: "border-box" as const }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setPayMode(null)} style={{ flex: 1, padding: "10px 0", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, cursor: "pointer", backgroundColor: "transparent" }}>Cancel</button>
                <button onClick={handleCashPay} disabled={saving} style={{ flex: 2, padding: "10px 0", backgroundColor: saving ? "#6b7280" : "var(--color-ink)", color: "#fff", border: "none", borderRadius: "var(--radius-control)", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : "Record Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paystack confirm */}
        {payMode === "paystack" && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Pay via Paystack</p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
              You will be redirected to Paystack to pay <strong>{formatNaira(balance)}</strong>. Cards, bank transfer, and USSD are all accepted.
            </p>
            {payError && <p style={{ color: "#991b1b", fontSize: 13, marginBottom: 10 }}>{payError}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPayMode(null)} style={{ flex: 1, padding: "10px 0", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, cursor: "pointer", backgroundColor: "transparent" }}>Cancel</button>
              <button onClick={handlePaystack} disabled={saving} style={{ flex: 2, padding: "10px 0", backgroundColor: saving ? "#6b7280" : "#0ba4db", color: "#fff", border: "none", borderRadius: "var(--radius-control)", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Redirecting…" : `Pay ${formatNaira(balance)}`}
              </button>
            </div>
          </div>
        )}

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <div className="card">
            <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 14 }}>Payment History</p>
            {invoice.payments.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "var(--border-width) solid var(--color-border)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{METHOD_LABELS[p.method] ?? p.method}</p>
                  <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0, fontFamily: "monospace" }}>{p.reference}</p>
                  {p.notes && <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>{p.notes}</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{formatNaira(p.amount)}</p>
                  <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-NG") : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
