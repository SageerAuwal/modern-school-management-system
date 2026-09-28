"use client";

import { useState, useEffect, use, useMemo, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import OfficialCumulativeTranscriptModal from "../../components/OfficialCumulativeTranscriptModal";
import OfficialGraduationTestimonialModal from "../../components/OfficialGraduationTestimonialModal";
import ProcessGraduationModal, { GraduationDataPayload } from "../../components/ProcessGraduationModal";

interface GuardianData {
  id: string;
  relationship: string | null;
  isPrimary: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    photoUrl: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
  } | null;
}

interface StudentDetail {
  id: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  admissionNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  stateOfOrigin: string | null;
  lga: string | null;
  religion: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalNotes: string | null;
  photoUrl: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
  enrollmentStatus: string;
  enrolledAt: string;
  withdrawnAt: string | null;
  school?: {
    id: string;
    name: string;
    address: string | null;
    state: string | null;
    lga: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  } | null;
  enrollments: Array<{
    id: string;
    academicYear: string;
    status: string;
    enrolledAt: string;
    exitedAt?: string | null;
    exitReason?: string | null;
    classSection: {
      id: string;
      name: string;
      level: string;
      academicYear: string;
      teacher?: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        email: string | null;
      } | null;
    };
  }>;
  attendanceRecords: Array<{
    id: string;
    date: string;
    status: string;
    note: string | null;
  }>;
  scores: Array<{
    id: string;
    ca1: number | null;
    ca2: number | null;
    ca3?: number | null;
    exam: number | null;
    total: number | null;
    grade: string | null;
    remark?: string | null;
    academicYear?: string;
    subject: { id: string; name: string; code: string | null };
    term: { id: string; name: string; academicYear: string } | null;
    classSection?: { id: string; name: string; level: string } | null;
  }>;
  invoices: Array<{
    id: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: string | null;
    createdAt: string;
    term?: { id: string; name: string; academicYear: string } | null;
    payments?: Array<{ id: string; amount: number; method: string; paidAt: string; reference?: string }>;
  }>;
  bookLoans: Array<{
    id: string;
    dueDate: string;
    returnedAt: string | null;
    status: string;
    fine: number;
    book: { id: string; title: string; author: string };
  }>;
  clinicVisits?: Array<{
    id: string;
    visitDate: string;
    complaint: string;
    symptoms: string | null;
    diagnosis: string | null;
    treatmentGiven: string | null;
    disposition: string;
  }>;
  guardians: GuardianData[];
  portalUser: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  } | null;
  attendanceStats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    excusedDays: number;
    rate: number;
  };
  feeSummary: {
    totalInvoiced: number;
    totalPaid: number;
    outstandingBalance: number;
  };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getGradePillClass(grade?: string | null): string {
  switch ((grade ?? "").toUpperCase()) {
    case "A":
    case "B":
      return "pill-success";
    case "C":
      return "pill-info";
    case "D":
    case "E":
      return "pill-warning";
    case "F":
      return "pill-danger";
    default:
      return "pill-neutral";
  }
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const { isAdmin } = useCurrentUser();
  const router = useRouter();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"academic" | "attendance" | "fees" | "health" | "portal">("academic");

  // Cumulative Transcript Modal state
  const [showCumulativeTranscriptModal, setShowCumulativeTranscriptModal] = useState(false);

  // Graduation Testimonial Modal state
  const [showGraduationTestimonialModal, setShowGraduationTestimonialModal] = useState(false);
  const [graduationData, setGraduationData] = useState<GraduationDataPayload | undefined>(undefined);

  // Process Graduation Modal state
  const [showProcessGraduationModal, setShowProcessGraduationModal] = useState(false);

  // Reset Password Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Link Guardian Modal state
  const [showLinkGuardianModal, setShowLinkGuardianModal] = useState(false);
  const [availableParents, setAvailableParents] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; phone?: string | null }>>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [selectedGuardianParentId, setSelectedGuardianParentId] = useState("");
  const [selectedGuardianRelationship, setSelectedGuardianRelationship] = useState("Mother");
  const [submittingGuardianLink, setSubmittingGuardianLink] = useState(false);
  const [guardianLinkError, setGuardianLinkError] = useState<string | null>(null);
  const [unlinkingGuardianId, setUnlinkingGuardianId] = useState<string | null>(null);

  const fetchStudent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/students/${studentId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `Failed to load student record (${res.status})`);
      }
      const data = await res.json();
      setStudent(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const handleOpenLinkGuardianModal = async () => {
    setSelectedGuardianParentId("");
    setSelectedGuardianRelationship("Mother");
    setGuardianLinkError(null);
    setShowLinkGuardianModal(true);
    if (availableParents.length === 0) {
      setLoadingParents(true);
      try {
        const res = await fetch(`${API}/api/v1/parents`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setAvailableParents(data);
        }
      } catch (err) {
        console.error("Failed to load parents", err);
      } finally {
        setLoadingParents(false);
      }
    }
  };

  const handleLinkGuardian = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedGuardianParentId) return;
    setSubmittingGuardianLink(true);
    setGuardianLinkError(null);

    try {
      const res = await fetch(`${API}/api/v1/parents/${selectedGuardianParentId}/link-student`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          relationship: selectedGuardianRelationship || "Parent",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to link parent.");

      setActionSuccess("Parent linked to student successfully.");
      setShowLinkGuardianModal(false);
      fetchStudent();
    } catch (err: unknown) {
      setGuardianLinkError(err instanceof Error ? err.message : "Failed to link parent.");
    } finally {
      setSubmittingGuardianLink(false);
    }
  };

  const handleUnlinkGuardian = async (parentId: string) => {
    if (!confirm("Are you sure you want to unlink this parent from this student?")) return;
    setUnlinkingGuardianId(parentId);
    try {
      const res = await fetch(`${API}/api/v1/parents/${parentId}/unlink-student/${studentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setActionSuccess("Parent unlinked successfully.");
        fetchStudent();
      }
    } catch (err) {
      console.error("Failed to unlink parent", err);
    } finally {
      setUnlinkingGuardianId(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setResetError(null);

    if (!newPassword || newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }

    setSubmittingReset(true);
    try {
      const res = await fetch(`${API}/api/v1/students/${studentId}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Failed to reset password.");

      setActionSuccess("Student portal password updated successfully.");
      setShowResetModal(false);
      setNewPassword("");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setSubmittingReset(false);
    }
  };

  // Chronological multi-year terms grouping for transcript timeline
  const chronologicalTerms = useMemo(() => {
    if (!student) return [];

    interface TermSessionGroup {
      sessionKey: string;
      academicYear: string;
      termName: string;
      classSectionName: string;
      classLevel: string;
      classTeacherName?: string;
      scores: StudentDetail["scores"];
      totalScore: number;
      averageScore: number;
    }

    const groups: Record<string, TermSessionGroup> = {};

    student.scores.forEach((score) => {
      const year = score.term?.academicYear || score.academicYear || "2025/2026";
      const termName = score.term?.name || "First Term";
      const key = `${year}___${termName}`;

      if (!groups[key]) {
        const matchingEnrollment = student.enrollments.find(
          (e) => e.academicYear === year || e.classSection.id === score.classSection?.id
        );
        const classSectionName =
          score.classSection?.name || matchingEnrollment?.classSection.name || "Academic Class";
        const classLevel =
          score.classSection?.level || matchingEnrollment?.classSection.level || "Standard";
        const teacher = matchingEnrollment?.classSection.teacher;
        const classTeacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : undefined;

        groups[key] = {
          sessionKey: key,
          academicYear: year,
          termName,
          classSectionName,
          classLevel,
          classTeacherName,
          scores: [],
          totalScore: 0,
          averageScore: 0,
        };
      }

      groups[key].scores.push(score);
    });

    return Object.values(groups)
      .map((g) => {
        const validScores = g.scores.filter((s) => s.total !== null);
        const total = validScores.reduce((sum, s) => sum + (s.total || 0), 0);
        const avg = validScores.length > 0 ? Math.round((total / validScores.length) * 10) / 10 : 0;
        return {
          ...g,
          totalScore: total,
          averageScore: avg,
        };
      })
      .sort((a, b) => b.academicYear.localeCompare(a.academicYear));
  }, [student]);

  // Overall Cumulative GPA & Metrics
  const cumulativeGPA = useMemo(() => {
    if (!student || student.scores.length === 0) return 0;
    const validScores = student.scores.filter((s) => s.total !== null);
    if (validScores.length === 0) return 0;
    const total = validScores.reduce((sum, s) => sum + (s.total || 0), 0);
    return Math.round((total / validScores.length) * 10) / 10;
  }, [student]);

  if (loading) {
    return (
      <div className="page">
        <div style={{ marginBottom: 16 }}>
          <div className="skeleton" style={{ height: 20, width: 140 }} />
        </div>
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="skeleton" style={{ height: 28, width: 220, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, width: 340 }} />
        </div>
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="card"><div className="skeleton" style={{ height: 60 }} /></div>
          <div className="card"><div className="skeleton" style={{ height: 60 }} /></div>
          <div className="card"><div className="skeleton" style={{ height: 60 }} /></div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="page">
        <div style={{ marginBottom: 16 }}>
          <Link href="/students" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>
            &larr; Back to students
          </Link>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <h3 className="empty-state-title">Student not found</h3>
          <p className="empty-state-text">{error ?? "This student record could not be loaded."}</p>
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/students")}>
            Return to Students Directory
          </button>
        </div>
      </div>
    );
  }

  const latestEnrollment = student.enrollments[0];
  const currentClass = latestEnrollment?.classSection?.name ?? "Not enrolled";
  const currentLevel = (latestEnrollment?.classSection?.level ?? "").toUpperCase();

  const isTerminalClass =
    currentLevel.includes("PRI 6") ||
    currentLevel.includes("PRIMARY 6") ||
    currentLevel.includes("BASIC 6") ||
    currentLevel.includes("CLASS 6") ||
    currentLevel.includes("SSS 3") ||
    currentLevel.includes("SS 3") ||
    currentLevel.includes("SSS3") ||
    currentLevel.includes("SS3");

  const isGraduated = student.enrollmentStatus === "GRADUATED";

  const handleGraduationSuccess = (data: GraduationDataPayload) => {
    setGraduationData(data);
    setShowProcessGraduationModal(false);
    setActionSuccess("Student graduation processed successfully! Official Testimonial issued.");
    fetchStudent();
    setShowGraduationTestimonialModal(true);
  };

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/students"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--color-text-secondary)",
            textDecoration: "none",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to students directory
        </Link>
      </div>

      {/* Success alert */}
      {actionSuccess && (
        <div
          className="pill-success"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
          }}
        >
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "inherit" }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Student Profile Header Card */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              backgroundColor: isGraduated ? "#ECFDF5" : "var(--color-primary-subtle, #E6F4F2)",
              color: isGraduated ? "#047857" : "var(--color-primary, #0E7D75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              border: `2px solid ${isGraduated ? "#A7F3D0" : "transparent"}`,
            }}
          >
            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--color-ink)" }}>
                {student.firstName} {student.lastName} {student.otherNames || ""}
              </h1>

              <span
                className={
                  isGraduated
                    ? "pill-success"
                    : student.enrollmentStatus === "ACTIVE"
                    ? "pill-success"
                    : "pill-danger"
                }
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {isGraduated ? "GRADUATED ALUMNUS" : student.enrollmentStatus}
              </span>

              {student.invoices.length > 0 && (
                <span
                  className={
                    student.invoices.some((inv) => inv.status !== "PAID" && inv.status !== "CANCELLED" && inv.status !== "WAIVED")
                      ? "pill-warning"
                      : "pill-success"
                  }
                  style={{ fontSize: 11 }}
                >
                  {student.invoices.some((inv) => inv.status !== "PAID" && inv.status !== "CANCELLED" && inv.status !== "WAIVED")
                    ? "Awaiting Bursary Clearance"
                    : "Financially Cleared"}
                </span>
              )}
            </div>

            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 6, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Adm No: <strong style={{ color: "var(--color-ink)", fontFamily: "monospace" }}>{student.admissionNumber || "—"}</strong></span>
              <span>Class: <strong style={{ color: "var(--color-ink)" }}>{currentClass}</strong></span>
              <span>Gender: <strong style={{ color: "var(--color-ink)" }}>{student.gender || "—"}</strong></span>
              <span>DOB: <strong style={{ color: "var(--color-ink)" }}>{formatDate(student.dateOfBirth)}</strong></span>
              <span>Origin: <strong style={{ color: "var(--color-ink)" }}>{student.stateOfOrigin || "—"} {student.lga ? `(${student.lga})` : ""}</strong></span>
              <span>Enrolled: <strong style={{ color: "var(--color-ink)" }}>{formatDate(student.enrolledAt)}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons Desk */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Cumulative Transcript Action */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowCumulativeTranscriptModal(true)}
            style={{
              fontSize: 12.5,
              padding: "6px 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Cumulative Transcript
          </button>

          {/* Terminal Class Graduation Action */}
          {isTerminalClass && !isGraduated && isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowProcessGraduationModal(true)}
              style={{
                fontSize: 12.5,
                padding: "6px 14px",
                backgroundColor: "var(--color-brand-navy, #0B2545)",
                borderColor: "var(--color-brand-navy, #0B2545)",
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              Process Graduation
            </button>
          )}

          {/* Official Testimonial Action (If Graduated) */}
          {isGraduated && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowGraduationTestimonialModal(true)}
              style={{
                fontSize: 12.5,
                padding: "6px 14px",
                backgroundColor: "var(--color-brand-teal, #0E7D75)",
                borderColor: "var(--color-brand-teal, #0E7D75)",
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
              Official Testimonial
            </button>
          )}

          {isAdmin && student.portalUser && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setResetError(null);
                setNewPassword("");
                setShowResetModal(true);
              }}
              style={{ fontSize: 12.5, padding: "6px 12px" }}
            >
              Reset Portal Password
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Cumulative GPA / Average</div>
          <div className="stat-value" style={{ color: cumulativeGPA >= 75 ? "var(--color-brand-teal, #0E7D75)" : "var(--color-ink)" }}>
            {cumulativeGPA > 0 ? `${cumulativeGPA}%` : "—"}
          </div>
          <div className="stat-sub">Across {student.scores.length} recorded subjects</div>
        </div>

        <div className="card">
          <div className="stat-label">Attendance Rate</div>
          <div className="stat-value">{student.attendanceStats.rate}%</div>
          <div className="stat-sub">
            {student.attendanceStats.presentDays} present of {student.attendanceStats.totalDays} sessions
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Outstanding Fees</div>
          <div
            className="stat-value"
            style={{
              color: student.feeSummary.outstandingBalance > 0 ? "var(--color-danger-text, #DC2626)" : "var(--color-success-text, #16A34A)",
            }}
          >
            ₦{student.feeSummary.outstandingBalance.toLocaleString("en-NG")}
          </div>
          <div className="stat-sub">Total billed: ₦{student.feeSummary.totalInvoiced.toLocaleString("en-NG")}</div>
        </div>

        <div className="card">
          <div className="stat-label">Dossier Standing</div>
          <div className="stat-value" style={{ fontSize: 18, fontWeight: 700, color: "var(--color-brand-navy, #0B2545)" }}>
            {isGraduated ? "Alumnus" : isTerminalClass ? "Terminal Candidate" : "Enrolled Scholar"}
          </div>
          <div className="stat-sub">Session: {latestEnrollment?.academicYear || "2025/2026"}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: "1px solid var(--color-border)", paddingBottom: 8, overflowX: "auto" }}>
        <button
          type="button"
          onClick={() => setActiveTab("academic")}
          className={activeTab === "academic" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "6px 14px", whiteSpace: "nowrap" }}
        >
          Academic Transcript &amp; Timeline
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={activeTab === "attendance" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "6px 14px", whiteSpace: "nowrap" }}
        >
          Attendance Dossier
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fees")}
          className={activeTab === "fees" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "6px 14px", whiteSpace: "nowrap" }}
        >
          Fee Ledger &amp; Clearance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("health")}
          className={activeTab === "health" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "6px 14px", whiteSpace: "nowrap" }}
        >
          Health &amp; Clinic Dossier
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("portal")}
          className={activeTab === "portal" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "6px 14px", whiteSpace: "nowrap" }}
        >
          Portal &amp; Linked Guardians
        </button>
      </div>

      {/* Tab 1: Academic Performance & Multi-Year Timeline */}
      {activeTab === "academic" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Cumulative Dossier Snapshot Header */}
          <div
            className="card"
            style={{
              padding: "18px 22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
              backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
              border: "1px solid var(--color-border, #E2E8F0)",
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--color-ink)" }}>
                Multi-Year Chronological Academic Timeline
              </h2>
              <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Audit-ready academic progression across all instructional sessions at Bright Future Academy.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setShowCumulativeTranscriptModal(true)}
                className="btn btn-primary"
                style={{
                  fontSize: 12.5,
                  padding: "6px 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Official Cumulative Transcript (A4)
              </button>
            </div>
          </div>

          {/* Chronological Vertical Progression Cards */}
          {chronologicalTerms.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
              No examination or continuous assessment records found for this student yet.
            </div>
          ) : (
            chronologicalTerms.map((termGroup, termIdx) => (
              <div
                key={termGroup.sessionKey}
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  borderLeft: `4px solid ${termIdx === 0 ? "var(--color-brand-teal, #0E7D75)" : "var(--color-brand-navy, #0B2545)"}`,
                }}
              >
                {/* Term Header Bar */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "var(--color-ink)" }}>
                        {termGroup.academicYear} &middot; {termGroup.termName}
                      </h3>
                      {termIdx === 0 && (
                        <span className="pill-success" style={{ fontSize: 11 }}>
                          Latest Session
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      Class Section: <strong>{termGroup.classSectionName}</strong> ({termGroup.classLevel})
                      {termGroup.classTeacherName && (
                        <span> &middot; Class Teacher: <strong>{termGroup.classTeacherName}</strong></span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12.5 }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Subjects Scored: </span>
                      <strong style={{ color: "var(--color-ink)" }}>{termGroup.scores.length}</strong>
                    </div>
                    <div style={{ fontSize: 12.5 }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Term Total: </span>
                      <strong style={{ color: "var(--color-brand-navy, #0B2545)" }}>{termGroup.totalScore}</strong>
                    </div>
                    <div style={{ fontSize: 12.5 }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Term Average: </span>
                      <strong style={{ color: "var(--color-brand-teal, #0E7D75)", fontSize: 14 }}>
                        {termGroup.averageScore}%
                      </strong>
                    </div>
                    <Link
                      href="/results"
                      className="btn btn-secondary"
                      style={{ fontSize: 11.5, padding: "4px 10px" }}
                    >
                      Terminal Score Desk
                    </Link>
                  </div>
                </div>

                {/* Term Scores Table */}
                <div style={{ overflowX: "auto" }}>
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th style={{ width: 80 }}>Code</th>
                        <th style={{ textAlign: "right", width: 85 }}>CA 1 (20)</th>
                        <th style={{ textAlign: "right", width: 85 }}>CA 2 (20)</th>
                        <th style={{ textAlign: "right", width: 85 }}>Exam (60)</th>
                        <th style={{ textAlign: "right", width: 95 }}>Total (100)</th>
                        <th style={{ textAlign: "center", width: 75 }}>Grade</th>
                        <th style={{ width: 130 }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {termGroup.scores.map((score) => (
                        <tr key={score.id}>
                          <td style={{ fontWeight: 600 }}>{score.subject.name}</td>
                          <td style={{ color: "var(--color-text-secondary)", fontFamily: "monospace", fontSize: 12 }}>
                            {score.subject.code || "—"}
                          </td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{score.ca1 ?? "—"}</td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{score.ca2 ?? "—"}</td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{score.exam ?? "—"}</td>
                          <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--color-brand-navy, #0B2545)" }}>
                            {score.total ?? "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={getGradePillClass(score.grade)}>
                              {score.grade || "—"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                            {score.remark ||
                              (score.grade === "A"
                                ? "Excellent"
                                : score.grade === "B"
                                ? "Very Good"
                                : score.grade === "C"
                                ? "Credit"
                                : score.grade === "D"
                                ? "Pass"
                                : score.grade === "F"
                                ? "Fail"
                                : "Satisfactory")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}

          {/* Historical Class Enrollment Timeline */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px 0", color: "var(--color-ink)" }}>
              Institutional Enrollment History
            </h3>
            {student.enrollments.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>No enrollment history recorded.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {student.enrollments.map((enr, idx) => (
                  <div
                    key={enr.id}
                    style={{
                      padding: "10px 14px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-control)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: idx === 0 ? "var(--color-surface-subtle, #F8FAFC)" : "#FFFFFF",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--color-ink)" }}>
                        {enr.classSection.name}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 8 }}>
                        ({enr.classSection.level}) &middot; Session: {enr.academicYear}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        Enrolled: {formatDate(enr.enrolledAt)}
                      </span>
                      <span
                        className={
                          enr.status === "ACTIVE"
                            ? "pill-success"
                            : enr.status === "GRADUATED"
                            ? "pill-success"
                            : "pill-neutral"
                        }
                        style={{ fontSize: 11 }}
                      >
                        {enr.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Record */}
      {activeTab === "attendance" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
              Attendance History (Recent Days)
            </h2>
            <span className="pill-success" style={{ fontSize: 12 }}>
              {student.attendanceStats.rate}% Overall Rate
            </span>
          </div>

          {student.attendanceRecords.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
              No attendance logs found for this student.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Attendance Status</th>
                  <th>Notes / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {student.attendanceRecords.map((att) => {
                  let pillClass = "pill-neutral";
                  if (att.status === "PRESENT") pillClass = "pill-success";
                  else if (att.status === "ABSENT") pillClass = "pill-danger";
                  else if (att.status === "LATE") pillClass = "pill-warning";
                  else if (att.status === "EXCUSED") pillClass = "pill-info";

                  return (
                    <tr key={att.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(att.date)}</td>
                      <td>
                        <span className={pillClass}>{att.status}</span>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                        {att.note || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Fees & Billing */}
      {activeTab === "fees" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
              Invoices &amp; Payment Receipts
            </h2>
            {isAdmin && (
              <Link href="/fees/bursar" className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }}>
                Bursary Clearance Desk
              </Link>
            )}
          </div>

          {student.invoices.some((inv) => inv.status !== "PAID" && inv.status !== "CANCELLED" && inv.status !== "WAIVED") && (
            <div
              style={{
                margin: 16,
                padding: "12px 16px",
                backgroundColor: "#FFFBEB",
                border: "1px solid #FCD34D",
                borderRadius: "var(--radius-control)",
                fontSize: 12.5,
                color: "#92400E",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <strong>Awaiting Bursary Clearance:</strong> Unverified fee obligations remain pending on this student&apos;s account. Official examination entry slips remain provisional until verified by the School Bursar.
              </div>
              <Link href="/fees/bursar" className="btn btn-secondary" style={{ fontSize: 11.5, padding: "3px 8px" }}>
                Verify at Bursary
              </Link>
            </div>
          )}

          {student.invoices.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
              No fee invoices have been issued for this student yet.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date Issued</th>
                  <th>Total Billed</th>
                  <th>Amount Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {student.invoices.map((inv) => {
                  const bal = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
                  return (
                    <tr key={inv.id}>
                      <td>{formatDate(inv.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>₦{Number(inv.totalAmount).toLocaleString("en-NG")}</td>
                      <td style={{ color: "var(--color-success-text, #16A34A)" }}>
                        ₦{Number(inv.paidAmount).toLocaleString("en-NG")}
                      </td>
                      <td style={{ fontWeight: 700, color: bal > 0 ? "var(--color-danger-text, #DC2626)" : "inherit" }}>
                        ₦{bal.toLocaleString("en-NG")}
                      </td>
                      <td>
                        <span className={inv.status === "PAID" ? "pill-success" : inv.status === "PARTIAL" ? "pill-warning" : "pill-danger"}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/fees/${inv.id}`} className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 8px" }}>
                          View Invoice
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 4: Health & Clinic Dossier */}
      {activeTab === "health" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {/* Medical Profile Card */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px 0", color: "var(--color-ink)" }}>
              Clinical Profile &amp; Vitals
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Blood Group: </span>
                <strong style={{ color: "var(--color-ink)" }}>{student.bloodGroup || "Not recorded"}</strong>
              </div>

              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Genotype: </span>
                <strong style={{ color: "var(--color-ink)" }}>{student.genotype || "Not recorded"}</strong>
              </div>

              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Known Allergies: </span>
                <strong style={{ color: student.allergies ? "#DC2626" : "var(--color-ink)" }}>
                  {student.allergies || "None reported"}
                </strong>
              </div>

              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Chronic Conditions: </span>
                <strong style={{ color: student.chronicConditions ? "#DC2626" : "var(--color-ink)" }}>
                  {student.chronicConditions || "None recorded"}
                </strong>
              </div>

              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>Emergency Contact: </span>
                <strong style={{ color: "var(--color-ink)" }}>
                  {student.emergencyContactName || "Guardian on record"}
                  {student.emergencyContactPhone ? ` (${student.emergencyContactPhone})` : ""}
                </strong>
              </div>

              {student.medicalNotes && (
                <div style={{ marginTop: 8, padding: 10, backgroundColor: "var(--color-surface-subtle)", borderRadius: 6 }}>
                  <span style={{ color: "var(--color-text-secondary)", display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                    Clinical Remarks:
                  </span>
                  <p style={{ margin: "4px 0 0 0", fontSize: 12.5 }}>{student.medicalNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Clinic Visitation Log Card */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                School Clinic Triage Log
              </h2>
            </div>

            {!student.clinicVisits || student.clinicVisits.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                No clinic triage visits recorded for this student.
              </div>
            ) : (
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Visit Date</th>
                    <th>Chief Complaint</th>
                    <th>Diagnosis &amp; Care</th>
                    <th>Disposition</th>
                  </tr>
                </thead>
                <tbody>
                  {student.clinicVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(visit.visitDate)}</td>
                      <td>{visit.complaint}</td>
                      <td style={{ fontSize: 12 }}>
                        <div><strong>Diagnosis:</strong> {visit.diagnosis || "Under evaluation"}</div>
                        {visit.treatmentGiven && (
                          <div style={{ color: "var(--color-text-secondary)" }}><strong>Care:</strong> {visit.treatmentGiven}</div>
                        )}
                      </td>
                      <td>
                        <span className="pill-neutral" style={{ fontSize: 11 }}>
                          {visit.disposition.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Portal & Linked Guardians */}
      {activeTab === "portal" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {/* Left: Student Portal Account */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px 0", color: "var(--color-ink)" }}>
              Student Portal Access
            </h2>

            {student.portalUser ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>Login Email: </span>
                  <span style={{ fontWeight: 600 }}>{student.portalUser.email}</span>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>Portal Status: </span>
                  <span className={student.portalUser.isActive ? "pill-success" : "pill-danger"}>
                    {student.portalUser.isActive ? "Active" : "Suspended"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>Last Login: </span>
                  <span>{formatDate(student.portalUser.lastLoginAt)}</span>
                </div>

                {isAdmin && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setResetError(null);
                        setNewPassword("");
                        setShowResetModal(true);
                      }}
                    >
                      Reset Student Password
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                No student portal account created for this student. Student uses standard school records.
              </p>
            )}
          </div>

          {/* Right: Linked Guardians */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Linked Parents &amp; Guardians ({student.guardians.length})
              </h2>
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleOpenLinkGuardianModal}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  Link a Parent
                </button>
              )}
            </div>

            {student.guardians.length === 0 ? (
              <div>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  No registered portal parents linked yet.
                </p>
                {student.guardianName && (
                  <div style={{ fontSize: 13, color: "var(--color-ink)", marginBottom: 10 }}>
                    Paper Record: <strong>{student.guardianName}</strong> ({student.guardianRelationship || "Guardian"}) &middot; {student.guardianPhone || "No phone"}
                  </div>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleOpenLinkGuardianModal}
                    style={{ fontSize: 12, padding: "6px 12px" }}
                  >
                    Link a Registered Parent
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {student.guardians.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      padding: 12,
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-control)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--color-ink)", fontSize: 14 }}>
                        {g.user ? `${g.user.firstName} ${g.user.lastName}` : "Guardian"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        {g.relationship || "Guardian"} &middot; {g.user?.email || "No email"} &middot; {g.user?.phone || ""}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {g.user && (
                        <Link
                          href={`/parents/${g.user.id}`}
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: "4px 8px" }}
                        >
                          Parent Account
                        </Link>
                      )}
                      {isAdmin && g.user && (
                        <button
                          type="button"
                          onClick={() => handleUnlinkGuardian(g.user!.id)}
                          disabled={unlinkingGuardianId === g.user.id}
                          style={{
                            border: "1px solid var(--color-danger-border, #FECACA)",
                            backgroundColor: "var(--color-danger-bg, #FEF2F2)",
                            color: "var(--color-danger-text, #991B1B)",
                            padding: "4px 8px",
                            borderRadius: "var(--radius-control)",
                            fontSize: 11,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          {unlinkingGuardianId === g.user.id ? "Unlinking..." : "Unlink"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Official Cumulative Transcript */}
      <OfficialCumulativeTranscriptModal
        isOpen={showCumulativeTranscriptModal}
        onClose={() => setShowCumulativeTranscriptModal(false)}
        student={{
          ...student,
          scores: student.scores.map((s) => ({
            ...s,
            academicYear: s.term?.academicYear || s.academicYear || "2025/2026",
          })),
        }}
      />

      {/* Modal: Official Graduation Testimonial */}
      <OfficialGraduationTestimonialModal
        isOpen={showGraduationTestimonialModal}
        onClose={() => setShowGraduationTestimonialModal(false)}
        student={student}
        graduationData={graduationData}
      />

      {/* Modal: Process Graduation */}
      <ProcessGraduationModal
        isOpen={showProcessGraduationModal}
        onClose={() => setShowProcessGraduationModal(false)}
        student={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          currentClass,
          level: currentLevel,
        }}
        onSuccess={handleGraduationSuccess}
      />

      {/* Modal: Reset Student Password */}
      {showResetModal && isAdmin && (
        <div
          className="modal-overlay"
          onClick={() => setShowResetModal(false)}
        >
          <div className="modal-card" style={{ maxWidth: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Reset Student Password
              </h2>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
              Enter a new login password for {student.firstName} {student.lastName}.
            </p>

            {resetError && (
              <div className="pill-danger" style={{ marginBottom: 14, padding: "6px 10px", fontSize: 12 }}>
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">New Password *</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submittingReset}
                  onClick={() => setShowResetModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingReset}
                >
                  {submittingReset ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Parent / Guardian */}
      {showLinkGuardianModal && isAdmin && (
        <div
          className="modal-overlay"
          onClick={() => setShowLinkGuardianModal(false)}
        >
          <div className="modal-card" style={{ maxWidth: 460, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Link Parent / Guardian
              </h2>
              <button
                type="button"
                onClick={() => setShowLinkGuardianModal(false)}
                style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
              Select a registered parent to link to {student.firstName} {student.lastName}.
            </p>

            {guardianLinkError && (
              <div className="pill-danger" style={{ marginBottom: 14, padding: "6px 10px", fontSize: 12 }}>
                {guardianLinkError}
              </div>
            )}

            <form onSubmit={handleLinkGuardian}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Registered Parent / Guardian *</label>
                {loadingParents ? (
                  <div className="skeleton" style={{ height: 38 }} />
                ) : availableParents.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    No registered parents found. Register a parent under <Link href="/parents" style={{ textDecoration: "underline" }}>Parents Directory</Link> first.
                  </div>
                ) : (
                  <select
                    className="input"
                    value={selectedGuardianParentId}
                    onChange={(e) => setSelectedGuardianParentId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Parent / Guardian --</option>
                    {availableParents
                      .filter((p) => !student.guardians.some((g) => g.user?.id === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} ({p.phone || p.email})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="label">Relationship *</label>
                <select
                  className="input"
                  value={selectedGuardianRelationship}
                  onChange={(e) => setSelectedGuardianRelationship(e.target.value)}
                  required
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLinkGuardianModal(false)}
                  disabled={submittingGuardianLink}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingGuardianLink || !selectedGuardianParentId}
                >
                  {submittingGuardianLink ? "Linking..." : "Link Parent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
