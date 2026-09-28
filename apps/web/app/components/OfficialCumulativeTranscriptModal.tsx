"use client";

import { useEffect, useMemo, useRef } from "react";

interface StudentScore {
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
}

interface StudentEnrollment {
  id: string;
  academicYear: string;
  status: string;
  classSection: {
    id: string;
    name: string;
    level: string;
    teacher?: { firstName: string; lastName: string } | null;
  };
}

export interface CumulativeTranscriptProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    otherNames?: string | null;
    admissionNumber?: string | null;
    enrolledAt?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    stateOfOrigin?: string | null;
    lga?: string | null;
    enrollmentStatus: string;
    enrollments: StudentEnrollment[];
    scores: StudentScore[];
    attendanceStats: {
      totalDays: number;
      presentDays: number;
      rate: number;
    };
    feeSummary: {
      totalInvoiced: number;
      totalPaid: number;
      outstandingBalance: number;
    };
    school?: {
      name: string;
      address?: string | null;
      state?: string | null;
      lga?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
    } | null;
  };
}

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

export default function OfficialCumulativeTranscriptModal({
  isOpen,
  onClose,
  student,
}: CumulativeTranscriptProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Group scores by Academic Year and Term
  const chronologicalTerms = useMemo(() => {
    interface TermGroup {
      sessionKey: string;
      academicYear: string;
      termName: string;
      classSectionName: string;
      classLevel: string;
      scores: StudentScore[];
      totalScore: number;
      averageScore: number;
    }

    const groups: Record<string, TermGroup> = {};

    student.scores.forEach((score) => {
      const year = score.term?.academicYear || score.academicYear || "2025/2026";
      const termName = score.term?.name || "Term 1";
      const key = `${year}___${termName}`;

      if (!groups[key]) {
        // Find matching enrollment for class info
        const matchingEnrollment = student.enrollments.find(
          (e) => e.academicYear === year || e.classSection.id === score.classSection?.id
        );
        const classSectionName =
          score.classSection?.name || matchingEnrollment?.classSection.name || "Academic Class";
        const classLevel =
          score.classSection?.level || matchingEnrollment?.classSection.level || "Standard";

        groups[key] = {
          sessionKey: key,
          academicYear: year,
          termName,
          classSectionName,
          classLevel,
          scores: [],
          totalScore: 0,
          averageScore: 0,
        };
      }

      groups[key].scores.push(score);
    });

    // Compute averages and sort sessions chronologically
    return Object.values(groups)
      .map((g) => {
        const scoredCount = g.scores.filter((s) => s.total !== null).length;
        const total = g.scores.reduce((sum, s) => sum + (s.total || 0), 0);
        const avg = scoredCount > 0 ? Math.round((total / scoredCount) * 10) / 10 : 0;
        return {
          ...g,
          totalScore: total,
          averageScore: avg,
        };
      })
      .sort((a, b) => a.academicYear.localeCompare(b.academicYear));
  }, [student.scores, student.enrollments]);

  // Overall Cumulative GPA & Metrics
  const cumulativeStats = useMemo(() => {
    const validScores = student.scores.filter((s) => s.total !== null);
    const totalMarks = validScores.reduce((sum, s) => sum + (s.total || 0), 0);
    const cumulativeAverage =
      validScores.length > 0 ? Math.round((totalMarks / validScores.length) * 10) / 10 : 0;

    let classification = "Pass";
    if (cumulativeAverage >= 75) classification = "Distinction / First Class Standing";
    else if (cumulativeAverage >= 65) classification = "Very Good / Upper Credit Standing";
    else if (cumulativeAverage >= 50) classification = "Good / Credit Standing";
    else classification = "Pass Standing";

    return {
      totalSubjectsScored: validScores.length,
      cumulativeAverage,
      classification,
      totalTerms: chronologicalTerms.length,
    };
  }, [student.scores, chronologicalTerms]);

  if (!isOpen) return null;

  const schoolName = student.school?.name || "Bright Future Academy";
  const schoolAddress =
    student.school?.address || "Gombe Road, Kashere, Gombe State, Nigeria";
  const schoolContact = student.school?.phone || "+234 800 000 0000";
  const schoolEmail = student.school?.email || "info@brightfuture.sch.ng";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cumulative-transcript-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "color-mix(in srgb, var(--color-ink, #0B2545) 60%, transparent)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        padding: "32px 16px 64px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="card"
        style={{
          width: "100%",
          maxWidth: 960,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(11, 37, 69, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--color-border, #E2E8F0)",
            backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-brand-navy, #0B2545)",
              }}
            >
              Institutional Records Desk
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary, #64748B)" }}>
              &middot; Official Cumulative Transcript Dossier
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-primary"
              style={{
                fontSize: 12.5,
                padding: "6px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Transcript (A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: 12.5, padding: "6px 12px" }}
              aria-label="Close transcript modal"
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div
          id="printable-transcript-area"
          style={{
            padding: "36px 40px",
            overflowY: "auto",
            backgroundColor: "#FFFFFF",
            color: "#0F172A",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Institutional School Letterhead */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid var(--color-brand-navy, #0B2545)",
              paddingBottom: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "3px 12px",
                borderRadius: 4,
                backgroundColor: "var(--color-brand-navy, #0B2545)",
                color: "#FFFFFF",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Official Academic Document
            </div>

            <h1
              id="cumulative-transcript-title"
              style={{
                fontSize: 24,
                fontWeight: 900,
                margin: "4px 0 2px 0",
                color: "var(--color-brand-navy, #0B2545)",
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
              }}
            >
              {schoolName}
            </h1>

            <div
              style={{
                fontSize: 12,
                fontStyle: "italic",
                color: "var(--color-brand-teal, #0E7D75)",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Motto: Excellence and Integrity
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: "#475569",
                lineHeight: 1.4,
              }}
            >
              {schoolAddress} &middot; Tel: {schoolContact} &middot; Email: {schoolEmail}
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "var(--color-brand-navy, #0B2545)",
                textTransform: "uppercase",
                padding: "6px 12px",
                borderTop: "1px dashed var(--color-border, #CBD5E1)",
                borderBottom: "1px dashed var(--color-border, #CBD5E1)",
              }}
            >
              Official Institutional Cumulative Transcript
            </div>
          </div>

          {/* Student Profile & Bio Summary Block */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              padding: "12px 16px",
              backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
              borderRadius: "var(--radius-control, 8px)",
              border: "1px solid var(--color-border, #E2E8F0)",
              fontSize: 12,
              marginBottom: 24,
            }}
          >
            <div>
              <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                Candidate Full Name
              </span>
              <span style={{ fontWeight: 800, fontSize: 13.5, color: "var(--color-brand-navy, #0B2545)" }}>
                {student.lastName.toUpperCase()}, {student.firstName} {student.otherNames || ""}
              </span>
            </div>

            <div>
              <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                Admission Number
              </span>
              <span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>
                {student.admissionNumber || "PENDING"}
              </span>
            </div>

            <div>
              <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                Date Enrolled
              </span>
              <span style={{ fontWeight: 600 }}>{formatDate(student.enrolledAt)}</span>
            </div>

            <div>
              <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                Gender &amp; Date of Birth
              </span>
              <span style={{ fontWeight: 600 }}>
                {student.gender || "—"} &middot; {formatDate(student.dateOfBirth)}
              </span>
            </div>

            <div>
              <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                State of Origin &amp; LGA
              </span>
              <span style={{ fontWeight: 600 }}>
                {student.stateOfOrigin || "—"} {student.lga ? `(${student.lga})` : ""}
              </span>
            </div>

            <div>
              <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                Institutional Standing
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    student.enrollmentStatus === "GRADUATED"
                      ? "var(--color-brand-teal, #0E7D75)"
                      : student.enrollmentStatus === "ACTIVE"
                      ? "#16A34A"
                      : "#DC2626",
                }}
              >
                {student.enrollmentStatus}
              </span>
            </div>
          </div>

          {/* Chronological Terms / Multi-Year Academic Tables */}
          {chronologicalTerms.length === 0 ? (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
                borderRadius: 8,
                border: "1px dashed var(--color-border, #CBD5E1)",
                color: "#64748B",
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              No academic scores have been recorded in the cumulative dossier for this student yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
              {chronologicalTerms.map((termGroup) => (
                <div
                  key={termGroup.sessionKey}
                  style={{
                    border: "1px solid var(--color-border, #E2E8F0)",
                    borderRadius: 6,
                    overflow: "hidden",
                    pageBreakInside: "avoid",
                  }}
                >
                  {/* Term Header Bar */}
                  <div
                    style={{
                      padding: "8px 14px",
                      backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
                      borderBottom: "1px solid var(--color-border, #E2E8F0)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          color: "var(--color-brand-navy, #0B2545)",
                        }}
                      >
                        {termGroup.academicYear} &middot; {termGroup.termName}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#64748B",
                          marginLeft: 10,
                        }}
                      >
                        Class: <strong>{termGroup.classSectionName}</strong> ({termGroup.classLevel})
                      </span>
                    </div>

                    <div style={{ fontSize: 11.5, color: "#334155", display: "flex", gap: 12 }}>
                      <span>
                        Subjects: <strong>{termGroup.scores.length}</strong>
                      </span>
                      <span>
                        Term Average:{" "}
                        <strong style={{ color: "var(--color-brand-teal, #0E7D75)" }}>
                          {termGroup.averageScore}%
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Term Subjects Table */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 11.5,
                      textAlign: "left",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#F1F5F9",
                          borderBottom: "1px solid var(--color-border, #E2E8F0)",
                          color: "#475569",
                          fontWeight: 700,
                        }}
                      >
                        <th style={{ padding: "6px 12px" }}>Subject Name</th>
                        <th style={{ padding: "6px 8px", width: 70 }}>Code</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", width: 65 }}>CA1 (20)</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", width: 65 }}>CA2 (20)</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", width: 65 }}>Exam (60)</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", width: 75 }}>Total (100)</th>
                        <th style={{ padding: "6px 8px", textAlign: "center", width: 60 }}>Grade</th>
                        <th style={{ padding: "6px 12px", width: 110 }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {termGroup.scores.map((s, idx) => (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: "1px solid #F1F5F9",
                            backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
                          }}
                        >
                          <td style={{ padding: "6px 12px", fontWeight: 600 }}>{s.subject.name}</td>
                          <td style={{ padding: "6px 8px", color: "#64748B", fontFamily: "monospace" }}>
                            {s.subject.code || "—"}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {s.ca1 ?? "—"}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {s.ca2 ?? "—"}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {s.exam ?? "—"}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              textAlign: "right",
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                              color: "var(--color-brand-navy, #0B2545)",
                            }}
                          >
                            {s.total ?? "—"}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700 }}>
                            {s.grade || "—"}
                          </td>
                          <td style={{ padding: "6px 12px", color: "#64748B", fontSize: 11 }}>
                            {s.remark ||
                              (s.grade === "A"
                                ? "Excellent"
                                : s.grade === "B"
                                ? "Very Good"
                                : s.grade === "C"
                                ? "Credit"
                                : s.grade === "D"
                                ? "Pass"
                                : s.grade === "F"
                                ? "Fail"
                                : "Satisfactory")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Cumulative Dossier Summary Panel */}
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
              border: "2px solid var(--color-brand-navy, #0B2545)",
              borderRadius: 6,
              marginBottom: 24,
              pageBreakInside: "avoid",
            }}
          >
            <h3
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 10px 0",
                color: "var(--color-brand-navy, #0B2545)",
              }}
            >
              Cumulative Institutional Standing &amp; Clearance Audit
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Cumulative Grade Point Average
                </span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "var(--color-brand-teal, #0E7D75)" }}>
                  {cumulativeStats.cumulativeAverage}%
                </span>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Performance Classification
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-brand-navy, #0B2545)" }}>
                  {cumulativeStats.classification}
                </span>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Institutional Attendance
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>
                  {student.attendanceStats.rate}% ({student.attendanceStats.presentDays} of {student.attendanceStats.totalDays} sessions)
                </span>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Bursary Clearance Status
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: student.feeSummary.outstandingBalance > 0 ? "#DC2626" : "#16A34A",
                  }}
                >
                  {student.feeSummary.outstandingBalance > 0
                    ? "PROVISIONAL (Unsettled Dues)"
                    : "FINANCIALLY CLEARED"}
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Sign-off Block */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
              marginTop: 40,
              paddingTop: 20,
              borderTop: "1px solid #CBD5E1",
              pageBreakInside: "avoid",
              textAlign: "center",
            }}
          >
            <div>
              <div style={{ height: 40, borderBottom: "1px solid #000000", marginBottom: 6 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>Examination Officer</div>
              <div style={{ fontSize: 10, color: "#64748B" }}>Signature &amp; Date</div>
            </div>

            <div>
              <div
                style={{
                  height: 56,
                  border: "2px dashed #94A3B8",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "#64748B",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                Official School Seal
              </div>
              <div style={{ fontSize: 10, color: "#64748B" }}>Certified True Record</div>
            </div>

            <div>
              <div style={{ height: 40, borderBottom: "1px solid #000000", marginBottom: 6 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>Principal / Head of School</div>
              <div style={{ fontSize: 10, color: "#64748B" }}>Bright Future Academy</div>
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              fontSize: 9.5,
              color: "#94A3B8",
            }}
          >
            This cumulative transcript is an official institutional credential of Bright Future Academy Kashere. Any alteration or erasure renders this document void.
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-transcript-area,
          #printable-transcript-area * {
            visibility: visible;
          }
          #printable-transcript-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 15mm 20mm !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
