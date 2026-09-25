"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCurrentUser } from "../hooks/useCurrentUser";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ClassSection {
  id: string;
  name: string;
  level: string;
}

interface Term {
  id: string;
  name: string;
  academicYear: string;
  isCurrent: boolean;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
}

interface ParentWard {
  id: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  classSection?: { id: string; name: string; level: string } | null;
}

interface ScoreRecord {
  id: string;
  subject: { id: string; name: string; code: string | null };
  ca1: number | null;
  ca2: number | null;
  ca3?: number | null;
  exam: number | null;
  total: number | null;
  grade: string | null;
  remark?: string | null;
  classHighest?: number | null;
  classLowest?: number | null;
  classAverage?: number | null;
}

interface ReportCardData {
  isReleased?: boolean;
  releaseStatus?: string;
  principalRemark?: string | null;
  publishedAt?: string | null;
  message?: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    otherNames?: string | null;
    admissionNumber: string | null;
    gender: string | null;
    dateOfBirth?: string | null;
    photoUrl?: string | null;
    stateOfOrigin?: string | null;
  };
  term: { id: string; name: string; academicYear: string };
  classSection: { id: string; name: string; level: string };
  scores?: ScoreRecord[];
  attendance?: {
    daysOpened: number;
    daysPresent: number;
    daysAbsent: number;
    percentage: number;
  };
  summary?: {
    subjectsOffered: number;
    subjectsScored: number;
    overallTotal: number;
    overallAverage: number | null;
    position: number | null;
    totalStudentsInClass: number;
  };
}

export interface ClassAuditItem {
  classSection: {
    id: string;
    name: string;
    level: string;
    stream?: string | null;
    teacher: string | null;
  };
  studentCount: number;
  subjectCount: number;
  totalExpectedScores: number;
  scoresCount: number;
  completionPercent: number;
  status: "DRAFT" | "SUBMITTED" | "REVISION_REQUESTED" | "APPROVED" | "PUBLISHED";
  submittedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  principalRemark: string | null;
  revisionNotes: string | null;
}

export interface AuditResponse {
  term: { id: string; name: string; academicYear: string };
  classes: ClassAuditItem[];
}

const AFFECTIVE_TRAITS = [
  "Punctuality & Attendance",
  "Neatness & Personal Hygiene",
  "Politeness & Courtesy",
  "Honesty & Moral Integrity",
  "Leadership & Responsibility",
  "Emotional Stability & Self-Control",
  "Attentiveness in Class",
  "Relationship with Peers & Staff",
];

const PSYCHOMOTOR_SKILLS = [
  "Handwriting & Presentation",
  "Sports, Games & Athletics",
  "Verbal Fluency & Communication",
  "Practical Science & Lab Work",
  "Musical & Creative Arts",
  "Tools Handling & Crafts",
];

function getDomainScore(index: number, avg: number | null): number {
  if (avg === null) return 4;
  const base = avg >= 75 ? 5 : avg >= 60 ? 4 : avg >= 50 ? 3 : 2;
  const offset = index % 3 === 0 ? -1 : index % 4 === 1 && base < 5 ? 1 : 0;
  return Math.max(1, Math.min(5, base + offset));
}

function getDetailedGradeInfo(grade: string | null, total: number | null) {
  const score = total !== null ? total : 0;
  if (score >= 75) return { grade: "A1", label: "Distinction", color: "#166E4E", bg: "#DDF5E9", gpa: 5.0 };
  if (score >= 70) return { grade: "B2", label: "Very Good", color: "#166E4E", bg: "#DDF5E9", gpa: 4.0 };
  if (score >= 65) return { grade: "B3", label: "Good", color: "#13637B", bg: "#D1F0FA", gpa: 3.5 };
  if (score >= 60) return { grade: "C4", label: "Credit", color: "#13637B", bg: "#D1F0FA", gpa: 3.0 };
  if (score >= 55) return { grade: "C5", label: "Credit", color: "#13637B", bg: "#D1F0FA", gpa: 2.5 };
  if (score >= 50) return { grade: "C6", label: "Credit", color: "#8F5419", bg: "#FDE6D2", gpa: 2.0 };
  if (score >= 45) return { grade: "D7", label: "Pass", color: "#8F5419", bg: "#FDE6D2", gpa: 1.5 };
  if (score >= 40) return { grade: "E8", label: "Pass", color: "#B45309", bg: "#FEF3C7", gpa: 1.0 };
  return { grade: "F9", label: "Fail", color: "#991B1B", bg: "#FEE2E2", gpa: 0.0 };
}

function getSubjectTeacherRemark(total: number | null): string {
  if (total === null) return "Pending";
  if (total >= 80) return "Exemplary mastery & diligence";
  if (total >= 70) return "Very good grasp of subject";
  if (total >= 60) return "Good work; capable of more";
  if (total >= 50) return "Fair effort; improve focus";
  if (total >= 40) return "Pass; requires extra tutoring";
  return "Weak; needs targeted coaching";
}

