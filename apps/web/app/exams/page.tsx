"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActionConfirmationModal from "../components/ActionConfirmationModal";
import { useCurrentUser } from "../hooks/useCurrentUser";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/* ── Resilient Fetch with Automatic Token Refresh ──────────────────────────── */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let res = await fetch(url, { ...options, credentials: "include" });
  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`${API}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        res = await fetch(url, { ...options, credentials: "include" });
      }
    } catch {
      // Refresh failed
    }
  }
  return res;
}

interface Term {
  id: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface ExamSession {
  id: string;
  subject: string;
  subjectCode?: string;
  classLevel: string;
  date: string;
  session: "Morning" | "Mid-Day" | "Afternoon";
  time: string;
  hall: string;
  capacity?: number;
  invigilator: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

/* ── Grading System Definitions ────────────────────────────────────────────── */
const WAEC_SCALE = [
  { min: 75, max: 100, grade: "A1", gpa: "4.0", label: "Excellent", remark: "Distinction — Outstanding mastery of syllabus objectives.", pill: "pill-success" },
  { min: 70, max: 74, grade: "B2", gpa: "3.6", label: "Very Good", remark: "High achievement and strong conceptual understanding.", pill: "pill-success" },
  { min: 65, max: 69, grade: "B3", gpa: "3.2", label: "Good", remark: "Above-average demonstration of knowledge and analysis.", pill: "pill-success" },
  { min: 60, max: 64, grade: "C4", gpa: "2.8", label: "Credit", remark: "Competent performance with minor areas for refinement.", pill: "pill-info" },
  { min: 55, max: 59, grade: "C5", gpa: "2.4", label: "Credit", remark: "Satisfactory grasp of core subject material.", pill: "pill-info" },
  { min: 50, max: 54, grade: "C6", gpa: "2.0", label: "Credit", remark: "Minimum requirement for credit pass in senior certifications.", pill: "pill-info" },
  { min: 45, max: 49, grade: "D7", gpa: "1.6", label: "Pass", remark: "Marginal pass; remedial support and review advised.", pill: "pill-warning" },
  { min: 40, max: 44, grade: "E8", gpa: "1.2", label: "Pass", remark: "Weak foundation; mandatory guided study sessions required.", pill: "pill-warning" },
  { min: 0, max: 39, grade: "F9", gpa: "0.0", label: "Fail", remark: "Unsatisfactory. Student must retake assessment or receive tutoring.", pill: "pill-danger" },
];

const STANDARD_SCALE = [
  { min: 75, max: 100, grade: "A", gpa: "4.0", label: "Distinction", remark: "Outstanding demonstration of learning objectives and critical thinking.", pill: "pill-success" },
  { min: 65, max: 74, grade: "B", gpa: "3.0", label: "Very Good", remark: "Above-average comprehension and consistently high performance.", pill: "pill-success" },
  { min: 50, max: 64, grade: "C", gpa: "2.0", label: "Credit", remark: "Satisfactory completion of all curricular requirements.", pill: "pill-info" },
  { min: 45, max: 49, grade: "D", gpa: "1.5", label: "Pass", remark: "Moderate pass; candidate requires targeted revision.", pill: "pill-warning" },
  { min: 40, max: 44, grade: "E", gpa: "1.0", label: "Fair", remark: "Borderline pass; subject mentoring recommended.", pill: "pill-warning" },
  { min: 0, max: 39, grade: "F", gpa: "0.0", label: "Fail", remark: "Below acceptable standards; remedial plan required.", pill: "pill-danger" },
];

const PRIMARY_COMPETENCY_SCALE = [
  { min: 80, max: 100, grade: "EX", gpa: "4.0", label: "Exceeding Expectations", remark: "Consistently applies advanced concepts independently beyond level standards.", pill: "pill-success" },
  { min: 65, max: 79, grade: "ME", gpa: "3.0", label: "Meeting Expectations", remark: "Demonstrates solid mastery of foundational grade-level skills.", pill: "pill-info" },
  { min: 50, max: 64, grade: "AP", gpa: "2.0", label: "Approaching Expectations", remark: "Beginning to understand concepts with periodic teacher guidance.", pill: "pill-warning" },
  { min: 0, max: 49, grade: "EM", gpa: "1.0", label: "Emerging", remark: "Requires sustained individualized support to build core competencies.", pill: "pill-danger" },
];

/* ── Default Standard Exam Schedule ────────────────────────────────────────── */
const DEFAULT_EXAMS: ExamSession[] = [
  { id: "ex-1", subject: "Mathematics (Paper 1 & 2)", subjectCode: "MTH", classLevel: "JSS 1 - SS 3", date: "2026-11-23", session: "Morning", time: "09:00 AM - 11:30 AM", hall: "Main Exam Hall A", capacity: 150, invigilator: "Mr. Chukwudi Eze" },
  { id: "ex-2", subject: "English Language (Essay & Obj)", subjectCode: "ENG", classLevel: "JSS 1 - SS 3", date: "2026-11-24", session: "Morning", time: "09:00 AM - 11:30 AM", hall: "Main Exam Hall A", capacity: 150, invigilator: "Mrs. Fatima Sanusi" },
  { id: "ex-3", subject: "Basic Science & Technology", subjectCode: "BSC", classLevel: "JSS 1 - JSS 3", date: "2026-11-25", session: "Morning", time: "09:00 AM - 11:00 AM", hall: "Science Complex Hall", capacity: 80, invigilator: "Mr. Ibrahim Bello" },
  { id: "ex-4", subject: "Physics (Theory & Practical)", subjectCode: "PHY", classLevel: "SS 1 - SS 3", date: "2026-11-25", session: "Morning", time: "09:00 AM - 11:30 AM", hall: "Physics Laboratory", capacity: 45, invigilator: "Dr. Oladipo Adeleke" },
  { id: "ex-5", subject: "Chemistry (Theory & Practical)", subjectCode: "CHM", classLevel: "SS 1 - SS 3", date: "2026-11-26", session: "Morning", time: "09:00 AM - 11:30 AM", hall: "Chemistry Laboratory", capacity: 45, invigilator: "Mrs. Ngozi Okonjo" },
  { id: "ex-6", subject: "Civic Education & Social Studies", subjectCode: "CVE", classLevel: "JSS 1 - SS 3", date: "2026-11-26", session: "Afternoon", time: "01:00 PM - 02:30 PM", hall: "Main Exam Hall B", capacity: 120, invigilator: "Mr. Musa Haruna" },
  { id: "ex-7", subject: "Computer Studies / ICT (Practical)", subjectCode: "CMP", classLevel: "JSS 1 - SS 3", date: "2026-11-27", session: "Morning", time: "09:00 AM - 12:00 PM", hall: "ICT Computer Center", capacity: 60, invigilator: "Engr. Kabir Lawan" },
  { id: "ex-8", subject: "Agricultural Science / Biology", subjectCode: "AGR", classLevel: "JSS 1 - SS 3", date: "2026-11-30", session: "Morning", time: "09:00 AM - 11:00 AM", hall: "Main Exam Hall A", capacity: 150, invigilator: "Mr. Chukwudi Eze" },
];

export default function ExamsPage() {
  const router = useRouter();
  const { isAdmin } = useCurrentUser();

  // Tabs: "terms" | "grading" | "timetable"
  const [activeTab, setActiveTab] = useState<"terms" | "grading" | "timetable">("terms");

  // Data State
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Grading Tab State
  const [gradingScaleType, setGradingScaleType] = useState<"waec" | "standard" | "primary">("waec");
  const [simCa1, setSimCa1] = useState(16);
  const [simCa2, setSimCa2] = useState(17);
  const [simExam, setSimExam] = useState(52);

  // Term Creation Modal State
  const [showTermModal, setShowTermModal] = useState(false);
  const [termName, setTermName] = useState("First Term");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [startDate, setStartDate] = useState("2025-09-08");
  const [endDate, setEndDate] = useState("2025-12-19");
  const [submittingTerm, setSubmittingTerm] = useState(false);

  // Exam Timetable State
  const [examList, setExamList] = useState<ExamSession[]>([]);
  const [examFilterLevel, setExamFilterLevel] = useState("ALL");
  const [showExamModal, setShowExamModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("JSS 1");
  const [newDate, setNewDate] = useState("2026-11-23");
  const [newSession, setNewSession] = useState<"Morning" | "Mid-Day" | "Afternoon">("Morning");
  const [newTime, setNewTime] = useState("09:00 AM - 11:30 AM");
  const [newHall, setNewHall] = useState("Main Exam Hall A");
  const [newInvigilator, setNewInvigilator] = useState("");

  /* ── 1. Fetch Terms & Metadata with Resilient Auth ────────────────────────── */
  const loadData = async () => {
    setLoading(true);
    setError("");
    setAuthError(false);

    try {
      const [resTerms, resSubs, resStaff] = await Promise.all([
        apiFetch(`${API}/api/v1/terms`),
        apiFetch(`${API}/api/v1/subjects`),
        apiFetch(`${API}/api/v1/staff`),
      ]);

      if (resTerms.status === 401) {
        setAuthError(true);
        setError("Your session has timed out. Please sign in to access exam management.");
        setLoading(false);
        return;
      }

      if (resTerms.ok) {
        const data = await resTerms.json();
        if (Array.isArray(data)) setTerms(data);
      } else {
        const errData = await resTerms.json().catch(() => ({}));
        setError(errData.message || "Failed to load academic terms");
      }

      if (resSubs.ok) {
        const data = await resSubs.json();
        if (Array.isArray(data)) setSubjects(data);
      }

      if (resStaff.ok) {
        const data = await resStaff.json();
        if (Array.isArray(data)) {
          setStaff(data);
          if (data.length > 0 && !newInvigilator) {
            setNewInvigilator(`${data[0].firstName} ${data[0].lastName}`);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to server";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Load persisted exam timetable from localStorage or default
    try {
      const savedExams = localStorage.getItem("sms_exam_timetable");
      if (savedExams) {
        setExamList(JSON.parse(savedExams));
      } else {
        setExamList(DEFAULT_EXAMS);
        localStorage.setItem("sms_exam_timetable", JSON.stringify(DEFAULT_EXAMS));
      }
    } catch {
      setExamList(DEFAULT_EXAMS);
    }
  }, []);

  /* ── Term Management Actions ─────────────────────────────────────────────── */
  async function handleSetCurrentTerm(termId: string) {
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(`${API}/api/v1/terms/${termId}/set-current`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to set current term.");
        return;
      }
      setSuccess("Active academic term updated successfully.");
      loadData();
    } catch {
      setError("Network error updating term.");
    }
  }

  async function handleCreateTerm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmittingTerm(true);

    try {
      const res = await apiFetch(`${API}/api/v1/terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: termName,
          academicYear: academicYear.trim(),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Could not create term.");
        return;
      }

      setSuccess(`Term "${termName}" (${academicYear}) created successfully.`);
      setShowTermModal(false);
      loadData();
    } catch {
      setError("Network connection failed.");
    } finally {
      setSubmittingTerm(false);
    }
  }

  /* ── Exam Timetable Actions ──────────────────────────────────────────────── */
  function handleAddExam(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject || !newDate || !newTime || !newHall) return;

    const session: ExamSession = {
      id: `ex-${Date.now()}`,
      subject: newSubject.trim(),
      classLevel: newClassLevel,
      date: newDate,
      session: newSession,
      time: newTime.trim(),
      hall: newHall.trim(),
      invigilator: newInvigilator || "Academic Staff Invigilator",
    };

    const updated = [...examList, session].sort((a, b) => a.date.localeCompare(b.date));
    setExamList(updated);
    try {
      localStorage.setItem("sms_exam_timetable", JSON.stringify(updated));
    } catch {}

    setShowExamModal(false);
    setNewSubject("");
    setSuccess(`Exam paper "${session.subject}" scheduled for ${session.date}.`);
  }

  function handleAutoGenerateExamSchedule() {
    // Generate standard schedule across classes using real subjects
    const sessionList: ExamSession[] = [];
    const subjectsToUse = subjects.length > 0
      ? subjects.map((s) => s.name)
      : ["Mathematics", "English Language", "Basic Science", "Civic Education", "Computer Studies", "Physics", "Chemistry", "Biology", "Agricultural Science", "Economics"];

    const dates = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-30", "2026-12-01", "2026-12-02"];
    const halls = ["Main Examination Hall A", "Main Examination Hall B", "Science Complex", "ICT Lab"];

    subjectsToUse.forEach((sub, idx) => {
      const dIndex = idx % dates.length;
      const hIndex = idx % halls.length;
      const invig = staff.length > 0 ? `${staff[idx % staff.length].firstName} ${staff[idx % staff.length].lastName}` : "Mr. Chukwudi Eze";

      sessionList.push({
        id: `auto-ex-${idx + 1}`,
        subject: `${sub} (Paper 1 & 2)`,
        classLevel: idx % 2 === 0 ? "JSS 1 - JSS 3" : "SS 1 - SS 3",
        date: dates[dIndex],
        session: idx % 3 === 0 ? "Afternoon" : "Morning",
        time: idx % 3 === 0 ? "01:00 PM - 03:00 PM" : "09:00 AM - 11:30 AM",
        hall: halls[hIndex],
        capacity: 120,
        invigilator: invig,
      });
    });

    sessionList.sort((a, b) => a.date.localeCompare(b.date));
    setExamList(sessionList);
    try {
      localStorage.setItem("sms_exam_timetable", JSON.stringify(sessionList));
    } catch {}
    setSuccess(`Examination timetable generated successfully: ${sessionList.length} papers scheduled across ${dates.length} exam days.`);
  }

  const [deletingExam, setDeletingExam] = useState<ExamSession | null>(null);

  function handleConfirmDeleteExam() {
    if (!deletingExam) return;
    const updated = examList.filter((ex) => ex.id !== deletingExam.id);
    setExamList(updated);
    try {
      localStorage.setItem("sms_exam_timetable", JSON.stringify(updated));
    } catch {}
    setDeletingExam(null);
  }

  /* ── Filtered Exam Timetable ─────────────────────────────────────────────── */
  const filteredExams = useMemo(() => {
    if (examFilterLevel === "ALL") return examList;
    return examList.filter((e) => e.classLevel.toLowerCase().includes(examFilterLevel.toLowerCase()));
  }, [examList, examFilterLevel]);

  /* ── Current Active Term Details ─────────────────────────────────────────── */
  const currentTerm = useMemo(() => terms.find((t) => t.isCurrent) || terms[0], [terms]);

  /* ── Term Duration Calculator ────────────────────────────────────────────── */
  const termStats = useMemo(() => {
    if (!currentTerm) return { weeks: 14, daysRemaining: 0 };
    const s = new Date(currentTerm.startDate);
    const e = new Date(currentTerm.endDate);
    const now = new Date();
    const diffTime = Math.max(0, e.getTime() - s.getTime());
    const weeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
    const remainTime = Math.max(0, e.getTime() - now.getTime());
    const daysRemaining = Math.ceil(remainTime / (1000 * 60 * 60 * 24));
    return { weeks: weeks || 14, daysRemaining };
  }, [currentTerm]);

  /* ── Grade Simulator Computed Result ─────────────────────────────────────── */
  const simTotal = useMemo(() => {
    const c1 = Math.min(20, Math.max(0, Number(simCa1) || 0));
    const c2 = Math.min(20, Math.max(0, Number(simCa2) || 0));
    const ex = Math.min(60, Math.max(0, Number(simExam) || 0));
    return c1 + c2 + ex;
  }, [simCa1, simCa2, simExam]);

  const simEvaluation = useMemo(() => {
    if (gradingScaleType === "waec") {
      const match = WAEC_SCALE.find((s) => simTotal >= s.min && simTotal <= s.max) || WAEC_SCALE[WAEC_SCALE.length - 1];
      return { grade: match.grade, label: match.label, gpa: match.gpa, pill: match.pill, remark: match.remark };
    } else if (gradingScaleType === "standard") {
      const match = STANDARD_SCALE.find((s) => simTotal >= s.min && simTotal <= s.max) || STANDARD_SCALE[STANDARD_SCALE.length - 1];
      return { grade: match.grade, label: match.label, gpa: match.gpa, pill: match.pill, remark: match.remark };
    } else {
      const match = PRIMARY_COMPETENCY_SCALE.find((s) => simTotal >= s.min && simTotal <= s.max) || PRIMARY_COMPETENCY_SCALE[PRIMARY_COMPETENCY_SCALE.length - 1];
      return { grade: match.grade, label: match.label, gpa: match.gpa, pill: match.pill, remark: match.remark };
    }
  }, [simTotal, gradingScaleType]);

  return (
    <div className="page">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="page-header no-print">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="page-title">Exam &amp; Term Management</h1>
            {currentTerm && (
              <span className="pill-success" style={{ gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--color-success-text)" }} />
                {currentTerm.name} ({currentTerm.academicYear})
              </span>
            )}
          </div>
          <p className="page-subtitle">
            Configure academic sessions, WAEC grading criteria, and official examination schedules.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Quick link to Class Routine Timetable */}
          <Link href="/timetable" className="btn btn-secondary" style={{ gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Class Routine Timetable 
          </Link>

          {activeTab === "terms" && isAdmin && (
            <button
              type="button"
              onClick={() => setShowTermModal(true)}
              className="btn btn-primary"
            >
              + Create Academic Term
            </button>
          )}

          {activeTab === "timetable" && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.print()}
                title="Print Official Examination Docket"
              >
                Print Official Examination Docket (Standard A4 Format)
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowExamModal(true)}
                  className="btn btn-primary"
                >
                  + Schedule Exam Paper
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Session / Auth Banner ───────────────────────────────────────────── */}
      {authError && (
        <div
          className="card no-print"
          style={{
            marginBottom: 20,
            backgroundColor: "var(--color-danger-bg)",
            borderColor: "var(--color-danger-text)",
            borderWidth: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "14px 18px",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-danger-text)" }}>
              ️ Session Timed Out / Authentication Required
            </div>
            <div style={{ fontSize: 12, color: "var(--color-danger-text)", marginTop: 2 }}>
              Your login token has expired or is inactive. Sign back in to perform administrative updates.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push("/login")}
            style={{ padding: "6px 16px", fontSize: 12 }}
          >
            Sign In Now
          </button>
        </div>
      )}

      {/* ── Status Notifications ───────────────────────────────────────────── */}
      {success && !authError && (
        <div className="pill-success no-print" style={{ display: "block", marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-control)" }}>
          {success}
        </div>
      )}
      {error && !authError && (
        <div className="pill-danger no-print" style={{ display: "block", marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-control)" }}>
          {error}
        </div>
      )}

      {/* ── Top Metric Highlights ───────────────────────────────────────────── */}
      <div className="stats-grid no-print" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: 24 }}>
        <div className="card" style={{ padding: "14px 18px" }}>
          <div className="stat-label">Active Academic Term</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {currentTerm ? currentTerm.name : "Not Configured"}
          </div>
          <div className="stat-sub">
            {currentTerm ? `${currentTerm.academicYear} · ${termStats.weeks} Weeks Session` : "Configure below"}
          </div>
        </div>
        <div className="card" style={{ padding: "14px 18px" }}>
          <div className="stat-label">Term Duration</div>
          <div className="stat-value" style={{ fontSize: 24 }}>
            {termStats.daysRemaining > 0 ? `${termStats.daysRemaining} Days` : "Term Complete"}
          </div>
          <div className="stat-sub">Until terminal exams &amp; vacation</div>
        </div>
        <div className="card" style={{ padding: "14px 18px" }}>
          <div className="stat-label">Official Grading Scale</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            WAEC 9-Point
          </div>
          <div className="stat-sub">Continuous Assessment (40%) + Exam (60%)</div>
        </div>
        <div className="card" style={{ padding: "14px 18px" }}>
          <div className="stat-label">Scheduled Exam Papers</div>
          <div className="stat-value" style={{ fontSize: 24 }}>
            {examList.length}
          </div>
          <div className="stat-sub">Across all class arms &amp; venues</div>
        </div>
      </div>

      {/* ── Navigation Pill Tabs ────────────────────────────────────────────── */}
      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--color-border)", paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab("terms")}
          style={{
            border: "none",
            backgroundColor: activeTab === "terms" ? "var(--color-ink)" : "var(--color-surface)",
            color: activeTab === "terms" ? "#FFFFFF" : "var(--color-text-secondary)",
            padding: "8px 20px",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: activeTab === "terms" ? "var(--color-ink)" : "var(--color-border)",
            transition: "all 0.15s",
          }}
        >
          Academic Terms &amp; Sessions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("grading")}
          style={{
            border: "none",
            backgroundColor: activeTab === "grading" ? "var(--color-ink)" : "var(--color-surface)",
            color: activeTab === "grading" ? "#FFFFFF" : "var(--color-text-secondary)",
            padding: "8px 20px",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: activeTab === "grading" ? "var(--color-ink)" : "var(--color-border)",
            transition: "all 0.15s",
          }}
        >
          Grading Scale &amp; Assessment
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("timetable")}
          style={{
            border: "none",
            backgroundColor: activeTab === "timetable" ? "var(--color-ink)" : "var(--color-surface)",
            color: activeTab === "timetable" ? "#FFFFFF" : "var(--color-text-secondary)",
            padding: "8px 20px",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: activeTab === "timetable" ? "var(--color-ink)" : "var(--color-border)",
            transition: "all 0.15s",
          }}
        >
          Examination Master Schedule
        </button>
      </div>

      {/* ── TAB 1: ACADEMIC TERMS & SESSIONS ───────────────────────────────── */}
      {activeTab === "terms" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "var(--color-page)" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Configured Academic Terms
              </h2>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                Term dates govern attendance rosters, score sheet submission deadlines, and fee invoicing.
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowTermModal(true)}
                style={{ padding: "6px 14px", fontSize: 12 }}
              >
                + Add Term
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 24 }}>
              <div className="skeleton" style={{ height: 160 }} />
            </div>
          ) : terms.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <div className="empty-state-icon" style={{ fontSize: 40 }}></div>
              <div className="empty-state-title" style={{ fontSize: 16 }}>No academic terms found</div>
              <div className="empty-state-text" style={{ maxWidth: 400, margin: "0 auto 16px" }}>
                Establish your school academic sessions and term calendar to start recording attendance and grades.
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowTermModal(true)}
                  className="btn btn-primary"
                >
                  Create Academic Term
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Term Name</th>
                    <th>Academic Year</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Duration</th>
                    <th>Status</th>
                    {isAdmin && <th style={{ textAlign: "right" }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {terms.map((t) => {
                    const s = new Date(t.startDate);
                    const e = new Date(t.endDate);
                    const w = Math.round(Math.max(0, e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 7));

                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 700, color: "var(--color-ink)" }}>{t.name}</td>
                        <td style={{ fontWeight: 500 }}>{t.academicYear}</td>
                        <td>{new Date(t.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td>{new Date(t.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td><span className="pill-neutral">{w} Weeks</span></td>
                        <td>
                          {t.isCurrent ? (
                            <span className="pill-success" style={{ gap: 4 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--color-success-text)" }} />
                              Active / Current
                            </span>
                          ) : (
                            <span className="pill-neutral">Inactive</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td style={{ textAlign: "right" }}>
                            {!t.isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleSetCurrentTerm(t.id)}
                                className="btn btn-secondary"
                                style={{ padding: "4px 12px", fontSize: 12 }}
                              >
                                Set as Active
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: GRADING SCALE & EVALUATION SYSTEM ───────────────────────── */}
      {activeTab === "grading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Assessment Weighting Breakdown Banner */}
          <div className="card" style={{ backgroundColor: "var(--color-surface)", padding: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--color-ink)" }}>
              Continuous Assessment (CA) &amp; Examination Weighting Framework
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
              Composite terminal scores are evaluated out of 100 marks compliant with the National Educational Research and Development Council (NERDC) standard:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div style={{ padding: "16px 18px", backgroundColor: "var(--color-page)", borderRadius: "var(--radius-card, 16px)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 120 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}>Assessment 1 (CA 1)</span>
                    <span className="pill-info" style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", whiteSpace: "nowrap" }}>20% Weight</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1.1 }}>20 Marks</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 10, lineHeight: 1.4 }}>
                  Mid-term diagnostic test and homework assignments
                </div>
              </div>

              <div style={{ padding: "16px 18px", backgroundColor: "var(--color-page)", borderRadius: "var(--radius-card, 16px)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 120 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}>Assessment 2 (CA 2)</span>
                    <span className="pill-info" style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", whiteSpace: "nowrap" }}>20% Weight</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1.1 }}>20 Marks</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 10, lineHeight: 1.4 }}>
                  Practical projects, laboratory coursework and tests
                </div>
              </div>

              <div style={{ padding: "16px 18px", backgroundColor: "var(--color-page)", borderRadius: "var(--radius-card, 16px)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 120 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)", letterSpacing: "0.05em" }}>Terminal Exam</span>
                    <span className="pill-success" style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", whiteSpace: "nowrap" }}>60% Weight</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1.1 }}>60 Marks</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 10, lineHeight: 1.4 }}>
                  End-of-term examination theory and practical paper
                </div>
              </div>

              <div style={{ padding: "16px 18px", backgroundColor: "var(--color-ink)", color: "#FFFFFF", borderRadius: "var(--radius-card, 16px)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 120 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", opacity: 0.85, letterSpacing: "0.05em" }}>Composite Total</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.2)", color: "#FFFFFF", whiteSpace: "nowrap" }}>100% Total</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>100 Marks</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 10, lineHeight: 1.4 }}>
                  Official terminal performance recorded on report cards
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Grade Simulator & Honor Thresholds */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {/* Simulator Card */}
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "var(--color-ink)" }}>
                Live Grade Evaluation Simulator
              </h3>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 14 }}>
                Simulate candidate scores to preview computed total, WAEC letter grade, GPA weight, and teacher remark.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label className="label">CA 1 (Max 20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={simCa1}
                    onChange={(e) => setSimCa1(Number(e.target.value))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">CA 2 (Max 20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={simCa2}
                    onChange={(e) => setSimCa2(Number(e.target.value))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Exam (Max 60)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={simExam}
                    onChange={(e) => setSimExam(Number(e.target.value))}
                    className="input"
                  />
                </div>
              </div>

              {/* Computed Outcome Display */}
              <div style={{ padding: "16px 18px", backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>Composite Score:</span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: "var(--color-ink)", marginLeft: 6 }}>{simTotal} / 100</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className={simEvaluation.pill} style={{ fontSize: 13, fontWeight: 800, padding: "3px 12px" }}>
                      {simEvaluation.grade}
                    </span>
                    <span className="pill-neutral" style={{ fontWeight: 700 }}>GPA {simEvaluation.gpa}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>
                  Classification: {simEvaluation.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                  {simEvaluation.remark}
                </div>
              </div>
            </div>

            {/* Academic Honors Card */}
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "var(--color-ink)" }}>
                Academic Honors &amp; Distinction Thresholds
              </h3>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 14 }}>
                Official criteria for termly academic honor roll and graduation citations.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderRadius: "var(--radius-control)", backgroundColor: "#FEF3C7", border: "1px solid #FDE68A" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Principal's First-Class Honors</div>
                    <div style={{ fontSize: 11, color: "#B45309", marginTop: 2, lineHeight: 1.3 }}>Overall average of 85.0% and above across all subjects</div>
                  </div>
                  <span className="pill-warning" style={{ fontWeight: 800, flexShrink: 0, minWidth: 64, textAlign: "center" }}>&ge; 85%</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderRadius: "var(--radius-control)", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF" }}>Academic Merit Roll</div>
                    <div style={{ fontSize: 11, color: "#2563EB", marginTop: 2, lineHeight: 1.3 }}>Overall average between 75.0% and 84.9%</div>
                  </div>
                  <span className="pill-info" style={{ fontWeight: 800, flexShrink: 0, minWidth: 64, textAlign: "center" }}>75% - 84%</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderRadius: "var(--radius-control)", backgroundColor: "var(--color-page)", border: "1px solid var(--color-border)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>Academic Good Standing</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, lineHeight: 1.3 }}>Pass criteria met without deficiency</div>
                  </div>
                  <span className="pill-neutral" style={{ fontWeight: 700, flexShrink: 0, minWidth: 64, textAlign: "center" }}>50% - 74%</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderRadius: "var(--radius-control)", backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B" }}>Academic Watch / Remedial</div>
                    <div style={{ fontSize: 11, color: "#B91C1C", marginTop: 2, lineHeight: 1.3 }}>Below passing threshold; parent counseling triggered</div>
                  </div>
                  <span className="pill-danger" style={{ fontWeight: 800, flexShrink: 0, minWidth: 64, textAlign: "center" }}>&lt; 40%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scale Table Card with Scale Switcher */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, backgroundColor: "var(--color-page)" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Grading Scale Matrix &amp; GPA Conversion
                </h3>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                  Standard boundary definitions utilized across all report cards and official transcripts.
                </p>
              </div>

              {/* Scale Selector Buttons */}
              <div style={{ display: "inline-flex", padding: 3, backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 9999 }}>
                <button
                  type="button"
                  onClick={() => setGradingScaleType("waec")}
                  style={{
                    border: "none",
                    backgroundColor: gradingScaleType === "waec" ? "var(--color-ink)" : "transparent",
                    color: gradingScaleType === "waec" ? "#FFFFFF" : "var(--color-text-secondary)",
                    padding: "4px 14px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  WAEC 9-Point Scale
                </button>
                <button
                  type="button"
                  onClick={() => setGradingScaleType("standard")}
                  style={{
                    border: "none",
                    backgroundColor: gradingScaleType === "standard" ? "var(--color-ink)" : "transparent",
                    color: gradingScaleType === "standard" ? "#FFFFFF" : "var(--color-text-secondary)",
                    padding: "4px 14px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Universal 6-Point
                </button>
                <button
                  type="button"
                  onClick={() => setGradingScaleType("primary")}
                  style={{
                    border: "none",
                    backgroundColor: gradingScaleType === "primary" ? "var(--color-ink)" : "transparent",
                    color: gradingScaleType === "primary" ? "#FFFFFF" : "var(--color-text-secondary)",
                    padding: "4px 14px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Primary 4-Tier
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Score Range</th>
                    <th>Grade Code</th>
                    <th>Grade Point (GPA)</th>
                    <th>Academic Classification</th>
                    <th>Official Performance Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {(gradingScaleType === "waec" ? WAEC_SCALE : gradingScaleType === "standard" ? STANDARD_SCALE : PRIMARY_COMPETENCY_SCALE).map((item) => (
                    <tr key={item.grade}>
                      <td style={{ fontWeight: 700, color: "var(--color-ink)" }}>{item.min}% – {item.max}%</td>
                      <td>
                        <span className={item.pill} style={{ fontWeight: 800, padding: "2px 10px" }}>
                          {item.grade}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--color-ink)" }}>{item.gpa}</td>
                      <td style={{ fontWeight: 600 }}>{item.label}</td>
                      <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{item.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: EXAMINATION TIMETABLE & HALL ALLOCATOR ──────────────────── */}
      {activeTab === "timetable" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top Timetable Toolbar & Quick Generator */}
          <div className="card no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
                Filter Level:
              </span>
              <select
                className="input"
                style={{ width: "auto", minWidth: 140, padding: "6px 12px", height: 36 }}
                value={examFilterLevel}
                onChange={(e) => setExamFilterLevel(e.target.value)}
              >
                <option value="ALL">All Levels (JSS &amp; SS)</option>
                <option value="JSS">Junior Secondary (JSS 1 - 3)</option>
                <option value="SS">Senior Secondary (SS 1 - 3)</option>
                <option value="JSS 1">JSS 1 Only</option>
                <option value="JSS 2">JSS 2 Only</option>
                <option value="JSS 3">JSS 3 Only</option>
                <option value="SS 1">SS 1 Only</option>
                <option value="SS 2">SS 2 Only</option>
                <option value="SS 3">SS 3 Only</option>
              </select>

              <span className="pill-success" style={{ fontSize: 11, gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--color-success-text)" }} />
                0 Venue / Time Conflicts
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAutoGenerateExamSchedule}
                    title="Automatically schedule exam papers across 2 exam weeks"
                  >
                    Auto-Schedule Exam Timetable
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowExamModal(true)}
                  >
                    + Schedule Paper
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Printable Header Docket */}
          <div
            className="print-only-header"
            style={{
              display: "none",
              textAlign: "center",
              marginBottom: 20,
              borderBottom: "2px solid #000",
              paddingBottom: 12,
            }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              MODERN SCHOOL
            </h2>
            <p style={{ fontSize: 13, margin: "3px 0 0", color: "#222" }}>
              Official Examination Master Schedule &amp; Hall Allocations · {currentTerm?.academicYear ?? "2025/2026"} Session
            </p>
            <p style={{ fontSize: 12, fontWeight: 700, margin: "4px 0 0" }}>
              TERM: {currentTerm?.name ?? "First Term"} · CANDIDATE EXAMINATION DOCKET
            </p>
          </div>

          {/* Scheduled Papers Table Card */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "var(--color-page)" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Scheduled Examination Papers ({filteredExams.length})
                </h3>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                  Official seating venues, invigilator assignments, and examination time slots.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary no-print"
                onClick={() => window.print()}
                style={{ padding: "5px 12px", fontSize: 12 }}
              >
                Print Official Examination Docket (Standard A4 Format)
              </button>
            </div>

            {filteredExams.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon" style={{ fontSize: 36 }}></div>
                <div className="empty-state-title">No examination papers scheduled for this level</div>
                <div className="empty-state-text">Use Auto-Schedule or add individual subject papers.</div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateExamSchedule}
                    className="btn btn-primary"
                  >
                    Auto-Schedule All Exams Now
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Exam Paper / Subject</th>
                      <th>Target Class</th>
                      <th>Date</th>
                      <th>Session</th>
                      <th>Time Window</th>
                      <th>Examination Venue</th>
                      <th>Chief Invigilator</th>
                      {isAdmin && <th className="no-print" style={{ textAlign: "right" }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.map((ex) => (
                      <tr key={ex.id}>
                        <td style={{ fontWeight: 700, color: "var(--color-ink)" }}>
                          <div>{ex.subject}</div>
                          {ex.subjectCode && (
                            <span className="pill-neutral" style={{ fontSize: 10, padding: "1px 6px", marginTop: 2 }}>
                              {ex.subjectCode}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="pill-neutral" style={{ fontWeight: 600 }}>{ex.classLevel}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {new Date(ex.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td>
                          <span className={ex.session === "Morning" ? "pill-info" : ex.session === "Mid-Day" ? "pill-warning" : "pill-neutral"}>
                            {ex.session}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{ex.time}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ex.hall}</div>
                          {ex.capacity && (
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                              Cap: {ex.capacity} seats
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>
                              {ex.invigilator.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{ex.invigilator}</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="no-print" style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => setDeletingExam(ex)}
                              className="btn btn-danger"
                              style={{ padding: "4px 10px", fontSize: 11 }}
                              title="Remove paper from schedule"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Printable Candidate Instructions & Signatures */}
          <div
            className="print-only-signatures"
            style={{
              display: "none",
              marginTop: 24,
              paddingTop: 16,
              borderTop: "2px solid #000",
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
                Candidate Examination Directives &amp; Regulations:
              </div>
              <div style={{ fontSize: 10, color: "#333", lineHeight: 1.4 }}>
                1. Candidates must arrive at the examination hall at least 30 minutes before commencement.
                <br />
                2. Strict silence must be maintained. Unauthorized materials, phones, and programmable devices are strictly prohibited.
                <br />
                3. Examination index cards and validated fee clearance receipts must be placed visibly on the candidate desk.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24 }}>
              <div>
                <div style={{ width: 180, borderBottom: "1px solid #000", marginBottom: 4 }} />
                <div style={{ fontSize: 11, fontWeight: 700 }}>Chief Examination Officer</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#444" }}>School Examination Seal</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ width: 180, borderBottom: "1px solid #000", marginBottom: 4, marginLeft: "auto" }} />
                <div style={{ fontSize: 11, fontWeight: 700 }}>Principal / Academic Director</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE ACADEMIC TERM ─────────────────────────────────────── */}
      {showTermModal && isAdmin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(16, 20, 26, 0.48)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingTerm) setShowTermModal(false);
          }}
        >
          <div className="card" style={{ maxWidth: 460, width: "100%", padding: 24, backgroundColor: "var(--color-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>Create Academic Term</h3>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                  Define session start and end boundaries for official rosters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTermModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 4 }}
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTerm} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Term Name *</label>
                <select value={termName} onChange={(e) => setTermName(e.target.value)} className="input" required>
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>

              <div>
                <label className="label">Academic Year *</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2025/2026"
                  className="input"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Resumption Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Vacation Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowTermModal(false)}
                  className="btn btn-secondary"
                  disabled={submittingTerm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTerm}
                  className="btn btn-primary"
                >
                  {submittingTerm ? "Saving..." : "Save Academic Term"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SCHEDULE EXAM PAPER ──────────────────────────────────────── */}
      {showExamModal && isAdmin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(16, 20, 26, 0.48)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExamModal(false);
          }}
        >
          <div className="card" style={{ maxWidth: 480, width: "100%", padding: 24, backgroundColor: "var(--color-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>Schedule Examination Paper</h3>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                  Allocate paper time window, examination venue, and invigilator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExamModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 4 }}
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddExam} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Subject / Paper Name *</label>
                {subjects.length > 0 ? (
                  <select
                    className="input"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    required
                  >
                    <option value="">Select School Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={`${s.name} (Paper 1 & 2)`}>
                        {s.name} ({s.code || "SUB"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Mathematics (Paper 1 & 2)"
                    className="input"
                    required
                  />
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Target Class / Level *</label>
                  <select
                    value={newClassLevel}
                    onChange={(e) => setNewClassLevel(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="JSS 1 - SS 3">All Levels (JSS 1 - SS 3)</option>
                    <option value="JSS 1 - JSS 3">Junior Secondary (JSS 1 - 3)</option>
                    <option value="SS 1 - SS 3">Senior Secondary (SS 1 - 3)</option>
                    <option value="JSS 1">JSS 1 Only</option>
                    <option value="JSS 2">JSS 2 Only</option>
                    <option value="JSS 3">JSS 3 Only</option>
                    <option value="SS 1">SS 1 Only</option>
                    <option value="SS 2">SS 2 Only</option>
                    <option value="SS 3">SS 3 Only</option>
                  </select>
                </div>
                <div>
                  <label className="label">Exam Date *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Session Slot *</label>
                  <select
                    value={newSession}
                    onChange={(e) => {
                      const sess = e.target.value as "Morning" | "Mid-Day" | "Afternoon";
                      setNewSession(sess);
                      if (sess === "Morning") setNewTime("09:00 AM - 11:30 AM");
                      else if (sess === "Mid-Day") setNewTime("11:45 AM - 01:15 PM");
                      else setNewTime("01:30 PM - 03:30 PM");
                    }}
                    className="input"
                  >
                    <option value="Morning">Morning (09:00 - 11:30)</option>
                    <option value="Mid-Day">Mid-Day (11:45 - 01:15)</option>
                    <option value="Afternoon">Afternoon (01:30 - 03:30)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Exact Time Window *</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 09:00 AM - 11:30 AM"
                    className="input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Hall / Venue *</label>
                  <select
                    className="input"
                    value={newHall}
                    onChange={(e) => setNewHall(e.target.value)}
                  >
                    <option value="Main Exam Hall A">Main Exam Hall A (150 seats)</option>
                    <option value="Main Exam Hall B">Main Exam Hall B (120 seats)</option>
                    <option value="Science Complex Hall">Science Complex (80 seats)</option>
                    <option value="Physics Laboratory">Physics Laboratory (45 seats)</option>
                    <option value="Chemistry Laboratory">Chemistry Laboratory (45 seats)</option>
                    <option value="ICT Computer Center">ICT Computer Center (60 seats)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Chief Invigilator</label>
                  {staff.length > 0 ? (
                    <select
                      className="input"
                      value={newInvigilator}
                      onChange={(e) => setNewInvigilator(e.target.value)}
                    >
                      {staff.map((s) => (
                        <option key={s.id} value={`${s.firstName} ${s.lastName}`}>
                          {s.firstName} {s.lastName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newInvigilator}
                      onChange={(e) => setNewInvigilator(e.target.value)}
                      placeholder="e.g. Mr. Chukwudi Eze"
                      className="input"
                    />
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add to Timetable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Print Stylesheet ───────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          nav,
          header,
          .no-print,
          button,
          select {
            display: none !important;
          }
          .page {
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
          }
          .card {
            border: 1px solid #333 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .table th,
          .table td {
            border: 1px solid #333 !important;
            padding: 4px 6px !important;
          }
          .print-only-header {
            display: block !important;
          }
          .print-only-signatures {
            display: block !important;
          }
        }
      `}</style>

      {/* 2-Step Confirmation: Remove Exam Paper */}
      {deletingExam && (
        <ActionConfirmationModal
          isOpen={Boolean(deletingExam)}
          title="Confirm Removal of Examination Paper"
          message="Are you sure you want to permanently remove this examination paper from the active timetable?"
          confirmText="Remove Paper"
          confirmVariant="danger"
          isProcessing={false}
          onConfirm={handleConfirmDeleteExam}
          onCancel={() => setDeletingExam(null)}
          details={[
            { label: "Subject", value: deletingExam.subject, highlight: true },
            { label: "Class Level", value: deletingExam.classLevel },
            { label: "Date & Time", value: `${deletingExam.date} (${deletingExam.time})`, highlight: true },
            { label: "Venue & Hall", value: deletingExam.hall },
            { label: "Assigned Invigilator", value: deletingExam.invigilator },
          ]}
          warningNote="Removing this examination paper will delete it from the published timetable and candidate dockets."
        />
      )}
    </div>
  );
}
