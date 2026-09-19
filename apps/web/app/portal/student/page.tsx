"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import OnlinePaymentModal from "../../components/OnlinePaymentModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

interface ClassSubject {
  id: string;
  subject: { id: string; name: string; code: string | null };
  teacher?: { firstName: string; lastName: string } | null;
}

interface ClassSection {
  id: string;
  name: string;
  level: string;
  academicYear?: string;
  teacher?: Teacher | null;
  classSubjects?: ClassSubject[];
}

interface Enrollment {
  id: string;
  academicYear: string;
  status: string;
  classSection: ClassSection;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  rate: number;
}

interface BookLoan {
  id: string;
  dueDate: string;
  status: string;
  fine?: number | null;
  book: { id: string; title: string; author: string };
}

interface TransportAssignment {
  id: string;
  pickupStop: string;
  dropoffStop: string;
  bus: {
    name: string;
    plateNumber: string;
    capacity: number;
    driverName: string;
    driverPhone: string;
  };
  route: {
    name: string;
    description?: string | null;
    stops: Array<{ stopName: string; pickupTime?: string | null; landmark?: string | null }>;
  };
}

interface Invoice {
  id: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate?: string | null;
  term?: { id?: string; name: string; academicYear?: string } | null;
}

interface FeeSummary {
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
}

interface Guardian {
  id?: string;
  relationship: string;
  isPrimary: boolean;
  user?: {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
  } | null;
}

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  gender: string | null;
  photoUrl?: string | null;
  enrollmentStatus: string;
  enrollments?: Enrollment[];
  attendanceStats?: AttendanceStats;
  feeSummary?: FeeSummary;
  invoices?: Invoice[];
  bookLoans?: BookLoan[];
  transportAssignments?: TransportAssignment[];
  guardians?: Guardian[];
}

interface ReportCardSummary {
  subjectsOffered: number;
  subjectsScored: number;
  overallTotal: number;
  overallAverage: number | null;
  position: number | null;
  totalStudentsInClass: number;
}