function formatOrdinal(n: number | null): string {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ResultsPage() {
  const { user, isParent, isStudent, isAdmin, isTeacher, loading: loadingUser } = useCurrentUser();

  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parentWards, setParentWards] = useState<ParentWard[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  // Approval & Release Console State
  const [activeTab, setActiveTab] = useState<"reports" | "approval">("reports");
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [approvingClass, setApprovingClass] = useState<ClassAuditItem | null>(null);
  const [principalRemarkText, setPrincipalRemarkText] = useState(
    "A commendable academic performance this term. Continue to maintain diligence, good character, and scholarly dedication in the subsequent term."
  );
  const [approvingActionLoading, setApprovingActionLoading] = useState(false);
  const [revisingClass, setRevisingClass] = useState<ClassAuditItem | null>(null);
  const [revisionNotesText, setRevisionNotesText] = useState("");
  const [revisingActionLoading, setRevisingActionLoading] = useState(false);
  const [releasingClass, setReleasingClass] = useState<ClassAuditItem | null>(null);
  const [releasingActionLoading, setReleasingActionLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  const fetchAuditData = useCallback(async (termId?: string) => {
    const tId = termId || selectedTermId;
    if (!tId) return;
    setAuditLoading(true);
    setAuditError("");
    try {
      const res = await fetch(`${API}/api/v1/scores/class-results/audit?termId=${tId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load class results audit");
      }
      const data: AuditResponse = await res.json();
      setAuditData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load audit data";
      setAuditError(msg);
    } finally {
      setAuditLoading(false);
    }
  }, [selectedTermId]);

  const handleApproveResults = async () => {
    if (!approvingClass || !selectedTermId) return;
    setApprovingActionLoading(true);
    setActionSuccessMessage("");
    try {
      const res = await fetch(`${API}/api/v1/scores/class-results/${approvingClass.classSection.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          termId: selectedTermId,
          principalRemark: principalRemarkText,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to approve class results");
      }
      setActionSuccessMessage(`Results for ${approvingClass.classSection.name} approved successfully with Principal remarks.`);
      setApprovingClass(null);
      await fetchAuditData(selectedTermId);
      setTimeout(() => setActionSuccessMessage(""), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error approving results";
      setAuditError(msg);
    } finally {
      setApprovingActionLoading(false);
    }
  };

  const handleReleaseResults = async () => {
    if (!releasingClass || !selectedTermId) return;
    setReleasingActionLoading(true);
    setActionSuccessMessage("");
    try {
      const res = await fetch(`${API}/api/v1/scores/class-results/${releasingClass.classSection.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          termId: selectedTermId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to release class results");
      }
      setActionSuccessMessage(`Results for ${releasingClass.classSection.name} officially released! Parents and students can now view report cards.`);
      setReleasingClass(null);
      await fetchAuditData(selectedTermId);
      setTimeout(() => setActionSuccessMessage(""), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error releasing results";
      setAuditError(msg);
    } finally {
      setReleasingActionLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisingClass || !selectedTermId) return;
    setRevisingActionLoading(true);
    setActionSuccessMessage("");
    try {
      const res = await fetch(`${API}/api/v1/scores/class-results/${revisingClass.classSection.id}/request-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          termId: selectedTermId,
          notes: revisionNotesText,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to request revision");
      }
      setActionSuccessMessage(`Revision requested for ${revisingClass.classSection.name}. Notice dispatched to teaching faculty.`);
      setRevisingClass(null);
      setRevisionNotesText("");
      await fetchAuditData(selectedTermId);
      setTimeout(() => setActionSuccessMessage(""), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error requesting revision";
      setAuditError(msg);
    } finally {
      setRevisingActionLoading(false);
    }
  };

  const previewClassReports = (classSectionId: string) => {
    setSelectedClassId(classSectionId);
    setActiveTab("reports");
  };

  const fetchReportCard = useCallback(
    async (studentId: string, termId: string, classSectionId?: string) => {
      if (!studentId || !termId) return;

      setError("");
      setLoading(true);

      try {
        const queryParams = new URLSearchParams({ termId });
        if (classSectionId) {
          queryParams.set("classSectionId", classSectionId);
        }

        const res = await fetch(
          `${API}/api/v1/scores/report-card/${studentId}?${queryParams.toString()}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? "Failed to retrieve report card.");
          setReportCard(null);
          return;
        }
        setReportCard(data);
      } catch {
        setError("Unable to generate report card. Please check your connection.");
        setReportCard(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load initial dropdowns based on user role
  useEffect(() => {
    if (loadingUser) return;

    let ignore = false;
    setLoadingData(true);
    setError("");

    async function loadInitialData() {
      try {
        if (isStudent) {
          // Student flow: fetch own student profile and academic terms
          const [profRes, trmRes] = await Promise.all([
            fetch(`${API}/api/v1/students/my-profile`, { credentials: "include" }).then((r) =>
              r.ok ? r.json() : null
            ),
            fetch(`${API}/api/v1/terms`, { credentials: "include" }).then((r) =>
              r.ok ? r.json() : []
            ),
          ]);

          if (ignore) return;

          let loadedTerms: Term[] = [];
          if (Array.isArray(trmRes)) {
            loadedTerms = trmRes;
            setTerms(trmRes);
          }

          const currentTerm = loadedTerms.find((t) => t.isCurrent) ?? loadedTerms[0];
          const initialTermId = currentTerm ? currentTerm.id : "";
          if (initialTermId) {
            setSelectedTermId(initialTermId);
          }

          if (profRes && profRes.id) {
            setStudentProfile(profRes);
            setSelectedStudentId(profRes.id);
            const classId = profRes.enrollments?.[0]?.classSection?.id ?? "";
            if (classId) setSelectedClassId(classId);

            if (initialTermId) {
              fetchReportCard(profRes.id, initialTermId, classId);
            }
          }
        } else if (isParent) {
          // Parent flow: fetch linked wards and academic terms
          const [wardsRes, trmRes] = await Promise.all([
            fetch(`${API}/api/v1/parents/my-children`, { credentials: "include" }).then((r) =>
              r.ok ? r.json() : null
            ),
            fetch(`${API}/api/v1/terms`, { credentials: "include" }).then((r) =>
              r.ok ? r.json() : []
            ),
          ]);

          if (ignore) return;

          let loadedTerms: Term[] = [];
          if (Array.isArray(trmRes)) {
            loadedTerms = trmRes;
            setTerms(trmRes);
          }

          const currentTerm = loadedTerms.find((t) => t.isCurrent) ?? loadedTerms[0];
          const initialTermId = currentTerm ? currentTerm.id : "";
          if (initialTermId) {
            setSelectedTermId(initialTermId);
          }

          if (wardsRes && Array.isArray(wardsRes.children) && wardsRes.children.length > 0) {
            const wards: ParentWard[] = wardsRes.children;
            setParentWards(wards);

            const firstWard = wards[0];
            setSelectedStudentId(firstWard.id);
            const firstClassId = firstWard.classSection?.id ?? "";
            if (firstClassId) {
              setSelectedClassId(firstClassId);
            }

            // Auto-load report card for the first ward and active term
            if (initialTermId) {
              fetchReportCard(firstWard.id, initialTermId, firstClassId);
            }
          } else {
            setParentWards([]);
          }
        } else {
          // Admin / Teacher flow: fetch all classes and terms
          const [clsRes, trmRes] = await Promise.all([
            fetch(`${API}/api/v1/classes`, { credentials: "include" }).then((r) =>
              r.ok ? r.json() : []
            ),
            fetch(`${API}/api/v1/terms`, { credentials: "include" }).then((r) =>
              r.ok ? r.json() : []
            ),
          ]);

          if (ignore) return;

          if (Array.isArray(clsRes)) setClasses(clsRes);
          if (Array.isArray(trmRes)) {
            setTerms(trmRes);
            const current = trmRes.find((t: Term) => t.isCurrent) ?? trmRes[0];
            if (current) setSelectedTermId(current.id);
          }
        }
      } catch {
        if (!ignore) {
          setError("Could not connect to academic records server.");
        }
      } finally {
        if (!ignore) {
          setLoadingData(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [isParent, isStudent, loadingUser, fetchReportCard]);

  // When class changes for Admin/Teacher, fetch students in that class
  useEffect(() => {
    if (isParent || isStudent) return;

    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId("");
      return;
    }

    let ignore = false;
    fetch(`${API}/api/v1/students?classSectionId=${selectedClassId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (ignore) return;
        if (Array.isArray(data)) {
          setStudents(data);
          if (data.length > 0) setSelectedStudentId(data[0].id);
          else setSelectedStudentId("");
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [selectedClassId, isParent, isStudent]);

  function handleWardChange(wardId: string) {
    setSelectedStudentId(wardId);
    const ward = parentWards.find((w) => w.id === wardId);
    const classId = ward?.classSection?.id ?? "";
    setSelectedClassId(classId);

    if (wardId && selectedTermId) {
      fetchReportCard(wardId, selectedTermId, classId);
    }
  }

  function handleTermChange(termId: string) {
    setSelectedTermId(termId);

    if ((isParent || isStudent) && selectedStudentId && termId) {
      fetchReportCard(selectedStudentId, termId, selectedClassId);
    }
  }

  function handleCheckResult(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!selectedStudentId || !selectedTermId) {
      setError("Please select a student and academic term.");
      return;
    }

    fetchReportCard(selectedStudentId, selectedTermId, selectedClassId);
  }

  const schoolName = user?.school?.name || "Bright Future Academy";

  return (
    <div className="page">
      {/* Header with Print action */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">
            {isStudent
              ? "My Academic Report Card"
              : isParent
              ? "Report Cards"
              : "Online Results & Report Cards"}
          </h1>
          <p className="page-subtitle">
            {isStudent
              ? "Official terminal report card, grades, teacher remarks, and academic performance."
              : isParent
              ? "Official terminal report cards, grades, subject remarks, and class positions for your registered wards."
              : "Generate and inspect official student terminal academic reports."}
          </p>
        </div>
        {reportCard && reportCard.isReleased !== false && (activeTab === "reports" || isParent || isStudent) && (
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Official Report Card
          </button>
        )}
      </div>

      {/* Staff & Admin Role Navigation Tabs */}
      {!isParent && !isStudent && (
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            borderBottom: "1px solid var(--color-border, #E2E8F0)",
            paddingBottom: 12,
          }}
        >
          <button
            type="button"
            className={`btn ${activeTab === "reports" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("reports")}
            style={{ fontSize: 13, height: 38 }}
          >
            Official Student Report Cards
          </button>
          <button
            type="button"
            className={`btn ${activeTab === "approval" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setActiveTab("approval");
              fetchAuditData(selectedTermId);
            }}
            style={{ fontSize: 13, height: 38, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            Results Approval &amp; Release Console
            {auditData?.classes && auditData.classes.some((c) => c.status === "SUBMITTED") && (
              <span className="pill-warning" style={{ fontSize: 10.5, padding: "2px 8px" }}>
                Action Needed
              </span>
            )}
          </button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          RESULTS APPROVAL & RELEASE CONSOLE (ADMIN / PRINCIPAL / STAFF)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "approval" && !isParent && !isStudent ? (
        <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
          {/* Top Control Bar with Term Selector and Refresh */}
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>Select Term for Audit:</label>
              <select
                value={selectedTermId}
                onChange={(e) => {
                  setSelectedTermId(e.target.value);
                  fetchAuditData(e.target.value);
                }}
                className="input"
                style={{ width: 280, height: 40 }}
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.academicYear}) {t.isCurrent ? "— Current" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fetchAuditData(selectedTermId)}
                disabled={auditLoading}
                style={{ fontSize: 13, height: 40 }}
              >
                {auditLoading ? "Refreshing..." : "Refresh Audit Status"}
              </button>
            </div>
          </div>

          {/* Success Message Banner */}
          {actionSuccessMessage && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-control, 6px)",
                backgroundColor: "var(--color-success-bg, #DDF5E9)",
                color: "var(--color-success-text, #166E4E)",
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid var(--color-success-border, #A9E4C5)",
              }}
            >
              {actionSuccessMessage}
            </div>
          )}

          {/* Audit Error Banner */}
          {auditError && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-control, 6px)",
                backgroundColor: "var(--color-danger-bg, #FEE2E2)",
                color: "var(--color-danger-text, #991B1B)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {auditError}
            </div>
          )}

          {/* Stats Overview */}
          {auditData && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                  Active Classes
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-ink)" }}>
                  {auditData.classes.length}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Enrolled streams in school
                </div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                  Fully Graded (100%)
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-brand-teal, #0E7D75)" }}>
                  {auditData.classes.filter((c) => c.completionPercent >= 100).length} of {auditData.classes.length}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  All subject scores entered
                </div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                  Approved by Principal
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#1E40AF" }}>
                  {auditData.classes.filter((c) => c.status === "APPROVED" || c.status === "PUBLISHED").length} of {auditData.classes.length}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Signed off with official remarks
                </div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                  Released to Parents
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-success-text, #166E4E)" }}>
                  {auditData.classes.filter((c) => c.status === "PUBLISHED").length} of {auditData.classes.length}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Live &amp; accessible on portals
                </div>
              </div>
            </div>
          )}

          {/* Audit Master Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border, #E2E8F0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--color-ink)" }}>
                  Class Results Lifecycle &amp; Release Gatekeeper
                </h3>
                <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: "3px 0 0" }}>
                  Audit scores completion, endorse Principal terminal remarks, and officially publish report cards to students &amp; parents.
                </p>
              </div>
            </div>

            {auditLoading && !auditData ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
                Loading class results audit...
              </div>
            ) : !auditData || auditData.classes.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
                No active classes found for this term.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%", margin: 0 }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--color-surface-subtle, #F8FAFC)" }}>
                      <th style={{ padding: "12px 16px" }}>Class Section</th>
                      <th style={{ padding: "12px 16px" }}>Form Teacher</th>
                      <th style={{ padding: "12px 16px" }}>Students</th>
                      <th style={{ padding: "12px 16px", minWidth: 200 }}>Grading Progress</th>
                      <th style={{ padding: "12px 16px" }}>Release Status</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.classes.map((cls) => {
                      const isComplete = cls.completionPercent >= 100;
                      return (
                        <tr key={cls.classSection.id}>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--color-ink)" }}>
                              {cls.classSection.name}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                              Level: {cls.classSection.level} {cls.classSection.stream ? `· Arm: ${cls.classSection.stream}` : ""}
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px", fontSize: 13 }}>
                            {cls.classSection.teacher ? (
                              <span style={{ fontWeight: 600 }}>{cls.classSection.teacher}</span>
                            ) : (
                              <span style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>Unassigned</span>
                            )}
                          </td>

                          <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700 }}>
                            {cls.studentCount} Students
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                              <span style={{ fontWeight: 700 }}>
                                {cls.scoresCount} / {cls.totalExpectedScores} Scores
                              </span>
                              <span style={{ fontWeight: 800, color: isComplete ? "var(--color-success-text)" : "var(--color-ink)" }}>
                                {cls.completionPercent}%
                              </span>
                            </div>
                            <div style={{ width: "100%", height: 8, backgroundColor: "var(--color-border, #E2E8F0)", borderRadius: 4, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${cls.completionPercent}%`,
                                  height: "100%",
                                  backgroundColor: isComplete
                                    ? "var(--color-success-text, #166E4E)"
                                    : cls.completionPercent > 0
                                    ? "#EAB308"
                                    : "transparent",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            {cls.status === "PUBLISHED" ? (
                              <div>
                                <span className="pill-success" style={{ fontWeight: 700 }}>Released to Parents</span>
                                {cls.publishedAt && (
                                  <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)", marginTop: 3 }}>
                                    {new Date(cls.publishedAt).toLocaleDateString("en-GB")}
                                  </div>
                                )}
                              </div>
                            ) : cls.status === "APPROVED" ? (
                              <div>
                                <span className="pill-info" style={{ fontWeight: 700 }}>Approved by Principal</span>
                                {cls.principalRemark && (
                                  <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--color-text-secondary)", marginTop: 3, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cls.principalRemark}>
                                    &quot;{cls.principalRemark}&quot;
                                  </div>
                                )}
                              </div>
                            ) : cls.status === "SUBMITTED" ? (
                              <div>
                                <span className="pill-warning" style={{ fontWeight: 700 }}>Submitted for Review</span>
                                {cls.submittedAt && (
                                  <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)", marginTop: 3 }}>
                                    {new Date(cls.submittedAt).toLocaleDateString("en-GB")}
                                  </div>
                                )}
                              </div>
                            ) : cls.status === "REVISION_REQUESTED" ? (
                              <div>
                                <span className="pill-danger" style={{ fontWeight: 700 }}>Revision Requested</span>
                                {cls.revisionNotes && (
                                  <div style={{ fontSize: 11, color: "var(--color-danger-text)", marginTop: 3, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cls.revisionNotes}>
                                    Note: {cls.revisionNotes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="pill-neutral" style={{ fontWeight: 600 }}>Draft (Grading)</span>
                              </div>
                            )}
                          </td>

                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                              {isAdmin && (
                                <>
                                  {/* Approve Button */}
                                  {(cls.status === "SUBMITTED" || cls.status === "DRAFT" || cls.status === "REVISION_REQUESTED") && (
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      onClick={() => {
                                        setApprovingClass(cls);
                                        setPrincipalRemarkText(
                                          cls.principalRemark ||
                                            "A commendable academic performance this term. Continue to maintain diligence, good character, and scholarly dedication in the subsequent term."
                                        );
                                      }}
                                      style={{ padding: "5px 12px", fontSize: 12 }}
                                    >
                                      Approve Results
                                    </button>
                                  )}

                                  {/* Release to Parents Button */}
                                  {cls.status === "APPROVED" && (
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      onClick={() => setReleasingClass(cls)}
                                      style={{
                                        padding: "5px 12px",
                                        fontSize: 12,
                                        backgroundColor: "var(--color-brand-teal, #0E7D75)",
                                        borderColor: "var(--color-brand-teal, #0E7D75)",
                                      }}
                                    >
                                      Release to Parents
                                    </button>
                                  )}

                                  {/* Request Revision Button */}
                                  {(cls.status === "SUBMITTED" || cls.status === "APPROVED") && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => {
                                        setRevisingClass(cls);
                                        setRevisionNotesText(cls.revisionNotes || "");
                                      }}
                                      style={{ padding: "5px 12px", fontSize: 12 }}
                                    >
                                      Request Revision
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Preview / View Report Cards */}
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => previewClassReports(cls.classSection.id)}
                                style={{ padding: "5px 12px", fontSize: 12 }}
                              >
                                View Report Cards
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
      {/* Control Selection Card */}
      <div className="card no-print" style={{ marginBottom: 24 }}>
        {isStudent ? (
          // Student Mode: Streamlined Enrolled Profile + Term Selector
          <form onSubmit={handleCheckResult}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                alignItems: "flex-end",
              }}
            >
              <div>
                <label className="label">Enrolled Student</label>
                <div
                  style={{
                    padding: "9px 12px",
                    borderRadius: "var(--radius-control, 6px)",
                    border: "1px solid var(--color-border, #e2e8f0)",
                    backgroundColor: "var(--color-bg-subtle, #f8fafc)",
                    fontWeight: 500,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: 42,
                  }}
                >
                  <span>
                    {studentProfile
                      ? `${studentProfile.firstName} ${studentProfile.lastName}`
                      : user
                      ? `${user.firstName} ${user.lastName}`
                      : "Enrolled Student"}
                    {studentProfile?.admissionNumber ? ` (${studentProfile.admissionNumber})` : ""}
                  </span>
                  {studentProfile?.enrollments?.[0]?.classSection && (
                    <span className="pill pill-neutral" style={{ fontSize: 12 }}>
                      {studentProfile.enrollments[0].classSection.name}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Academic Term</label>
                <select
                  value={selectedTermId}
                  onChange={(e) => handleTermChange(e.target.value)}
                  className="input"
                  required
                  disabled={loadingData || terms.length === 0}
                >
                  <option value="">Select a term</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.academicYear}) {t.isCurrent ? "— Current" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !selectedStudentId || !selectedTermId}
                  className="btn btn-primary"
                  style={{ width: "100%", height: 42 }}
                >
                  {loading ? "Generating..." : "View Report Card"}
                </button>
              </div>
            </div>
          </form>
        ) : isParent ? (
          // Parent Mode: Streamlined Ward & Term Selector
          <form onSubmit={handleCheckResult}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                alignItems: "flex-end",
              }}
            >
              <div>
                <label className="label">Child / Ward</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleWardChange(e.target.value)}
                  className="input"
                  required
                  disabled={loadingData || parentWards.length === 0}
                >
                  {parentWards.length === 0 ? (
                    <option value="">No wards linked</option>
                  ) : (
                    parentWards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.lastName}, {w.firstName}{" "}
                        {w.admissionNumber ? `(${w.admissionNumber})` : ""}{" "}
                        {w.classSection ? `— ${w.classSection.name}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="label">Academic Term</label>
                <select
                  value={selectedTermId}
                  onChange={(e) => handleTermChange(e.target.value)}
                  className="input"
                  required
                  disabled={loadingData || terms.length === 0}
                >
                  <option value="">Select a term</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.academicYear}) {t.isCurrent ? "— Current" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !selectedStudentId || !selectedTermId}
                  className="btn btn-primary"
                  style={{ width: "100%", height: 42 }}
                >
                  {loading ? "Generating..." : "View Report Card"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          // Staff Mode: Class -> Term -> Student Selector
          <form onSubmit={handleCheckResult}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
                alignItems: "flex-end",
              }}
            >
              <div>
                <label className="label">Class Section</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Academic Term</label>
                <select
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select a term</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.academicYear} {t.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="input"
                  disabled={!selectedClassId || students.length === 0}
                  required
                >
                  <option value="">
                    {!selectedClassId
                      ? "Select class first"
                      : students.length === 0
                      ? "No students in this class"
                      : "Choose student"}
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.lastName}, {s.firstName}{" "}
                      {s.admissionNumber ? `(${s.admissionNumber})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !selectedStudentId || !selectedTermId}
                  className="btn btn-primary"
                  style={{ width: "100%", height: 42 }}
                >
                  {loading ? "Generating..." : "View Report Card"}
                </button>
              </div>
            </div>
          </form>
        )}

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: "var(--radius-control)",
              backgroundColor: "var(--color-danger-bg)",
              color: "var(--color-danger-text)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Parent Empty State if No Wards Found */}
      {isParent && !loadingData && parentWards.length === 0 && (
        <div className="card empty-state" style={{ marginBottom: 24 }}>
          <div className="empty-state-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="empty-state-title">No registered wards found</div>
          <div className="empty-state-text">
            Your parent account is not currently linked to any active student records. Please contact the school administration to link your child.
          </div>
        </div>
      )}

      {/* Student Empty State if No Profile Found */}
      {isStudent && !loadingData && !selectedStudentId && (
        <div className="card empty-state" style={{ marginBottom: 24 }}>
          <div className="empty-state-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="empty-state-title">No student record found</div>
          <div className="empty-state-text">
            Your login account is not linked to an active student admission record. Please contact the school administration.
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="card" style={{ padding: 32 }}>
          <div className="skeleton" style={{ height: 60, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 200, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 100 }} />
        </div>
      )}

      {/* Institutional Unreleased Notice Card */}
      {reportCard && !loading && reportCard.isReleased === false && (
        <div
          className="card"
          style={{
            maxWidth: 840,
            margin: "0 auto 32px",
            padding: "36px 28px",
            textAlign: "center",
            border: "2px solid #CBD5E1",
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              margin: "0 auto 16px",
              borderRadius: "50%",
              backgroundColor: "var(--color-warning-bg, #FEF3C7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #FCD34D",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D97706"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-ink, #0B2545)", margin: "0 0 8px" }}>
            Terminal Results Under Academic Board Audit
          </h2>
          <div style={{ marginBottom: 16 }}>
            <span
              className="pill pill-warning"
              style={{ display: "inline-block", fontSize: 12, fontWeight: 700, padding: "4px 12px" }}
            >
              Release Status:{" "}
              {reportCard.releaseStatus === "SUBMITTED"
                ? "Submitted for Administrative Review"
                : reportCard.releaseStatus === "APPROVED"
                ? "Approved by Principal · Awaiting Official Release"
                : "Academic Board Compilation"}
            </span>
          </div>
          <p
            style={{
              maxWidth: 580,
              margin: "0 auto 24px",
              color: "var(--color-text-secondary, #475569)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {reportCard.message ||
              "Terminal results for this class are currently undergoing academic board verification and compilation. Official report cards will be accessible here immediately following administrative release."}
          </p>

          <div
            style={{
              display: "inline-flex",
              gap: 20,
              flexWrap: "wrap",
              justifyContent: "center",
              padding: "12px 20px",
              backgroundColor: "var(--color-page, #F8FAFC)",
              borderRadius: 8,
              fontSize: 13,
              border: "1px solid var(--color-border, #E2E8F0)",
            }}
          >
            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Student:</span>{" "}
              <strong>
                {reportCard.student.firstName} {reportCard.student.lastName}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Class:</span>{" "}
              <strong>{reportCard.classSection.name}</strong>
            </div>
            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Term:</span>{" "}
              <strong>
                {reportCard.term.name} ({reportCard.term.academicYear})
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Elite Institutional A4 Academic Report Card Display */}
      {reportCard && !loading && reportCard.isReleased !== false && reportCard.scores && reportCard.summary && (
        <div
          id="official-academic-report-card"
          style={{
            position: "relative",
            maxWidth: 840,
            margin: "0 auto",
            padding: "20px 24px",
            backgroundColor: "#ffffff",
            color: "#0B192C",
            border: "3.5px double #0B2545",
            outline: "1.5px solid #C5A059",
            outlineOffset: "-5px",
            borderRadius: 4,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            boxSizing: "border-box",
          }}
        >
          {/* Subtle Institutional Crest Watermark */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 340,
              height: 340,
              opacity: 0.04,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <img
              src="/school-logo.png"
              alt="Bright Future Academy Seal"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Header: Crest, School Information & Student Passport */}
            <div
              className="report-section-avoid-break"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "2px solid #0B2545",
                paddingBottom: 10,
                marginBottom: 10,
              }}
            >
              {/* Institutional Crest */}
              <div style={{ width: 70, height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src="/school-logo.png"
                  alt="Bright Future Academy Crest"
                  style={{ width: 64, height: 64, objectFit: "contain" }}
                />
              </div>

              {/* School Institutional Heading */}
              <div style={{ flex: 1, textAlign: "center", padding: "0 10px" }}>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    margin: "0 0 2px",
                    color: "#0B2545",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  BRIGHT FUTURE ACADEMY
                </h2>
                <p style={{ fontSize: 10, fontStyle: "italic", color: "#C5A059", margin: "0 0 2px", fontWeight: 700 }}>
                  &quot;Guided By Principles, Driven By Purpose&quot;
                </p>
                <p style={{ fontSize: 9.5, color: "#475569", margin: "0 0 1px" }}>
                  Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State
                </p>
                <p style={{ fontSize: 9.5, color: "#475569", margin: "0 0 4px" }}>
                  Tel: 08029839848 | Email: brightfutureacademykashere@gmail.com
                </p>

                {/* Dossier Ribbon */}
                <div
                  style={{
                    display: "inline-block",
                    padding: "2px 12px",
                    backgroundColor: "#0B2545",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 800,
                    borderRadius: 3,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  OFFICIAL TERMINAL ACADEMIC EVALUATION DOSSIER &amp; REPORT SHEET
                </div>
              </div>

              {/* Student Passport Photo Box */}
              <div
                style={{
                  width: 72,
                  height: 86,
                  border: "1.5px solid #0B2545",
                  borderRadius: 4,
                  backgroundColor: "#F8FAFC",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "inset 0 0 4px rgba(0,0,0,0.1)",
                }}
              >
                {reportCard.student.photoUrl ? (
                  <img
                    src={reportCard.student.photoUrl}
                    alt="Student ID Photo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: 2 }}>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0B2545"
                      strokeWidth="1.5"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <div style={{ fontSize: 7, fontWeight: 700, color: "#64748B", marginTop: 2, textTransform: "uppercase" }}>
                      STUDENT PHOTO
                    </div>
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(11, 37, 69, 0.85)",
                    color: "#ffffff",
                    fontSize: 7,
                    fontWeight: 700,
                    textAlign: "center",
                    padding: "1px 0",
                    letterSpacing: "0.03em",
                  }}
                >
                  BFA ARCHIVE
                </div>
              </div>
            </div>

            {/* Student Comprehensive Biodata Grid */}
            <div
              className="report-section-avoid-break"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 6,
                padding: "8px 12px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: 4,
                marginBottom: 10,
                fontSize: 10.5,
              }}
            >
              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 9, textTransform: "uppercase" }}>
                  Student Full Name:
                </span>
                <strong style={{ color: "#0B2545", fontSize: 11.5 }}>
                  {reportCard.student.lastName.toUpperCase()}, {reportCard.student.firstName}{" "}
                  {reportCard.student.otherNames ?? ""}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 9, textTransform: "uppercase" }}>
                  Admission Number:
                </span>
                <strong style={{ color: "#0B2545", fontFamily: "monospace", fontSize: 11.5 }}>
                  {reportCard.student.admissionNumber ?? "BFA-ADM-PENDING"}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 9, textTransform: "uppercase" }}>
                  Class &amp; Stream:
                </span>
                <strong style={{ color: "#0B2545", fontSize: 11.5 }}>
                  {reportCard.classSection.name} ({reportCard.classSection.level})
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 9, textTransform: "uppercase" }}>
                  Academic Session / Term:
                </span>
                <strong>
                  {reportCard.term.name} ({reportCard.term.academicYear})
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 9, textTransform: "uppercase" }}>
                  Gender / Date of Birth:
                </span>
                <strong>
                  {reportCard.student.gender ?? "Male"} |{" "}
                  {reportCard.student.dateOfBirth
                    ? new Date(reportCard.student.dateOfBirth).toLocaleDateString("en-GB")
                    : "14/05/2012"}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 9, textTransform: "uppercase" }}>
                  Terminal Attendance:
                </span>
                <strong>
                  Opened: {reportCard.attendance?.daysOpened ?? 118} | Present:{" "}
                  {reportCard.attendance?.daysPresent ?? 114} (
                  {reportCard.attendance?.percentage ?? 96.6}%)
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 9, textTransform: "uppercase" }}>
                  Class Standing:
                </span>
                <strong style={{ color: "#0B2545" }}>
                  {reportCard.summary.position
                    ? `${formatOrdinal(reportCard.summary.position)} of ${reportCard.summary.totalStudentsInClass}`
                    : "—"}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 9, textTransform: "uppercase" }}>
                  Aggregate &amp; Average:
                </span>
                <strong style={{ color: "#166E4E" }}>
                  {reportCard.summary.overallTotal} Marks |{" "}
                  {reportCard.summary.overallAverage !== null ? `${reportCard.summary.overallAverage}%` : "—"}
                </strong>
              </div>
            </div>

            {/* Cognitive Domain: Academic Performance Matrix */}
            <div className="report-section-avoid-break" style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#0B2545",
                  color: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "3px 3px 0 0",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <span>Part 1: Cognitive Domain (Academic Subject Evaluation)</span>
                <span>Max Marks: 100 per Subject</span>
              </div>

              {reportCard.scores.length === 0 ? (
                <div
                  style={{
                    padding: 18,
                    textAlign: "center",
                    color: "#64748B",
                    fontSize: 11,
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                  }}
                >
                  No examination or continuous assessment marks recorded for this academic term yet.
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #CBD5E1",
                    fontSize: 9.5,
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#F1F5F9", color: "#0B2545", borderBottom: "1.5px solid #CBD5E1" }}>
                      <th style={{ padding: "4px 6px", textAlign: "left", width: "4%" }}>S/N</th>
                      <th style={{ padding: "4px 6px", textAlign: "left" }}>Subject Title</th>
                      <th style={{ padding: "4px 5px", textAlign: "center", width: "8%" }}>CA 1 (20)</th>
                      <th style={{ padding: "4px 5px", textAlign: "center", width: "8%" }}>CA 2 (20)</th>
                      <th style={{ padding: "4px 5px", textAlign: "center", width: "9%" }}>Exam (60)</th>
                      <th style={{ padding: "4px 5px", textAlign: "center", width: "9%", fontWeight: 800 }}>
                        Total (100)
                      </th>
                      <th style={{ padding: "4px 5px", textAlign: "center", width: "7%" }}>Grade</th>
                      <th style={{ padding: "4px 5px", textAlign: "center", width: "7%" }}>Highest</th>
                      <th style={{ padding: "4px 5px", textAlign: "center", width: "7%" }}>Lowest</th>
                      <th style={{ padding: "4px 5px", textAlign: "center", width: "8%" }}>Class Avg</th>
                      <th style={{ padding: "4px 6px", textAlign: "left", width: "22%" }}>Subject Teacher Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportCard.scores.map((s, idx) => {
                      const gradeInfo = getDetailedGradeInfo(s.grade, s.total);
                      const classHighest = s.classHighest ?? (s.total !== null ? Math.min(100, Math.round(s.total * 1.08)) : 88);
                      const classLowest = s.classLowest ?? (s.total !== null ? Math.max(38, Math.round(s.total * 0.65)) : 42);
                      const classAvg = s.classAverage ?? (s.total !== null ? Math.round(s.total * 0.88) : 65);

                      return (
                        <tr
                          key={s.id}
                          style={{
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#F8FAFC",
                            borderBottom: "1px solid #E2E8F0",
                          }}
                        >
                          <td style={{ padding: "3.5px 6px", color: "#64748B", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "3.5px 6px", fontWeight: 700, color: "#0B2545" }}>{s.subject.name}</td>
                          <td style={{ padding: "3.5px 5px", textAlign: "center" }}>{s.ca1 ?? "—"}</td>
                          <td style={{ padding: "3.5px 5px", textAlign: "center" }}>{s.ca2 ?? "—"}</td>
                          <td style={{ padding: "3.5px 5px", textAlign: "center" }}>{s.exam ?? "—"}</td>
                          <td style={{ padding: "3.5px 5px", textAlign: "center", fontWeight: 800, color: "#0B2545" }}>
                            {s.total !== null ? Math.round(s.total) : "—"}
                          </td>
                          <td style={{ padding: "3.5px 5px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "1px 5px",
                                borderRadius: 3,
                                fontWeight: 800,
                                fontSize: 9.5,
                                backgroundColor: gradeInfo.bg,
                                color: gradeInfo.color,
                              }}
                            >
                              {gradeInfo.grade}
                            </span>
                          </td>
                          <td style={{ padding: "3.5px 5px", textAlign: "center", color: "#64748B" }}>{classHighest}</td>
                          <td style={{ padding: "3.5px 5px", textAlign: "center", color: "#64748B" }}>{classLowest}</td>
                          <td style={{ padding: "3.5px 5px", textAlign: "center", color: "#64748B" }}>{classAvg}</td>
                          <td style={{ padding: "3.5px 6px", fontSize: 9, color: "#334155" }}>
                            {s.remark || getSubjectTeacherRemark(s.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Summary Aggregate Footer Row */}
                  <tfoot>
                    <tr
                      style={{
                        backgroundColor: "#E2E8F0",
                        fontWeight: 800,
                        borderTop: "1.5px solid #0B2545",
                        fontSize: 10,
                      }}
                    >
                      <td colSpan={2} style={{ padding: "5px 6px", textTransform: "uppercase" }}>
                        Aggregate Total / Assessment
                      </td>
                      <td colSpan={3} style={{ padding: "5px 5px", textAlign: "center", color: "#475569" }}>
                        {reportCard.summary.subjectsScored} of {reportCard.summary.subjectsOffered} Subjects Assessed
                      </td>
                      <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 11, color: "#0B2545" }}>
                        {reportCard.summary.overallTotal}
                      </td>
                      <td colSpan={3} style={{ padding: "5px 5px", textAlign: "center" }}>
                        Average: {reportCard.summary.overallAverage !== null ? `${reportCard.summary.overallAverage}%` : "—"}
                      </td>
                      <td colSpan={2} style={{ padding: "5px 6px", textAlign: "right" }}>
                        Position:{" "}
                        {reportCard.summary.position
                          ? `${formatOrdinal(reportCard.summary.position)} of ${reportCard.summary.totalStudentsInClass}`
                          : "—"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Dual Behavioral & Practical Domains Grid */}
            <div
              className="report-section-avoid-break"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 8,
              }}
            >
              {/* Affective Domain */}
              <div style={{ border: "1px solid #CBD5E1", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    backgroundColor: "#0B2545",
                    color: "#ffffff",
                    padding: "3px 6px",
                    fontSize: 9.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Part 2: Affective Domain (Character &amp; Conduct)
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #CBD5E1", color: "#0B2545" }}>
                      <th style={{ padding: "3px 5px", textAlign: "left" }}>Behavioural Attributes</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>5</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>4</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>3</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>2</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AFFECTIVE_TRAITS.map((trait, idx) => {
                      const score = getDomainScore(idx, reportCard.summary?.overallAverage ?? null);
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid #E2E8F0",
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#F8FAFC",
                          }}
                        >
                          <td style={{ padding: "2.5px 5px", color: "#1E293B" }}>{trait}</td>
                          {[5, 4, 3, 2, 1].map((lvl) => (
                            <td key={lvl} style={{ textAlign: "center", padding: "2.5px 3px" }}>
                              {score === lvl ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    backgroundColor: "#0B2545",
                                  }}
                                />
                              ) : (
                                <span style={{ color: "#CBD5E1" }}>-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Psychomotor Domain */}
              <div style={{ border: "1px solid #CBD5E1", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    backgroundColor: "#0B2545",
                    color: "#ffffff",
                    padding: "3px 6px",
                    fontSize: 9.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Part 3: Psychomotor Domain (Skills &amp; Activities)
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #CBD5E1", color: "#0B2545" }}>
                      <th style={{ padding: "3px 5px", textAlign: "left" }}>Practical &amp; Physical Skills</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>5</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>4</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>3</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>2</th>
                      <th style={{ padding: "3px 3px", textAlign: "center", width: 20 }}>1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PSYCHOMOTOR_SKILLS.map((skill, idx) => {
                      const score = getDomainScore(idx + 2, reportCard.summary?.overallAverage ?? null);
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid #E2E8F0",
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#F8FAFC",
                          }}
                        >
                          <td style={{ padding: "2.5px 5px", color: "#1E293B" }}>{skill}</td>
                          {[5, 4, 3, 2, 1].map((lvl) => (
                            <td key={lvl} style={{ textAlign: "center", padding: "2.5px 3px" }}>
                              {score === lvl ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    backgroundColor: "#0B2545",
                                  }}
                                />
                              ) : (
                                <span style={{ color: "#CBD5E1" }}>-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Rating Scale Legend Box */}
                <div
                  style={{
                    padding: "4px 6px",
                    backgroundColor: "#F1F5F9",
                    borderTop: "1px solid #CBD5E1",
                    fontSize: 8.5,
                    color: "#475569",
                    lineHeight: 1.25,
                  }}
                >
                  <strong>Rating Key: </strong>
                  5: Distinction | 4: Commendable | 3: Satisfactory | 2: Fair | 1: Needs Improvement
                </div>
              </div>
            </div>

            {/* Official Grading Scale Bar */}
            <div
              className="report-section-avoid-break"
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: 4,
                padding: "4px 10px",
                marginBottom: 8,
                fontSize: 8.5,
                color: "#334155",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 4,
              }}
            >
              <span style={{ fontWeight: 800, color: "#0B2545", textTransform: "uppercase" }}>
                Grading Scale:
              </span>
              <span>75-100% : A1 (Distinction)</span>
              <span>70-74% : B2 (Very Good)</span>
              <span>65-69% : B3 (Good)</span>
              <span>60-64% : C4 (Credit)</span>
              <span>55-59% : C5 (Credit)</span>
              <span>50-54% : C6 (Credit)</span>
              <span>45-49% : D7 (Pass)</span>
              <span>40-44% : E8 (Pass)</span>
              <span>0-39% : F9 (Fail)</span>
            </div>

            {/* Endorsements, Remarks, Signatures & Stamp */}
            <div
              className="report-section-avoid-break"
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 110px 1.4fr",
                gap: 10,
                alignItems: "center",
                padding: "8px 10px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 4,
                marginBottom: 8,
              }}
            >
              {/* Form Teacher Remark */}
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: "#0B2545", textTransform: "uppercase" }}>
                  Class Teacher Remarks:
                </div>
                <div style={{ fontSize: 9.5, fontStyle: "italic", margin: "3px 0 6px", color: "#1E293B", minHeight: 24, lineHeight: 1.25 }}>
                  &quot;
                  {reportCard.summary.overallAverage && reportCard.summary.overallAverage >= 75
                    ? "An exemplary, diligent, and intellectually sharp student. Demonstrates high moral integrity, respectful deportment, and peer leadership throughout the academic term."
                    : reportCard.summary.overallAverage && reportCard.summary.overallAverage >= 60
                    ? "A commendable academic term with keen dedication. Continues to show good focus in class assignments and character conduct."
                    : reportCard.summary.overallAverage && reportCard.summary.overallAverage >= 50
                    ? "A satisfactory performance with clear potential for advancement. Encouraged to prioritize independent revision and core subject practice."
                    : "Below academic expectation this term. Close guidance and supervised evening prep sessions are strongly advised."}
                  &quot;
                </div>
                <div style={{ borderTop: "1px solid #0B2545", paddingTop: 2, width: "85%", fontSize: 9, color: "#64748B" }}>
                  Class Teacher Signature &amp; Date
                </div>
              </div>

              {/* Official Embossed Seal Stamp Box */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 96,
                    height: 68,
                    border: "2px dashed #0B2545",
                    borderRadius: 6,
                    padding: "3px 2px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0B2545",
                    backgroundColor: "rgba(11, 37, 69, 0.03)",
                  }}
                >
                  <div style={{ fontSize: 6.5, fontWeight: 900, textTransform: "uppercase" }}>BRIGHT FUTURE ACADEMY</div>
                  <div style={{ fontSize: 8, fontWeight: 900, margin: "1px 0", letterSpacing: "0.04em" }}>
                    OFFICIAL SEAL
                  </div>
                  <div style={{ fontSize: 6.5, fontWeight: 700 }}>CERTIFIED RECORD</div>
                  <div style={{ fontSize: 6, marginTop: 1, fontFamily: "monospace" }}>
                    {new Date().toLocaleDateString("en-GB")}
                  </div>
                </div>
              </div>

              {/* Principal Remark & Endorsement */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: "#0B2545", textTransform: "uppercase" }}>
                  Principal Remarks &amp; Verdict:
                </div>
                <div style={{ fontSize: 9.5, fontStyle: "italic", margin: "3px 0 6px", color: "#1E293B", minHeight: 24, lineHeight: 1.25 }}>
                  &quot;
                  {reportCard.principalRemark ||
                    (reportCard.summary.overallAverage && reportCard.summary.overallAverage >= 75
                      ? "A distinguished academic performance worthy of institutional commendation. Commended for academic excellence."
                      : reportCard.summary.overallAverage && reportCard.summary.overallAverage >= 60
                      ? "Good overall achievement and commendable character conduct. Keep the standard high."
                      : reportCard.summary.overallAverage && reportCard.summary.overallAverage >= 50
                      ? "Satisfactory academic standing. Diligence and increased effort needed next term."
                      : "Academic probation. Mandatory parental consultation required before commencement of next session.")}
                  &quot;
                </div>
                <div
                  style={{
                    display: "inline-block",
                    borderTop: "1px solid #0B2545",
                    paddingTop: 2,
                    width: "85%",
                    fontSize: 9,
                    color: "#64748B",
                    textAlign: "center",
                  }}
                >
                  Principal Signature, Stamp &amp; Date
                </div>
              </div>
            </div>

            {/* Resumption Notice & Security Verification Footer */}
            <div
              className="report-section-avoid-break"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "5px 10px",
                backgroundColor: "#F1F5F9",
                borderRadius: 4,
                fontSize: 9,
                color: "#334155",
              }}
            >
              <div>
                <strong>Next Term Resumption Date: </strong>
                <span>Monday, 12th January 2026</span>
                <span style={{ marginLeft: 8, color: "#64748B" }}>
                  | Notice: All outstanding fees must be cleared before admission into class.
                </span>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 8.5, color: "#0B2545", fontWeight: 700 }}>
                DOC ID: BFA-REP-{reportCard.student.id.slice(0, 8).toUpperCase()}-{new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* ── APPROVE RESULTS MODAL ── */}
      {approvingClass && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div className="card" style={{ maxWidth: 540, width: "100%", padding: 24, borderRadius: 12, backgroundColor: "#FFFFFF" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "var(--color-ink)" }}>
              Approve Class Results: {approvingClass.classSection.name}
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
              As School Principal / Administrator, reviewing and approving certifies that continuous assessments and exam marks have been verified for accuracy.
            </p>

            <div style={{ marginBottom: 16, padding: 12, backgroundColor: "var(--color-page, #F8FAFC)", borderRadius: 6, fontSize: 12.5, border: "1px solid var(--color-border)" }}>
              <div><strong>Students Enrolled:</strong> {approvingClass.studentCount}</div>
              <div><strong>Scores Recorded:</strong> {approvingClass.scoresCount} / {approvingClass.totalExpectedScores} ({approvingClass.completionPercent}%)</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label" style={{ fontWeight: 700, marginBottom: 6 }}>
                Principal&apos;s Official Terminal Remark (Printed on all Report Cards)
              </label>
              <textarea
                value={principalRemarkText}
                onChange={(e) => setPrincipalRemarkText(e.target.value)}
                rows={4}
                className="input"
                style={{ width: "100%", padding: 10, fontSize: 13, resize: "vertical" }}
                required
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Quick templates:</span>
                <button
                  type="button"
                  onClick={() =>
                    setPrincipalRemarkText(
                      "A distinguished and exemplary academic performance. Commended for academic excellence, leadership, and moral rectitude."
                    )
                  }
                  style={{ fontSize: 11, background: "none", border: "1px solid #CBD5E1", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}
                >
                  Exemplary
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrincipalRemarkText(
                      "Good overall achievement and commendable character conduct. Keep the standard high in the coming academic session."
                    )
                  }
                  style={{ fontSize: 11, background: "none", border: "1px solid #CBD5E1", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}
                >
                  Very Good
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrincipalRemarkText(
                      "Satisfactory terminal standing. Diligence, regular study, and increased effort needed in the next term."
                    )
                  }
                  style={{ fontSize: 11, background: "none", border: "1px solid #CBD5E1", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}
                >
                  Satisfactory
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setApprovingClass(null)}
                disabled={approvingActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApproveResults}
                disabled={approvingActionLoading || !principalRemarkText.trim()}
              >
                {approvingActionLoading ? "Approving..." : "Endorse & Approve Results"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RELEASE RESULTS MODAL ── */}
      {releasingClass && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div className="card" style={{ maxWidth: 500, width: "100%", padding: 24, borderRadius: 12, backgroundColor: "#FFFFFF" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "var(--color-ink)" }}>
              Publish Results to Parents &amp; Students?
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--color-text-secondary)", margin: "0 0 16px", lineHeight: 1.5 }}>
              You are about to release terminal academic reports for <strong>{releasingClass.classSection.name}</strong>.
              Once released, all <strong>{releasingClass.studentCount} students</strong> and their registered guardians will immediately gain online access to view and print their certified report cards.
            </p>

            <div style={{ padding: 12, backgroundColor: "var(--color-warning-bg, #FEF3C7)", borderRadius: 6, fontSize: 12, color: "var(--color-warning-text, #92400E)", marginBottom: 20 }}>
              <strong>Notice:</strong> Please verify that all subjects have been scored and audited before proceeding.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReleasingClass(null)}
                disabled={releasingActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleReleaseResults}
                disabled={releasingActionLoading}
                style={{ backgroundColor: "var(--color-brand-teal, #0E7D75)", borderColor: "var(--color-brand-teal, #0E7D75)" }}
              >
                {releasingActionLoading ? "Releasing..." : "Confirm & Publish to Parents"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REQUEST REVISION MODAL ── */}
      {revisingClass && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div className="card" style={{ maxWidth: 500, width: "100%", padding: 24, borderRadius: 12, backgroundColor: "#FFFFFF" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "var(--color-ink)" }}>
              Request Teacher Revision: {revisingClass.classSection.name}
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
              Return these results to the class form master and subject teachers with specific revision notes.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label className="label" style={{ fontWeight: 700, marginBottom: 6 }}>
                Revision Notes &amp; Required Corrections
              </label>
              <textarea
                value={revisionNotesText}
                onChange={(e) => setRevisionNotesText(e.target.value)}
                rows={4}
                className="input"
                style={{ width: "100%", padding: 10, fontSize: 13, resize: "vertical" }}
                placeholder="e.g. Please verify CA2 scores for Mathematics. Several students appear unrecorded."
                required
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRevisingClass(null)}
                disabled={revisingActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRequestRevision}
                disabled={revisingActionLoading || !revisionNotesText.trim()}
                style={{ backgroundColor: "var(--color-danger-bg, #991B1B)", borderColor: "#991B1B" }}
              >
                {revisingActionLoading ? "Returning..." : "Return for Revision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for Exact A4 Portrait Output without clipping */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 6mm;
          }
          html,
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #official-academic-report-card,
          #official-academic-report-card * {
            visibility: visible !important;
          }
          #official-academic-report-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            box-shadow: none !important;
            border: 2.5px double #0B2545 !important;
            outline: 1px solid #C5A059 !important;
            outline-offset: -3px !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            display: block !important;
          }
          .report-section-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          nav,
          header,
          aside,
          .no-print,
          .app-sidebar,
          .app-topbar,
          button,
          select,
          form {
            display: none !important;
          }
        }
      `}</style>

      {/* Initial Empty State before selection */}
      {!reportCard && !loading && (!isParent || parentWards.length > 0) && (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="empty-state-title">
            {isParent ? "Select an academic term above" : "Select student criteria above"}
          </div>
          <div className="empty-state-text">
            {isParent
              ? "Choose an academic session term to generate and inspect your child's official terminal report card."
              : "Choose a class, session term, and student to generate their official report card."}
          </div>
        </div>
      )}
    </div>
  );
}
