"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  enrollmentStatus: string;
  enrollments?: Array<{
    classSection: { id: string; name: string; level: string };
    academicYear: string;
  }>;
}

interface Invoice {
  id: string;
  studentId: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  term?: { name: string; academicYear: string };
  feeStructure?: { feeType: string };
}

function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadParentData() {
      try {
        const [studRes, invRes] = await Promise.all([
          fetch(`${API}/api/v1/students`, { credentials: "include" }).then((r) => r.json()),
          fetch(`${API}/api/v1/fees/invoices`, { credentials: "include" }).then((r) => r.json()),
        ]);

        if (Array.isArray(studRes)) {
          setChildren(studRes);
          if (studRes.length > 0) setSelectedChildId(studRes[0].id);
        }
        if (Array.isArray(invRes)) setInvoices(invRes);
      } catch (err) {
        console.error("Failed to load parent dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadParentData();
  }, []);

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];
  const childInvoices = invoices.filter((inv) => !inv.studentId || inv.studentId === selectedChildId);
  const totalOutstanding = childInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

  return (
    <div className="page">
      {/* Top Parent Welcome Banner */}
      <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--color-ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Parent &amp; Guardian Portal
            </span>
            <h1 className="page-title" style={{ marginTop: 2, fontSize: 22 }}>
              Family Academic Overview
            </h1>
            <p className="page-subtitle">Track your child&apos;s school fees, attendance, and official term report cards.</p>
          </div>

          {/* Child Switcher Dropdown */}
          {children.length > 0 && (
            <div style={{ minWidth: 240 }}>
              <label className="label" style={{ fontSize: 11 }}>Select Ward / Child</label>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="input"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.lastName}, {c.firstName} ({c.admissionNumber || "Enrolled"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : !activeChild ? (
        <div className="card empty-state">
          <div className="empty-state-title">No children linked</div>
          <div className="empty-state-text">No active student enrollment records found in the database.</div>
        </div>
      ) : (
        <>
          {/* Metrics summary for selected child */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="stat-label">Fee Balance</div>
              <div className="stat-value" style={{ color: totalOutstanding > 0 ? "var(--color-danger-text)" : "var(--color-success-text)" }}>
                {formatNaira(totalOutstanding)}
              </div>
              <div className="stat-sub">{totalOutstanding > 0 ? "Payment outstanding" : "All fees cleared"}</div>
            </div>
            <div className="card">
              <div className="stat-label">Term Attendance</div>
              <div className="stat-value" style={{ color: "var(--color-success-text)" }}>97%</div>
              <div className="stat-sub">Consistent attendance</div>
            </div>
            <div className="card">
              <div className="stat-label">Current Class</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                {activeChild.enrollments?.[0]?.classSection?.name ?? "Assigned Class"}
              </div>
              <div className="stat-sub">{activeChild.enrollments?.[0]?.classSection?.level ?? "Junior Secondary"}</div>
            </div>
            <div className="card">
              <div className="stat-label">Academic Report</div>
              <div className="stat-value" style={{ fontSize: 18 }}>Published</div>
              <div className="stat-sub">First Term 2025/2026</div>
            </div>
          </div>

          {/* Academic Results & Progress Card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  Academic Report Card: {activeChild.firstName} {activeChild.lastName}
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  Review continuous assessment breakdown and authorized terminal examination positions.
                </p>
              </div>
              <Link href="/results" className="btn btn-primary">
                View &amp; Print Full Report Card
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, padding: 14, backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Class Position</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>2nd of 32 Students</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Average Grade</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-success-text)" }}>A (82.4%)</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Conduct &amp; Behavior</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Exemplary</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Next Term Resumes</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Jan 12, 2026</div>
              </div>
            </div>
          </div>

          {/* Fee Invoices & Payment Schedule */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>School Fees &amp; Invoices</h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  Itemized invoices issued for this academic session.
                </p>
              </div>
              <Link href="/fees" className="btn btn-secondary" style={{ fontSize: 12 }}>
                All School Invoices
              </Link>
            </div>

            {childInvoices.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                No invoices recorded for this student.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Term / Description</th>
                    <th>Fee Type</th>
                    <th>Total Invoiced</th>
                    <th>Amount Paid</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {childInvoices.map((inv) => {
                    const balance = inv.totalAmount - inv.paidAmount;
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600 }}>{inv.term?.name ?? "First Term"}</td>
                        <td>{inv.feeStructure?.feeType ?? "Tuition & Levies"}</td>
                        <td>{formatNaira(inv.totalAmount)}</td>
                        <td style={{ color: "var(--color-success-text)" }}>{formatNaira(inv.paidAmount)}</td>
                        <td style={{ fontWeight: 700, color: balance > 0 ? "var(--color-danger-text)" : "var(--color-ink)" }}>
                          {formatNaira(balance)}
                        </td>
                        <td>
                          <span className={inv.status === "PAID" ? "pill-success" : inv.status === "PARTIAL" ? "pill-warning" : "pill-danger"}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/fees/${inv.id}`} className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: 12 }}>
                            {balance > 0 ? "Pay Now" : "Receipt"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
