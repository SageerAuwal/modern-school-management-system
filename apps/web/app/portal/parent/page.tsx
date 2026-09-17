"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProfileSwitcherTabs, { ProfileTabItem } from "../../components/ProfileSwitcherTabs";
import MiniCalendarSchedule, { ScheduleEvent } from "../../components/MiniCalendarSchedule";
import ActivityTimeline from "../../components/ActivityTimeline";

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
  const [activeView, setActiveView] = useState<"overview" | "activity" | "fees">("overview");

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

  // Map children to profile switcher tabs
  const profileTabs: ProfileTabItem[] = children.map((c, index) => ({
    id: c.id,
    label: `${c.firstName} ${c.lastName}`,
    subtitle: c.enrollments?.[0]?.classSection?.name || "Enrolled",
    badgeCount: index === 0 ? childInvoices.filter((i) => i.status !== "PAID").length : undefined,
  }));

  const upcomingExamEvents: ScheduleEvent[] = [
    {
      id: "ex-1",
      title: "Mathematics Mid-Term Exam",
      date: "14 February 2026",
      category: "exam",
      tag: "Term Assessment",
      daysRemaining: 5,
      progressPercent: 65,
      color: "#3b82f6",
    },
    {
      id: "ex-2",
      title: "English Language Essay & Grammar",
      date: "22 February 2026",
      category: "exam",
      tag: "Terminal Exam",
      daysRemaining: 12,
      progressPercent: 40,
      color: "#8b5cf6",
    },
    {
      id: "ex-3",
      title: "Basic Science Practical Evaluation",
      date: "25 February 2026",
      category: "class",
      tag: "Lab Exam",
      daysRemaining: 15,
      progressPercent: 25,
      color: "#0d9488",
    },
  ];

  return (
    <div className="page">
      {/* 1. Top Multi-Child Profile Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {children.length > 0 && (
          <ProfileSwitcherTabs
            items={profileTabs}
            activeId={selectedChildId}
            onSelect={(id) => setSelectedChildId(id)}
            addTooltip="Register another child or ward"
          />
        )}

        {/* View mode toggle */}
        <div style={{ display: "inline-flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => setActiveView("overview")}
            className={`btn ${activeView === "overview" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 18 }}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveView("activity")}
            className={`btn ${activeView === "activity" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 18 }}
          >
            Activity Calendar
          </button>
          <button
            type="button"
            onClick={() => setActiveView("fees")}
            className={`btn ${activeView === "fees" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 18 }}
          >
            Fee Invoices ({childInvoices.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 260, borderRadius: 18 }} />
      ) : !activeChild ? (
        <div className="card empty-state">
          <div className="empty-state-title">No children linked</div>
          <div className="empty-state-text">No active student enrollment records found in the database.</div>
        </div>
      ) : activeView === "activity" ? (
        /* Screen 1: Activity Timeline for Selected Child */
        <ActivityTimeline studentName={`${activeChild.firstName} ${activeChild.lastName}`} />
      ) : activeView === "fees" ? (
        /* Itemized Invoices Table */
        <div className="card" style={{ backgroundColor: "#ffffff", borderRadius: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                School Fee Invoices: {activeChild.firstName} {activeChild.lastName}
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
                Total outstanding: <strong style={{ color: totalOutstanding > 0 ? "var(--color-danger-text)" : "var(--color-success-text)" }}>{formatNaira(totalOutstanding)}</strong>
              </p>
            </div>
            <Link href="/fees" className="btn btn-secondary" style={{ fontSize: 12 }}>
              All Invoices
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
      ) : (
        /* Screen 2: Modern Overview Dashboard */
        <>
          {/* Greeting Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
              Good Morning, Parent 👋
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
              Here is a look at <strong>{activeChild.firstName}&apos;s</strong> latest academic performance, upcoming classes, and exam schedules.
            </p>
          </div>

          {/* 3 Live Status Cards with Linear Progress Bars */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            {/* Card 1: Progress Status */}
            <div
              className="card"
              style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: 18 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Progress status</span>
                </div>
                <Link href="/results" style={{ fontSize: 11, color: "var(--color-text-secondary)", textDecoration: "none" }}>
                  Report card
                </Link>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Academic Standing</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>82%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ width: "82%", height: "100%", backgroundColor: "#f59e0b", borderRadius: 3 }} />
              </div>
            </div>

            {/* Card 2: Upcoming Class */}
            <div
              className="card"
              style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: 18 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#8b5cf6" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Upcoming class</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {activeChild.enrollments?.[0]?.classSection?.name || "JSS 1"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Next Period</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>Mathematics · 40 Min</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ width: "60%", height: "100%", backgroundColor: "#8b5cf6", borderRadius: 3 }} />
              </div>
            </div>

            {/* Card 3: Attendance Gauge */}
            <div
              className="card"
              style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: 18 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Term Attendance</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--color-success-text)", fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Sessions Present</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>97% (34 / 35 Days)</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ width: "97%", height: "100%", backgroundColor: "#10b981", borderRadius: 3 }} />
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Badges (Pills with >) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveView("activity")}
              className="card"
              style={{
                backgroundColor: "#ffffff",
                padding: "14px 18px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                border: "1px solid rgba(0,0,0,0.05)",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#ede9fe", color: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  📄
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>4</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Assignments</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </button>

            <Link
              href="/exams"
              className="card"
              style={{
                backgroundColor: "#ffffff",
                padding: "14px 18px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  🔔
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>3</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>School Events</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </Link>

            <button
              type="button"
              onClick={() => setActiveView("fees")}
              className="card"
              style={{
                backgroundColor: "#ffffff",
                padding: "14px 18px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                border: "1px solid rgba(0,0,0,0.05)",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  💳
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: totalOutstanding > 0 ? "var(--color-danger-text)" : "var(--color-ink)" }}>
                    {formatNaira(totalOutstanding)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Fee Balance</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </button>

            <Link
              href="/results"
              className="card"
              style={{
                backgroundColor: "#ffffff",
                padding: "14px 18px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  ⭐
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>2nd</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Class Position</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </Link>
          </div>

          {/* Mini Calendar Schedule with Colored Dots + Exam Countdown Cards */}
          <MiniCalendarSchedule events={upcomingExamEvents} title="Schedule & Term Assessments" />
        </>
      )}
    </div>
  );
}
