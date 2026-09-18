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
}

interface ReportCardData {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string | null;
    gender: string | null;
  };
  term: { id: string; name: string; academicYear: string };
  classSection: { id: string; name: string; level: string };
  scores: ScoreRecord[];
  summary: {
    subjectsOffered: number;
    subjectsScored: number;
    overallTotal: number;
    overallAverage: number | null;
    position: number | null;
    totalStudentsInClass: number;
  };
}

function getGradeRemarks(grade: string | null): string {
  switch (grade) {
    case "A": return "Distinction";
    case "B": return "Very Good";
    case "C": return "Good";
    case "D": return "Pass";
    case "E": return "Fair";
    case "F": return "Needs Improvement";
    default: return "Pending";
  }
}

function getGradePillClass(grade: string | null): string {
  switch (grade) {
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

function formatOrdinal(n: number | null): string {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ResultsPage() {
  const { user, isParent, loading: loadingUser } = useCurrentUser();

  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parentWards, setParentWards] = useState<ParentWard[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

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
        if (isParent) {
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
  }, [isParent, loadingUser, fetchReportCard]);

  // When class changes for Admin/Teacher, fetch students in that class
  useEffect(() => {
    if (isParent) return;

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
  }, [selectedClassId, isParent]);

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

    if (isParent && selectedStudentId && termId) {
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

  const schoolName = user?.school?.name || "Modern School Academy";

  return (
    <div className="page">
      {/* Header with Print action */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">{isParent ? "Report Cards" : "Online Results & Report Cards"}</h1>
          <p className="page-subtitle">
            {isParent
              ? "Official terminal report cards, grades, subject remarks, and class positions for your registered wards."
              : "Generate and inspect official student terminal academic reports."}
          </p>
        </div>
        {reportCard && (
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

      {/* Control Selection Card */}
      <div className="card no-print" style={{ marginBottom: 24 }}>
        {isParent ? (
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

      {/* Loading Skeleton */}
      {loading && (
        <div className="card" style={{ padding: 32 }}>
          <div className="skeleton" style={{ height: 60, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 200, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 100 }} />
        </div>
      )}

      {/* Report Card Display */}
      {reportCard && !loading && (
        <div
          className="card"
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "36px 32px",
            backgroundColor: "#ffffff",
            color: "var(--color-ink)",
          }}
        >
          {/* Official Letterhead Header */}
          <div style={{ textAlign: "center", borderBottom: "2px solid var(--color-ink)", paddingBottom: 18, marginBottom: 24 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  backgroundColor: "var(--color-ink)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {schoolName.charAt(0)}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {schoolName}
              </h2>
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 6px" }}>
              Official Terminal Student Progress and Assessment Report
            </p>
            <div
              style={{
                display: "inline-block",
                padding: "3px 14px",
                backgroundColor: "var(--color-ink)",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: "var(--radius-pill-badge)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Academic Progress Report Card
            </div>
          </div>

          {/* Student Profile Block */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              padding: "14px 18px",
              backgroundColor: "var(--color-page)",
              borderRadius: "var(--radius-control)",
              marginBottom: 24,
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Student Name: </span>
              <strong>{reportCard.student.lastName}, {reportCard.student.firstName}</strong>
            </div>
            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Admission No: </span>
              <strong>{reportCard.student.admissionNumber ?? "N/A"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Class: </span>
              <strong>{reportCard.classSection.name} ({reportCard.classSection.level})</strong>
            </div>
            <div>
              <span style={{ color: "var(--color-text-secondary)" }}>Term &amp; Session: </span>
              <strong>{reportCard.term.name} ({reportCard.term.academicYear})</strong>
            </div>
          </div>

          {/* Subject Scores Table */}
          {reportCard.scores.length === 0 ? (
            <div
              style={{
                padding: 28,
                textAlign: "center",
                color: "var(--color-text-secondary)",
                fontSize: 13,
                backgroundColor: "var(--color-page)",
                borderRadius: "var(--radius-control)",
                marginBottom: 24,
              }}
            >
              No continuous assessment or examination scores recorded for this term yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto", marginBottom: 24 }}>
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th style={{ textAlign: "center" }}>CA 1 (20)</th>
                    <th style={{ textAlign: "center" }}>CA 2 (20)</th>
                    <th style={{ textAlign: "center" }}>Exam (60)</th>
                    <th style={{ textAlign: "center" }}>Total (100)</th>
                    <th style={{ textAlign: "center" }}>Grade</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.scores.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.subject.name}</td>
                      <td style={{ textAlign: "center" }}>{s.ca1 ?? "—"}</td>
                      <td style={{ textAlign: "center" }}>{s.ca2 ?? "—"}</td>
                      <td style={{ textAlign: "center" }}>{s.exam ?? "—"}</td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {s.total !== null ? Math.round(s.total) : "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={getGradePillClass(s.grade)}>
                          {s.grade ?? "—"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {getGradeRemarks(s.grade)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary & Positions Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              padding: "16px",
              backgroundColor: "var(--color-page)",
              borderRadius: "var(--radius-control)",
              marginBottom: 28,
              textAlign: "center",
            }}
          >
            <div>
              <div className="stat-label">Total Marks</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {reportCard.summary.overallTotal} / {reportCard.summary.subjectsOffered * 100}
              </div>
            </div>
            <div>
              <div className="stat-label">Term Average</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)" }}>
                {reportCard.summary.overallAverage !== null ? `${reportCard.summary.overallAverage}%` : "—"}
              </div>
            </div>
            <div>
              <div className="stat-label">Class Position</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {reportCard.summary.position
                  ? `${formatOrdinal(reportCard.summary.position)} of ${reportCard.summary.totalStudentsInClass}`
                  : "—"}
              </div>
            </div>
          </div>

          {/* Remarks and Signatures */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, paddingTop: 12 }}>
            <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                Class Teacher Remarks
              </p>
              <p style={{ fontSize: 13, fontStyle: "italic", marginTop: 4 }}>
                {reportCard.summary.overallAverage && reportCard.summary.overallAverage >= 70
                  ? "An exemplary performance. Maintained consistent diligence and focus."
                  : reportCard.summary.overallAverage && reportCard.summary.overallAverage >= 50
                  ? "Good effort shown this term. Capable of higher achievement with more consistency."
                  : "Needs close academic monitoring and targeted study improvement."}
              </p>
            </div>
            <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 12, textAlign: "right" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                Principal Signature &amp; Stamp
              </p>
              <div style={{ height: 38 }} />
              <div style={{ display: "inline-block", borderTop: "1px solid var(--color-ink)", width: 180, textAlign: "center", paddingTop: 4, fontSize: 11 }}>
                Authorized School Administrator
              </div>
            </div>
          </div>
        </div>
      )}

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