function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatOrdinal(n: number | null): string {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function StudentPortalPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [reportCardSummary, setReportCardSummary] = useState<ReportCardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const loadStudentData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/students/my-profile`, { credentials: "include" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message ?? "Failed to load student profile");
      }
      const data: StudentProfile = await res.json();
      setProfile(data);

      // Fetch official report card summary for academic performance
      try {
        const rcRes = await fetch(`${API}/api/v1/scores/report-card/${data.id}`, { credentials: "include" });
        if (rcRes.ok) {
          const rcData = await rcRes.json();
          if (rcData?.summary) {
            setReportCardSummary(rcData.summary);
          }
        }
      } catch {
        // Report card may be pending
      }
    } catch (err: any) {
      setError(err.message || "Failed to load student profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    loadStudentData();
  }, [loadStudentData]);

  const currentEnrollment = profile?.enrollments?.[0];
  const currentClass = currentEnrollment?.classSection;
  const formTeacher = currentClass?.teacher;
  const transport = profile?.transportAssignments?.[0];
  const primaryGuardian = profile?.guardians?.find((g) => g.isPrimary) || profile?.guardians?.[0];

  return (
    <div className="page">
      {/* Student Banner */}
      <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--color-ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar" style={{ width: 52, height: 52, fontSize: 18, overflow: "hidden" }}>
              {profile?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : profile ? (
                `${profile.firstName[0]}${profile.lastName[0]}`
              ) : (
                "ST"
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Student Portal • {profile?.enrollmentStatus ?? "Enrolled"}
                </span>
                <span className="pill-success" style={{ fontSize: 10, padding: "1px 6px" }}>Active Account</span>
              </div>
              <h1 className="page-title" style={{ marginTop: 2, fontSize: 22 }}>
                {profile ? `${profile.firstName} ${profile.lastName}` : "Student Portal"}
              </h1>
              <p className="page-subtitle" style={{ margin: "2px 0 0" }}>
                Admission: <strong>{profile?.admissionNumber ?? "Pending"}</strong> • Class:{" "}
                <strong>{currentClass?.name ?? "Assigned Class"}</strong> • Form Teacher:{" "}
                <strong>
                  {formTeacher ? `${formTeacher.firstName} ${formTeacher.lastName}` : "Assigned"}
                </strong>
                {formTeacher?.phone && ` (${formTeacher.phone})`}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/results" className="btn btn-primary">
              View Report Card
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 260 }} />
      ) : error ? (
        <div className="card empty-state">
          <div className="empty-state-title">Profile Unavailable</div>
          <div className="empty-state-text">{error}</div>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>
            Please ensure you are signed in with your official student account credentials.
          </p>
        </div>
      ) : !profile ? (
        <div className="card empty-state">
          <div className="empty-state-title">No student record found</div>
          <div className="empty-state-text">No active enrollment record linked to this login account.</div>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {/* Fee Balance Card */}
            <div className="card">
              <div className="stat-label">Fee Balance</div>
              <div
                className="stat-value"
                style={{
                  fontSize: 20,
                  color: (profile.feeSummary?.outstandingBalance ?? 0) > 0 ? "var(--color-danger-text)" : "var(--color-success-text)",
                }}
              >
                {formatNaira(profile.feeSummary?.outstandingBalance ?? 0)}
              </div>
              <div className="stat-sub" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <span>
                  {(profile.feeSummary?.outstandingBalance ?? 0) > 0 ? (
                    <span style={{ color: "var(--color-danger-text)", fontWeight: 700 }}>Payment Due</span>
                  ) : (
                    <span style={{ color: "var(--color-success-text)", fontWeight: 700 }}>All Cleared</span>
                  )}
                </span>
                {(profile.feeSummary?.outstandingBalance ?? 0) > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: 11, padding: "2px 8px" }}
                    onClick={() => {
                      const firstUnpaid = profile.invoices?.find((i) => i.status !== "PAID");
                      if (firstUnpaid) {
                        setSelectedInvoiceForPayment(firstUnpaid);
                        setIsPaymentModalOpen(true);
                      }
                    }}
                  >
                    Pay Online
                  </button>
                )}
              </div>
            </div>

            <div className="card">
              <div className="stat-label">Term Attendance</div>
              <div className="stat-value" style={{ color: "var(--color-success-text)" }}>
                {profile.attendanceStats?.rate ?? 100}%
              </div>
              <div className="stat-sub">
                {profile.attendanceStats
                  ? `${profile.attendanceStats.presentDays} of ${profile.attendanceStats.totalDays} sessions present`
                  : "Consistent record"}
              </div>
            </div>

            <div className="card">
              <div className="stat-label">Class Standing</div>
              <div className="stat-value" style={{ color: "var(--color-ink)", fontSize: 20 }}>
                {reportCardSummary?.position
                  ? `${formatOrdinal(reportCardSummary.position)} Position`
                  : "Ranked"}
              </div>
              <div className="stat-sub">
                {reportCardSummary?.overallAverage
                  ? `Average: ${reportCardSummary.overallAverage}% (${reportCardSummary.totalStudentsInClass} students)`
                  : "First Term 2025/2026"}
              </div>
            </div>

            <div className="card">
              <div className="stat-label">Library Books</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {(profile.bookLoans ?? []).length}{" "}
                <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-secondary)" }}>
                  on loan
                </span>
              </div>
              <div className="stat-sub">
                {(profile.bookLoans ?? []).filter((l) => l.status === "OVERDUE").length > 0 ? (
                  <span style={{ color: "var(--color-danger-text)", fontWeight: 600 }}>
                    {(profile.bookLoans ?? []).filter((l) => l.status === "OVERDUE").length} overdue
                  </span>
                ) : (
                  "All returns on time"
                )}
              </div>
            </div>

            <div className="card">
              <div className="stat-label">Transport Pass</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                {transport ? transport.bus.name : "Standard Walk"}
              </div>
              <div className="stat-sub">
                {transport ? transport.bus.plateNumber : "Self-transport"}
              </div>
            </div>
          </div>

          {/* Academic Results Card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Terminal Academic Performance</h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  Review continuous assessment (CA), examination results, and teacher remarks.
                </p>
              </div>
              <Link href="/results" className="btn btn-primary" style={{ fontSize: 13 }}>
                Check Official Report Card
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, padding: 14, backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Class Rank</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {reportCardSummary?.position
                    ? `${formatOrdinal(reportCardSummary.position)} of ${reportCardSummary.totalStudentsInClass} Students`
                    : "Published"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Average Score</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-success-text)" }}>
                  {reportCardSummary?.overallAverage ? `${reportCardSummary.overallAverage}%` : "Top Performer"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Subjects Scored</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {reportCardSummary ? `${reportCardSummary.subjectsScored} of ${reportCardSummary.subjectsOffered} Subjects` : "7 Subjects"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Current Session</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>2025/2026 Academic Year</div>
              </div>
            </div>
          </div>

          {/* Two-Column Grid: Transport & Library */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, marginBottom: 24 }}>
            {/* School Bus Assignment */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>School Bus &amp; Route</h2>
                <span className={transport ? "pill-success" : "pill-neutral"}>
                  {transport ? "Active Pass" : "Self Transport"}
                </span>
              </div>

              {transport ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Assigned Bus:</span>
                    <strong>{transport.bus.name} ({transport.bus.plateNumber})</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Designated Route:</span>
                    <strong>{transport.route.name}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Pickup Location:</span>
                    <strong>{transport.pickupStop}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Morning Schedule:</span>
                    <strong>{transport.route.stops?.[0]?.pickupTime ?? "07:05 AM"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Driver Contact:</span>
                    <strong>{transport.bus.driverName} ({transport.bus.driverPhone})</strong>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                  No active school bus pass assigned. Contact the school transport desk to enroll for morning and afternoon shuttles.
                </div>
              )}
            </div>

            {/* Library Books on Loan */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Library Books on Loan</h2>
                <Link href="/library" style={{ fontSize: 12, color: "var(--color-ink)", fontWeight: 600 }}>
                  Browse Catalog
                </Link>
              </div>

              {(!profile.bookLoans || profile.bookLoans.length === 0) ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                  No active book loans. Visit the school library to borrow reading and reference books.
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.bookLoans.map((loan) => (
                      <tr key={loan.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div>{loan.book.title}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 400 }}>{loan.book.author}</div>
                        </td>
                        <td>{new Date(loan.dueDate).toLocaleDateString()}</td>
                        <td>
                          <span className={loan.status === "OVERDUE" ? "pill-danger" : "pill-info"}>
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Two-Column Grid: Fee Status & Subjects */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
            {/* School Fees Invoices Overview */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>School Fees Summary</h2>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
                    Annual Session Fee: ₦50,000 across 3 terms.
                  </p>
                </div>
                <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Outstanding: </span>
                    <strong style={{ color: (profile.feeSummary?.outstandingBalance ?? 0) > 0 ? "var(--color-danger-text)" : "var(--color-success-text)" }}>
                      {formatNaira(profile.feeSummary?.outstandingBalance ?? 0)}
                    </strong>
                  </div>
                  {(profile.feeSummary?.outstandingBalance ?? 0) > 0 && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                      onClick={() => {
                        const firstUnpaid = profile.invoices?.find((i) => i.status !== "PAID");
                        if (firstUnpaid) {
                          setSelectedInvoiceForPayment(firstUnpaid);
                          setIsPaymentModalOpen(true);
                        }
                      }}
                    >
                      Pay Online
                    </button>
                  )}
                </div>
              </div>

              {(!profile.invoices || profile.invoices.length === 0) ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                  No fee invoices issued yet.
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Term</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.invoices.map((inv) => {
                      const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600 }}>{inv.term?.name ?? "Academic Term"}</td>
                          <td>{formatNaira(inv.totalAmount)}</td>
                          <td style={{ color: "var(--color-success-text)" }}>{formatNaira(inv.paidAmount)}</td>
                          <td>
                            <span className={inv.status === "PAID" ? "pill-success" : inv.status === "PARTIAL" ? "pill-warning" : "pill-danger"}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {balance > 0 ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: 11, padding: "4px 10px" }}
                                onClick={() => {
                                  setSelectedInvoiceForPayment(inv);
                                  setIsPaymentModalOpen(true);
                                }}
                              >
                                Pay Online
                              </button>
                            ) : (
                              <Link
                                href={`/fees/${inv.id}`}
                                className="btn btn-secondary"
                                style={{ fontSize: 11, padding: "4px 10px" }}
                              >
                                Receipt
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Class Subjects & Teachers */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Enrolled Subjects</h2>
                <span className="pill-neutral" style={{ fontSize: 11 }}>
                  {currentClass?.classSubjects?.length ?? 0} Subjects
                </span>
              </div>

              {(!currentClass?.classSubjects || currentClass.classSubjects.length === 0) ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                  No subjects listed for this class section.
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Subject Name</th>
                      <th>Subject Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentClass.classSubjects.map((cs) => (
                      <tr key={cs.id}>
                        <td style={{ fontWeight: 700, fontSize: 12 }}>{cs.subject.code ?? "—"}</td>
                        <td style={{ fontWeight: 600 }}>{cs.subject.name}</td>
                        <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
                          {cs.teacher ? `${cs.teacher.firstName} ${cs.teacher.lastName}` : "Assigned Staff"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {primaryGuardian && primaryGuardian.user && (
                <div style={{ marginTop: 16, padding: 12, backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)", fontSize: 12 }}>
                  <span style={{ color: "var(--color-text-secondary)", textTransform: "uppercase", fontSize: 10, fontWeight: 600 }}>
                    Registered Guardian:
                  </span>{" "}
                  <strong>{primaryGuardian.user.firstName} {primaryGuardian.user.lastName}</strong> ({primaryGuardian.relationship}) • {primaryGuardian.user.phone ?? "No phone recorded"}
                </div>
              )}
            </div>
          </div>
        </>
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
            student: profile
              ? {
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                  admissionNumber: profile.admissionNumber,
                }
              : null,
          }}
          onSuccess={() => {
            loadStudentData();
          }}
        />
      )}
    </div>
  );
}

