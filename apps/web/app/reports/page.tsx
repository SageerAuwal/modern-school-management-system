"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ReportData {
  generatedAt: string;
  school: {
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    motto: string;
  };
  demographics: {
    totalStudents: number;
    activeStudents: number;
    maleCount: number;
    femaleCount: number;
    malePercentage: number;
    femalePercentage: number;
    levelCounts: Record<string, number>;
    classBreakdown: Array<{
      id: string;
      name: string;
      level: string;
      enrolled: number;
      capacity: number;
      occupancyRate: number;
      teacherName: string;
    }>;
    totalStaff: number;
    teachingStaff: number;
    supportStaff: number;
  };
  academics: {
    totalScores: number;
    schoolAverageScore: number;
    gradeDistribution: Record<string, number>;
    subjectsSummary: Array<{
      id: string;
      name: string;
      code: string;
      records: number;
      averageScore: number;
      averageCa: number;
      averageExam: number;
      passRate: number;
    }>;
    honorRoll: Array<{
      name: string;
      admissionNumber: string;
      average: number;
      subjectsCount: number;
    }>;
  };
  financials: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionEfficiency: number;
    invoicesBreakdown: {
      paid: number;
      partial: number;
      unpaid: number;
      total: number;
    };
    topDebtors: Array<{
      studentName: string;
      admissionNumber: string;
      className: string;
      totalInvoiced: number;
      paidAmount: number;
      balance: number;
    }>;
  };
  attendance: {
    totalRollCalls: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: number;
  };
  operations: {
    library: {
      totalTitles: number;
      totalPhysicalCopies: number;
      copiesAvailable: number;
      activeLoans: number;
      overdueLoans: number;
      returnedLoans: number;
    };
    transport: {
      totalBuses: number;
      activeBuses: number;
      totalCapacity: number;
      registeredRiders: number;
      fleetOccupancyRate: number;
    };
  };
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "demographics" | "academics" | "financials" | "operations">("overview");

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/v1/reports/summary`, { credentials: "include" });
        if (!res.ok) {
          throw new Error(`Failed to load reports (${res.status})`);
        }
        const report = await res.json();
        setData(report);
      } catch (err: any) {
        setError(err.message || "Failed to load institutional reports.");
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, []);

  const formatNaira = (amount: number) => `₦${Math.round(amount).toLocaleString()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1200, margin: "0 auto" }}>
      {/* ── SCREEN VIEW HEADER ───────────────────────────────────────────── */}
      <div className="no-print" style={{ borderBottom: "1px solid var(--color-border, #E8ECE9)", paddingBottom: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: "var(--color-brand-teal, #0E7D75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                boxShadow: "0 4px 12px rgba(14, 125, 117, 0.2)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--color-ink, #0D2B22)", letterSpacing: "-0.02em" }}>
                Reports & Analytics
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary, #4A6B5D)" }}>
                Institutional data records, performance metrics, and official audit reporting.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                borderRadius: 8,
                backgroundColor: "var(--color-brand-teal, #0E7D75)",
                color: "#FFFFFF",
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(14, 125, 117, 0.25)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Official Institutional Summary
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {[
            { id: "overview", label: "Executive Overview" },
            { id: "demographics", label: "Demographics & Enrollment" },
            { id: "academics", label: "Academic Performance" },
            { id: "financials", label: "Bursary & Collections" },
            { id: "operations", label: "Facilities & Attendance" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                backgroundColor: activeTab === t.id ? "var(--color-surface-subtle, #F4F7F5)" : "transparent",
                color: activeTab === t.id ? "var(--color-brand-teal, #0E7D75)" : "var(--color-text-secondary, #4A6B5D)",
                borderRadius: 8,
                borderBottom: activeTab === t.id ? "2px solid var(--color-brand-teal, #0E7D75)" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ERROR OR LOADING STATES ──────────────────────────────────────── */}
      {loading && (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Aggregating all database records for Bright Future Academy...
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: "var(--color-danger-bg, #FAECE7)",
            color: "var(--color-danger-text, #993C1D)",
            borderRadius: 12,
            marginBottom: 24,
            border: "1px solid var(--color-danger-border, #F0C4B8)",
          }}
        >
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── PRINT-ONLY OFFICIAL LETTERHEAD ────────────────────────────── */}
          <div className="print-only">
            <div style={{ borderBottom: "3px double #0D2B22", paddingBottom: 14, marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0D2B22", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {data.school.name}
              </div>
              <div style={{ fontSize: 11, color: "#4A6B5D", fontStyle: "italic", margin: "2px 0 6px" }}>
                Motto: &quot;{data.school.motto}&quot;
              </div>
              <div style={{ fontSize: 11, color: "#1F3B30", lineHeight: 1.5 }}>
                {data.school.address}<br />
                Email: {data.school.email} | Contact: {data.school.phone} | Code: {data.school.code}
              </div>
              <div
                style={{
                  display: "inline-block",
                  marginTop: 10,
                  padding: "4px 16px",
                  backgroundColor: "#F4F7F5",
                  border: "1px solid #D4E5DC",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#0E7D75",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Comprehensive Institutional Data Report &amp; Analysis
              </div>
              <div style={{ fontSize: 10, color: "#70817B", marginTop: 4 }}>
                Generated on: {new Date(data.generatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* ── TAB 1: EXECUTIVE OVERVIEW ─────────────────────────────────── */}
          {(activeTab === "overview" || typeof window !== "undefined") && (
            <div className={activeTab === "overview" ? "" : "print-only"} style={{ marginBottom: 32 }}>
              {/* KPI Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
                <div style={{ padding: "18px 20px", backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Total Students</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", marginTop: 4 }}>{data.demographics.totalStudents}</div>
                  <div style={{ fontSize: 11, color: "#1B6A45", marginTop: 4, fontWeight: 600 }}>{data.demographics.activeStudents} active enrolled</div>
                </div>

                <div style={{ padding: "18px 20px", backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Academic Average</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", marginTop: 4 }}>{data.academics.schoolAverageScore}%</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{data.academics.totalScores} scores recorded</div>
                </div>

                <div style={{ padding: "18px 20px", backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Fee Collections</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-brand-teal, #0E7D75)", marginTop: 4 }}>{formatNaira(data.financials.totalCollected)}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{data.financials.collectionEfficiency}% collection rate</div>
                </div>

                <div style={{ padding: "18px 20px", backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Attendance Rate</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", marginTop: 4 }}>{data.attendance.attendanceRate}%</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{data.attendance.totalRollCalls} roll-calls</div>
                </div>

                <div style={{ padding: "18px 20px", backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Staff &amp; Faculty</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", marginTop: 4 }}>{data.demographics.totalStaff}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{data.demographics.teachingStaff} academic teachers</div>
                </div>

                <div style={{ padding: "18px 20px", backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Outstanding Debt</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-danger-text, #993C1D)", marginTop: 4 }}>{formatNaira(data.financials.totalOutstanding)}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{data.financials.invoicesBreakdown.unpaid} unpaid bills</div>
                </div>
              </div>

              {/* 2-Column Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Demographics mini-card */}
                <div style={{ padding: 20, backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: "var(--color-ink)" }}>Student Gender Balance</h3>
                  <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Male: </span>
                      <strong>{data.demographics.maleCount} ({data.demographics.malePercentage}%)</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Female: </span>
                      <strong>{data.demographics.femaleCount} ({data.demographics.femalePercentage}%)</strong>
                    </div>
                  </div>
                  {/* Visual Bar */}
                  <div style={{ height: 10, borderRadius: 5, backgroundColor: "#E8ECE9", overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${data.demographics.malePercentage}%`, backgroundColor: "var(--color-brand-teal, #0E7D75)" }} />
                    <div style={{ width: `${data.demographics.femalePercentage}%`, backgroundColor: "var(--color-accent-gold, #C49B28)" }} />
                  </div>
                </div>

                {/* Facilities mini-card */}
                <div style={{ padding: 20, backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: "var(--color-ink)" }}>Operations &amp; Logistics</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                    <div>
                      <span style={{ color: "var(--color-text-secondary)" }}>Library Catalog: </span>
                      <strong>{data.operations.library.totalPhysicalCopies} copies</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--color-text-secondary)" }}>Active Book Loans: </span>
                      <strong>{data.operations.library.activeLoans}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--color-text-secondary)" }}>Transport Buses: </span>
                      <strong>{data.operations.transport.activeBuses} active</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--color-text-secondary)" }}>Bus Occupancy: </span>
                      <strong>{data.operations.transport.fleetOccupancyRate}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: DEMOGRAPHICS & ENROLLMENT ─────────────────────────── */}
          {(activeTab === "demographics" || typeof window !== "undefined") && (
            <div className={activeTab === "demographics" ? "" : "print-only"} style={{ marginBottom: 32 }}>
              <div style={{ backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", padding: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "var(--color-ink)" }}>
                  Class-by-Class Enrollment &amp; Capacity Utilization
                </h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--color-surface-subtle, #F4F7F5)", borderBottom: "1px solid var(--color-border)" }}>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--color-ink)" }}>Class Name</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--color-ink)" }}>Level</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--color-ink)" }}>Form Teacher</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--color-ink)", textAlign: "center" }}>Enrolled</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--color-ink)", textAlign: "center" }}>Capacity</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--color-ink)", textAlign: "right" }}>Occupancy Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.demographics.classBreakdown.map((cls) => (
                        <tr key={cls.id} style={{ borderBottom: "1px solid var(--color-border, #E8ECE9)" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--color-ink)" }}>{cls.name}</td>
                          <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)" }}>{cls.level}</td>
                          <td style={{ padding: "10px 14px", color: "var(--color-ink)" }}>{cls.teacherName}</td>
                          <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700 }}>{cls.enrolled}</td>
                          <td style={{ padding: "10px 14px", textAlign: "center", color: "var(--color-text-secondary)" }}>{cls.capacity}</td>
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontWeight: 700,
                                fontSize: 11,
                                backgroundColor: cls.occupancyRate > 90 ? "#FAECE7" : "#EAF6F0",
                                color: cls.occupancyRate > 90 ? "#993C1D" : "#1B6A45",
                              }}
                            >
                              {cls.occupancyRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: ACADEMIC PERFORMANCE ──────────────────────────────── */}
          {(activeTab === "academics" || typeof window !== "undefined") && (
            <div className={activeTab === "academics" ? "" : "print-only"} style={{ marginBottom: 32 }}>
              {/* WAEC Grade Distribution */}
              <div style={{ backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", padding: 20, marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: "var(--color-ink)" }}>
                  WAEC / Terminal Grade Distribution
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 10, textAlign: "center" }}>
                  {Object.entries(data.academics.gradeDistribution).map(([grade, count]) => (
                    <div
                      key={grade}
                      style={{
                        padding: "12px 6px",
                        borderRadius: 10,
                        backgroundColor: grade.startsWith("A") || grade.startsWith("B") ? "#EAF6F0" : grade.startsWith("C") ? "#FAF7E8" : "#FAECE7",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-ink)" }}>{grade}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-brand-teal)", marginTop: 4 }}>{count}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                        {data.academics.totalScores > 0 ? Math.round((count / data.academics.totalScores) * 100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subject Breakdown & Honor Roll */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
                <div style={{ backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "var(--color-ink)" }}>
                    Subject-by-Subject Academic Averages
                  </h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--color-surface-subtle)", borderBottom: "1px solid var(--color-border)" }}>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>Subject</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}>Avg CA</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}>Avg Exam</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "center" }}>Total Avg</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "right" }}>Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.academics.subjectsSummary.map((sub) => (
                        <tr key={sub.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{sub.name}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--color-text-secondary)" }}>{sub.averageCa}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--color-text-secondary)" }}>{sub.averageExam}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "var(--color-ink)" }}>{sub.averageScore}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>
                            <span style={{ fontWeight: 700, color: sub.passRate >= 70 ? "#1B6A45" : "#993C1D" }}>
                              {sub.passRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "var(--color-ink)" }}>
                    Top Academic Honor Roll
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.academics.honorRoll.map((st, idx) => (
                      <div
                        key={st.admissionNumber}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          backgroundColor: idx === 0 ? "#FAF7E8" : "var(--color-surface-subtle)",
                          border: "1px solid var(--color-border)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>
                            #{idx + 1} {st.name}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                            {st.admissionNumber} · {st.subjectsCount} subjects
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-brand-teal)" }}>
                          {st.average}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: BURSARY & COLLECTIONS ─────────────────────────────── */}
          {(activeTab === "financials" || typeof window !== "undefined") && (
            <div className={activeTab === "financials" ? "" : "print-only"} style={{ marginBottom: 32 }}>
              <div style={{ backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", padding: 20, marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: "var(--color-ink)" }}>
                  Institutional Revenue &amp; Debtors Audit Roster
                </h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--color-surface-subtle)", borderBottom: "1px solid var(--color-border)" }}>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Student Name</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Admission No</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Class</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>Billed Amount</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>Amount Paid</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right", color: "var(--color-danger-text)" }}>Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.financials.topDebtors.map((d) => (
                        <tr key={d.admissionNumber} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{d.studentName}</td>
                          <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{d.admissionNumber}</td>
                          <td style={{ padding: "10px 12px" }}>{d.className}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>{formatNaira(d.totalInvoiced)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#1B6A45" }}>{formatNaira(d.paidAmount)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "var(--color-danger-text)" }}>
                            {formatNaira(d.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: FACILITIES & ATTENDANCE ────────────────────────────── */}
          {(activeTab === "operations" || typeof window !== "undefined") && (
            <div className={activeTab === "operations" ? "" : "print-only"} style={{ marginBottom: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Attendance Summary */}
                <div style={{ backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "var(--color-ink)" }}>
                    Daily Roll-Call Compliance
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Present Roll Calls:</span>
                      <strong style={{ color: "#1B6A45" }}>{data.attendance.presentCount}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Absent:</span>
                      <strong style={{ color: "#993C1D" }}>{data.attendance.absentCount}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Late Arrivals:</span>
                      <strong style={{ color: "#C49B28" }}>{data.attendance.lateCount}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Excused Absences:</span>
                      <strong style={{ color: "var(--color-ink)" }}>{data.attendance.excusedCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Library Circulation */}
                <div style={{ backgroundColor: "var(--color-surface, #FFFFFF)", borderRadius: 14, border: "1px solid var(--color-border, #E8ECE9)", padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "var(--color-ink)" }}>
                    Digital Library &amp; Transport Utilization
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Available Library Copies:</span>
                      <strong>{data.operations.library.copiesAvailable} / {data.operations.library.totalPhysicalCopies}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Active Student Loans:</span>
                      <strong>{data.operations.library.activeLoans}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Overdue Book Loans:</span>
                      <strong style={{ color: data.operations.library.overdueLoans > 0 ? "#993C1D" : "inherit" }}>
                        {data.operations.library.overdueLoans}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Fleet Bus Passengers:</span>
                      <strong>{data.operations.transport.registeredRiders} / {data.operations.transport.totalCapacity} seats</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PRINT-ONLY OFFICIAL ENDORSEMENT FOOTER ────────────────────── */}
          <div className="print-only" style={{ marginTop: 40, borderTop: "1px solid #1F3B30", paddingTop: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, textAlign: "center", fontSize: 11 }}>
              <div>
                <div style={{ height: 40 }} />
                <div style={{ borderTop: "1px solid #000", width: "80%", margin: "0 auto", paddingTop: 4, fontWeight: 700 }}>
                  Principal / Head of School
                </div>
                <div style={{ fontSize: 10, color: "#70817B" }}>Signature &amp; Date</div>
              </div>
              <div>
                <div style={{ height: 40 }} />
                <div style={{ borderTop: "1px solid #000", width: "80%", margin: "0 auto", paddingTop: 4, fontWeight: 700 }}>
                  Bursar / Financial Controller
                </div>
                <div style={{ fontSize: 10, color: "#70817B" }}>Signature &amp; Date</div>
              </div>
              <div>
                <div
                  style={{
                    height: 50,
                    width: 100,
                    border: "2px dashed #0E7D75",
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    color: "#0E7D75",
                    fontWeight: 700,
                  }}
                >
                  OFFICIAL STAMP
                </div>
                <div style={{ fontSize: 10, color: "#70817B", marginTop: 4 }}>Institutional Seal</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── CSS PRINT RULES ──────────────────────────────────────────────── */}
      <style jsx global>{`
        .print-only {
          display: none !important;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            background-color: #FFFFFF !important;
            color: #000000 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
