"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PhotoCaptureInput from "../../components/PhotoCaptureInput";
import OnlinePaymentModal from "../../components/OnlinePaymentModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Student {
  id: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  photoUrl?: string | null;
  bloodGroup?: string | null;
  genotype?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  enrollmentStatus?: string;
  attendanceRate?: number;
  classSection?: { id: string; name: string; level: string } | null;
  enrollments?: Array<{
    classSection: { id: string; name: string; level: string };
    academicYear: string;
  }>;
  invoices?: Invoice[];
  feeSummary?: {
    totalInvoiced: number;
    totalPaid: number;
    outstandingBalance: number;
  };
  clinicVisits?: Array<{
    id: string;
    visitDate: string;
    complaint: string;
    temperature: number | null;
    diagnosis: string | null;
    treatmentGiven: string | null;
    disposition: string;
  }>;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string | null;
  role: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
  paidAt?: string | null;
  notes?: string | null;
  createdAt?: string;
}

interface Invoice {
  id: string;
  studentId: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  term?: { name: string; academicYear: string };
  feeStructure?: { feeType: string };
  payments?: PaymentRecord[];
}

function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatOrdinal(n: number | null): string {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ParentDashboardPage() {
  const [parentProfile, setParentProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [reportCardData, setReportCardData] = useState<any>(null);
  const [loadingReportCard, setLoadingReportCard] = useState(false);

  useEffect(() => {
    if (!selectedChildId) {
      setReportCardData(null);
      return;
    }
    setLoadingReportCard(true);
    fetch(`${API}/api/v1/scores/report-card/${selectedChildId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setReportCardData(data))
      .catch(() => setReportCardData(null))
      .finally(() => setLoadingReportCard(false));
  }, [selectedChildId]);

  const loadParentData = useCallback(async () => {
    try {
      const [overviewRes, meRes] = await Promise.all([
        fetch(`${API}/api/v1/parents/my-children`, { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      if (overviewRes && Array.isArray(overviewRes.children)) {
        setChildren(overviewRes.children);
        if (overviewRes.children.length > 0) {
          setSelectedChildId((prev) => prev || overviewRes.children[0].id);
          const allInvoices = overviewRes.children.flatMap((c: any) => c.invoices || []);
          setInvoices(allInvoices);
        }
      }
      if (meRes && meRes.id) {
        setParentProfile(meRes);
        setEditPhotoUrl(meRes.photoUrl ?? null);
      }
    } catch (err) {
      console.error("Failed to load parent dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParentData();
  }, [loadParentData]);

  async function handleSavePhoto() {
    setSavingProfile(true);
    try {
      const res = await fetch(`${API}/api/v1/users/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ photoUrl: editPhotoUrl }),
      });
      if (res.ok) {
        const updated = await res.json();
        setParentProfile((prev) => (prev ? { ...prev, photoUrl: updated.photoUrl } : null));
        setIsProfileModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to save parent photo", err);
    } finally {
      setSavingProfile(false);
    }
  }

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];
  const childInvoices = invoices.filter((inv) => !inv.studentId || inv.studentId === selectedChildId);
  const totalOutstanding = childInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);
  const pendingChildPayments = childInvoices.flatMap((inv) => inv.payments ?? []).filter((p) => p.status === "PENDING");
  const hasPendingPayments = pendingChildPayments.length > 0;
  const pendingAmount = pendingChildPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="page">
      {/* Top Parent Welcome Banner */}
      {/* Top Parent Welcome Banner */}
      <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--color-ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Parent Photo / Avatar with Quick Change Click */}
            <div
              onClick={() => setIsProfileModalOpen(true)}
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                overflow: "hidden",
                backgroundColor: "var(--color-page)",
                border: "2px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                position: "relative",
              }}
              title="Click to update your photo"
            >
              {parentProfile?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={parentProfile.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Parent &amp; Guardian Portal • {parentProfile ? `${parentProfile.firstName} ${parentProfile.lastName}` : "Guardian"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="btn btn-secondary"
                  style={{ padding: "2px 8px", fontSize: 11, height: "auto" }}
                >
                  Change Photo
                </button>
              </div>
              <h1 className="page-title" style={{ marginTop: 2, fontSize: 22 }}>
                Family Academic Overview
              </h1>
              <p className="page-subtitle">Track your child&apos;s school fees, attendance, and official term report cards.</p>
            </div>
          </div>

          {/* Child Switcher Dropdown with Ward Photo */}
          {children.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {activeChild?.photoUrl && (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid var(--color-border)",
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeChild.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ minWidth: 220 }}>
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
              <div className="stat-sub" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <span>
                  {hasPendingPayments
                    ? `${formatNaira(pendingAmount)} awaiting Bursar`
                    : totalOutstanding > 0
                    ? "Payment outstanding"
                    : "All fees cleared"}
                </span>
                {totalOutstanding > 0 && (
                  hasPendingPayments && pendingAmount >= totalOutstanding ? (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        padding: "2px 8px",
                        borderRadius: 4,
                        border: "1px solid #FCD34D",
                      }}
                    >
                      Verification in Progress
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: 11, padding: "2px 8px" }}
                      onClick={() => {
                        const unpaid = childInvoices.find(
                          (i) => i.status !== "PAID" && !i.payments?.some((p) => p.status === "PENDING")
                        );
                        if (unpaid) {
                          setSelectedInvoiceForPayment(unpaid);
                          setIsPaymentModalOpen(true);
                        }
                      }}
                    >
                      Pay Online
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="card">
              <div className="stat-label">Term Attendance</div>
              <div className="stat-value" style={{ color: "var(--color-success-text)" }}>
                {activeChild.attendanceRate ?? 100}%
              </div>
              <div className="stat-sub">Consistent attendance</div>
            </div>
            <div className="card">
              <div className="stat-label">Current Class</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                {activeChild.classSection?.name ?? activeChild.enrollments?.[0]?.classSection?.name ?? "Assigned Class"}
              </div>
              <div className="stat-sub">
                {activeChild.classSection?.level ?? activeChild.enrollments?.[0]?.classSection?.level ?? "Junior Secondary"}
              </div>
            </div>
            <div className="card">
              <div className="stat-label">Academic Report</div>
              <div className="stat-value" style={{ fontSize: 18, color: reportCardData?.isReleased ? "var(--color-success-text)" : "var(--color-warning-text, #D97706)" }}>
                {loadingReportCard ? "Checking..." : reportCardData?.isReleased ? "Released" : "In Review"}
              </div>
              <div className="stat-sub">
                {reportCardData?.term ? `${reportCardData.term.name}` : "First Term 2025/2026"}
              </div>
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
                  Official terminal continuous assessment breakdown, exam scores, and class ranking.
                </p>
              </div>
              <Link href="/results" className="btn btn-primary">
                {reportCardData?.isReleased ? "View & Print Full Report Card" : "Check Results Status"}
              </Link>
            </div>

            {loadingReportCard ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                Checking academic release status...
              </div>
            ) : reportCardData?.isReleased === false ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-control, 8px)",
                  backgroundColor: "var(--color-warning-bg, #FEF3C7)",
                  border: "1px solid #FCD34D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#FDE68A", display: "flex", alignItems: "center", justifyContent: "center", color: "#D97706", flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-warning-text, #92400E)" }}>
                      Terminal Results Awaiting Administrative Release
                    </div>
                    <div style={{ fontSize: 12, color: "#78350F", marginTop: 2 }}>
                      Terminal results for this class are undergoing academic board verification and will be accessible immediately once officially approved and released by administration.
                    </div>
                  </div>
                </div>
                <span className="pill pill-warning" style={{ fontSize: 11, fontWeight: 700 }}>
                  Status: {reportCardData.releaseStatus || "In Review"}
                </span>
              </div>
            ) : reportCardData?.summary ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, padding: 14, backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Class Position</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {reportCardData.summary.position
                      ? `${formatOrdinal(reportCardData.summary.position)} of ${reportCardData.summary.totalStudentsInClass} Students`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Average Grade</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-success-text)" }}>
                    {reportCardData.summary.overallAverage !== null ? `${reportCardData.summary.overallAverage}%` : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Subjects Scored</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {reportCardData.summary.subjectsScored} of {reportCardData.summary.subjectsOffered} Subjects
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Release Status</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-brand-teal, #0E7D75)" }}>
                    Officially Released
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13, backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)" }}>
                Terminal examination records are not yet compiled for this student.
              </div>
            )}
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

            {hasPendingPayments && (
              <div
                style={{
                  backgroundColor: "#FEF3C7",
                  border: "1px solid #FCD34D",
                  borderRadius: "var(--radius-control, 8px)",
                  padding: "14px 16px",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#FDE68A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#D97706",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#92400E" }}>
                    Payment Submission Received &amp; Awaiting Bursary Verification
                  </div>
                  <div style={{ fontSize: 12, color: "#78350F", marginTop: 3, lineHeight: 1.45 }}>
                    We received your payment submission of <strong>₦{pendingAmount.toLocaleString("en-NG")}</strong>. The School Bursar is currently verifying it against bank statements.
                    <strong> Please do not submit duplicate payments while verification is underway.</strong> Once verified, your balance will be credited and official receipt issued.
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {pendingChildPayments.map((p) => (
                      <span key={p.id} style={{ fontSize: 11, fontFamily: "monospace", backgroundColor: "#FDE68A", color: "#92400E", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                        Ref: {p.reference} ({formatNaira(p.amount)})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
                    const pendingPayment = inv.payments?.find((p) => p.status === "PENDING");
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
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span className={inv.status === "PAID" ? "pill-success" : inv.status === "PARTIAL" ? "pill-warning" : "pill-danger"}>
                              {inv.status}
                            </span>
                            {pendingPayment && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#B45309", backgroundColor: "#FEF3C7", padding: "1px 6px", borderRadius: 4, display: "inline-block" }}>
                                Awaiting Bursar
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            {pendingPayment ? (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 12,
                                  borderColor: "#FCD34D",
                                  color: "#92400E",
                                  backgroundColor: "#FFFBEB",
                                  fontWeight: 600,
                                }}
                                onClick={() => {
                                  setSelectedInvoiceForPayment(inv);
                                  setIsPaymentModalOpen(true);
                                }}
                              >
                                Payment Submitted
                              </button>
                            ) : balance > 0 ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: "4px 10px", fontSize: 12 }}
                                onClick={() => {
                                  setSelectedInvoiceForPayment(inv);
                                  setIsPaymentModalOpen(true);
                                }}
                              >
                                Pay Online
                              </button>
                            ) : null}
                            <Link href={`/fees/${inv.id}`} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }}>
                              {balance > 0 ? "Details" : "Receipt"}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Health Profile & Clinic Visit Log */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  Health Profile &amp; Sick Bay Record: {activeChild.firstName} {activeChild.lastName}
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  Blood group, genotype safety classification, and official school clinic treatment history.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, padding: 14, backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Genotype</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: activeChild.genotype === "SS" ? "var(--color-brand-crimson, #8B1E1E)" : "var(--color-brand-navy, #0B2545)" }}>
                  {activeChild.genotype || "Not Documented"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Blood Group</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {activeChild.bloodGroup || "Not Documented"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Known Allergies</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: activeChild.allergies && activeChild.allergies !== "None reported" ? "var(--color-brand-crimson, #8B1E1E)" : "var(--color-text-secondary)" }}>
                  {activeChild.allergies || "None reported"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Chronic Conditions</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: activeChild.chronicConditions && activeChild.chronicConditions !== "None" ? "var(--color-brand-crimson, #8B1E1E)" : "var(--color-text-secondary)" }}>
                  {activeChild.chronicConditions || "None"}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Recent Sick Bay Visits:</div>
            {(!activeChild.clinicVisits || activeChild.clinicVisits.length === 0) ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13, backgroundColor: "#F8FAFC", borderRadius: 8 }}>
                No sick bay visits on record for this term. Your child is in good health!
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Complaint</th>
                    <th>Temperature</th>
                    <th>Treatment Given</th>
                    <th>Disposition</th>
                  </tr>
                </thead>
                <tbody>
                  {activeChild.clinicVisits.map((v) => (
                    <tr key={v.id}>
                      <td style={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}>
                        {new Date(v.visitDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ fontWeight: 600 }}>{v.complaint}</td>
                      <td>{v.temperature ? `${v.temperature}°C` : "Normal"}</td>
                      <td style={{ fontSize: 12.5 }}>{v.treatmentGiven || "Observation"}</td>
                      <td>
                        <span className={v.disposition === "RETURNED_TO_CLASS" ? "pill-success" : v.disposition === "RESTING_IN_BAY" ? "pill-warning" : "pill-danger"}>
                          {v.disposition.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Parent Profile Photo Modal */}
      {isProfileModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 440, width: "100%", backgroundColor: "#ffffff" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Parent &amp; Guardian Photo
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              Capture a live portrait using your camera or upload an image file for school security and verification.
            </p>

            <PhotoCaptureInput
              photoUrl={editPhotoUrl}
              onChange={(url) => setEditPhotoUrl(url)}
              label="Passport Photo (Camera or Upload)"
            />

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={savingProfile}
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                {savingProfile ? "Saving..." : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Payment Modal */}
      {selectedInvoiceForPayment && (
        <OnlinePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedInvoiceForPayment(null);
          }}
          invoice={{
            id: selectedInvoiceForPayment.id,
            totalAmount: selectedInvoiceForPayment.totalAmount,
            paidAmount: selectedInvoiceForPayment.paidAmount,
            status: selectedInvoiceForPayment.status,
            term: selectedInvoiceForPayment.term,
            student: activeChild
              ? {
                  firstName: activeChild.firstName,
                  lastName: activeChild.lastName,
                  admissionNumber: activeChild.admissionNumber,
                }
              : null,
          }}
          onSuccess={() => {
            loadParentData();
          }}
        />
      )}
    </div>
  );
}
