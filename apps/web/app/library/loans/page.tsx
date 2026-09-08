"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Loan {
  id: string;
  borrowerName: string;
  dueDate: string;
  status: "ACTIVE" | "OVERDUE";
  daysOverdue?: number;
  estimatedFine?: number;
  book: { id: string; title: string; author: string };
  student: { id: string; firstName: string; lastName: string; admissionNumber: string | null } | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LibraryLoansPage() {
  const [tab, setTab] = useState<"active" | "overdue">("active");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returning, setReturning] = useState<string | null>(null);
  const [returnMsg, setReturnMsg] = useState("");

  const load = (t: "active" | "overdue") => {
    setLoading(true); setError(""); setLoans([]);
    const endpoint = t === "overdue" ? "overdue" : "active";
    fetch(`${API}/api/v1/library/loans/${endpoint}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLoans(data); else setError(data.message ?? "Failed"); })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleReturn = async (loanId: string) => {
    setReturning(loanId); setReturnMsg("");
    try {
      const res = await fetch(`${API}/api/v1/library/loans/${loanId}/return`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { setReturnMsg(`Error: ${data.message}`); return; }
      const fine = data.fineAmount ?? 0;
      setReturnMsg(fine > 0 ? `Book returned. Fine: ₦${fine.toLocaleString()}` : "Book returned successfully.");
      load(tab);
    } catch { setReturnMsg("Network error"); }
    finally { setReturning(null); }
  };

  const tabStyle = (t: string) => ({
    padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer",
    border: "var(--border-width) solid var(--color-border)",
    borderRadius: "var(--radius-control)",
    backgroundColor: tab === t ? "var(--color-ink)" : "transparent",
    color: tab === t ? "#fff" : "var(--color-ink)",
  });

  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>Loans</h1>
          <Link href="/library" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Back to Catalogue</Link>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={tabStyle("active")} onClick={() => setTab("active")}>Active Loans</button>
          <button style={tabStyle("overdue")} onClick={() => setTab("overdue")}>⚠ Overdue</button>
        </div>
      </div>

      {returnMsg && <div className={returnMsg.startsWith("Error") ? "pill-danger" : "pill-success"} style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>{returnMsg}</div>}
      {error && <div className="pill-danger" style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {loading && <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading…</p>}

      {!loading && !error && (
        loans.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--color-text-secondary)", fontSize: 14 }}>
            {tab === "active" ? "No books currently on loan." : "No overdue books. 🎉"}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                  {["Book", "Borrower", "Due Date", tab === "overdue" ? "Days Overdue" : "Status", "Est. Fine", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const isOverdue = loan.status === "OVERDUE";
                  return (
                    <tr key={loan.id} style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{loan.book.title}</p>
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{loan.book.author}</p>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 14, margin: 0 }}>{loan.borrowerName}</p>
                        {loan.student && <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0, fontFamily: "monospace" }}>{loan.student.admissionNumber}</p>}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: isOverdue ? "#991b1b" : "var(--color-text-secondary)", fontWeight: isOverdue ? 600 : 400 }}>
                        {new Date(loan.dueDate).toLocaleDateString("en-NG")}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {isOverdue ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>{loan.daysOverdue}d overdue</span>
                        ) : (
                          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, backgroundColor: "#dcfce7", color: "#166534", fontWeight: 600 }}>Active</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: loan.estimatedFine ? 600 : 400, color: loan.estimatedFine ? "#991b1b" : "var(--color-text-secondary)" }}>
                        {loan.estimatedFine ? `₦${loan.estimatedFine.toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button onClick={() => handleReturn(loan.id)} disabled={returning === loan.id}
                          style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, backgroundColor: returning === loan.id ? "#6b7280" : "var(--color-ink)", color: "#fff", border: "none", borderRadius: "var(--radius-control)", cursor: returning === loan.id ? "not-allowed" : "pointer" }}>
                          {returning === loan.id ? "…" : "Return"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  );
}
