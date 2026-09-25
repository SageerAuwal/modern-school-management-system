"use client";

import React, { useState, useEffect } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dutyStats?: {
    totalDuties: number;
    categories: Record<string, number>;
  };
}

interface DutyItem {
  id: string;
  category: string;
  venue: string;
  instructions: string;
  isCompleted: boolean;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

interface WeekMatrix {
  weekNumber: number;
  duties: Record<string, DutyItem>;
}

interface TermMatrixData {
  academicYear: string;
  termId: string | null;
  weeks: WeekMatrix[];
  teachers: Teacher[];
  totalAssignments: number;
}

interface LessonOption {
  id: string;
  day: string;
  periodNumber: number;
  classSection: { name: string };
  subject: { name: string; code: string };
  teacher?: { firstName: string; lastName: string };
}

interface SubstituteCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  suitabilityScore: number;
  recommendationReason: string;
  periodsToday: number;
  isSubjectMatch: boolean;
}

const DUTY_COLUMNS = [
  { key: "GATE_DUTY", label: "Gate & Punctuality", venue: "Main Gate" },
  { key: "MORNING_ASSEMBLY", label: "Assembly Leader", venue: "Quadrangle" },
  { key: "CAMPUS_CORRIDOR", label: "Corridor Patrol", venue: "Academic Blocks" },
  { key: "DINING_HALL", label: "Dining Hall", venue: "Cafeteria" },
  { key: "PREP_SUPERVISION", label: "Prep Study", venue: "Library / Halls" },
  { key: "SPORTS_GAMES", label: "Sports & PE", venue: "Sports Field" },
];

export default function DutyRosterPage() {
  const { user, isAdmin, isTeacher } = useCurrentUser();
  const [data, setData] = useState<TermMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"matrix" | "teachers" | "substitutions">("matrix");

  // Generate Modal state
  const [isGenerating, setIsGenerating] = useState(false);
  const [weeksCount, setWeeksCount] = useState(14);
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genSuccessMsg, setGenSuccessMsg] = useState<string | null>(null);

  // Substitute Modal state
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [timetableLessons, setTimetableLessons] = useState<LessonOption[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [subDate, setSubDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [subReason, setSubReason] = useState<string>("Official Leave / Duty Coverage");
  const [candidates, setCandidates] = useState<SubstituteCandidate[]>([]);
  const [searchingSubs, setSearchingSubs] = useState(false);
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState<string>("");
  const [submittingSub, setSubmittingSub] = useState(false);
  const [substitutionsList, setSubstitutionsList] = useState<any[]>([]);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/roster/term-matrix");
      if (!res.ok) throw new Error("Failed to load term duty matrix");
      const d = await res.json();
      setData(d);
    } catch (err: any) {
      setError(err.message || "Failed to load duty roster");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubstitutions = async () => {
    try {
      const res = await fetch("/api/v1/roster/substitutions");
      if (res.ok) {
        const d = await res.json();
        setSubstitutionsList(d);
      }
    } catch {
      // ignore
    }
  };

  const fetchLessons = async () => {
    try {
      const res = await fetch("/api/v1/timetable/active");
      if (res.ok) {
        const d = await res.json();
        setTimetableLessons(d.lessons || []);
        if (d.lessons?.length > 0 && !selectedLessonId) {
          setSelectedLessonId(d.lessons[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchMatrix();
    fetchSubstitutions();
    fetchLessons();
  }, []);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch("/api/v1/roster/generate-term-duties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYear: "2025/2026",
          weeksCount,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to generate term duty roster");
      }
      setGenSuccessMsg(`Term supervisory duty roster generated successfully for ${weeksCount} weeks.`);
      setGenModalOpen(false);
      fetchMatrix();
    } catch (err: any) {
      setError(err.message || "Error generating roster");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFindSubstitutes = async () => {
    if (!selectedLessonId || !subDate) return;
    try {
      setSearchingSubs(true);
      setCandidates([]);
      setSelectedSubTeacherId("");
      const res = await fetch(`/api/v1/roster/find-substitutes?lessonId=${selectedLessonId}&date=${subDate}`);
      if (!res.ok) throw new Error("Failed to scan available substitutes");
      const d = await res.json();
      setCandidates(d.availableSubstitutes || []);
      if (d.availableSubstitutes?.length > 0) {
        setSelectedSubTeacherId(d.availableSubstitutes[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Error searching substitutes");
    } finally {
      setSearchingSubs(false);
    }
  };

  const handleConfirmSubstitution = async () => {
    if (!selectedLessonId || !selectedSubTeacherId || !subDate) return;
    const lesson = timetableLessons.find((l) => l.id === selectedLessonId);
    if (!lesson) return;

    try {
      setSubmittingSub(true);
      const res = await fetch("/api/v1/roster/substitutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: selectedLessonId,
          absentTeacherId: lesson.teacher ? (lesson as any).teacherId : "",
          substituteTeacherId: selectedSubTeacherId,
          date: subDate,
          reason: subReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to confirm substitution");
      }

      setSubModalOpen(false);
      fetchSubstitutions();
      setGenSuccessMsg("Relief teacher assigned successfully.");
    } catch (err: any) {
      setError(err.message || "Error assigning substitution");
    } finally {
      setSubmittingSub(false);
    }
  };

  const toggleComplete = async (dutyId: string) => {
    try {
      const res = await fetch(`/api/v1/roster/duty/${dutyId}/toggle-complete`, {
        method: "PATCH",
      });
      if (res.ok) {
        fetchMatrix();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ padding: "24px 28px", backgroundColor: "#FFFFFF", minHeight: "100%" }}>
      {/* ── Print Header (Only visible on print) ── */}
      <div className="print-only" style={{ display: "none", marginBottom: 16, borderBottom: "2px solid #0B2545", paddingBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#0B2545", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Bright Future Academy, Kashere
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#475569" }}>
              Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State · 08029839848
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#0E7D75" }}>
              Faculty Supervisory Rota
            </span>
            <div style={{ fontSize: 9.5, color: "#64748B" }}>
              2025/2026 Session · 14-Week Term
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, fontWeight: 800, color: "#0B2545", textTransform: "uppercase", textAlign: "center", backgroundColor: "#F8FAFC", padding: "4px 0", border: "1px solid #E2E8F0" }}>
          Official Staff Room Notice Board Master Duty Schedule
        </div>
      </div>

      {/* ── Screen Page Header ── */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-brand-navy, #0B2545)", margin: 0 }}>
            Faculty Supervisory Duty Roster
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "3px 0 0" }}>
            Term 14-Week Rota · Staff-Room Notice Board Master Schedule · Relief &amp; Substitution Coverage
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{ fontWeight: 700, fontSize: 12, padding: "8px 14px" }}
          >
            Print Notice Board Rota
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setSubModalOpen(true)}
                className="btn btn-secondary"
                style={{ fontWeight: 700, fontSize: 12, padding: "8px 14px", color: "var(--color-brand-teal, #0E7D75)" }}
              >
                Relief Substitution
              </button>

              <button
                onClick={() => setGenModalOpen(true)}
                className="btn btn-primary"
                style={{ fontWeight: 700, fontSize: 12, padding: "8px 14px" }}
              >
                Auto-Generate Roster
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Notification Banners ── */}
      {genSuccessMsg && (
        <div className="pill-success no-print" style={{ marginBottom: 14, padding: "8px 16px", borderRadius: 8 }}>
          {genSuccessMsg}
        </div>
      )}

      {error && (
        <div className="pill-danger no-print" style={{ marginBottom: 14, padding: "8px 16px", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="no-print" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--color-border, #E2E8F0)", marginBottom: 18 }}>
        <button
          onClick={() => setActiveTab("matrix")}
          style={{
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 800,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "matrix" ? "var(--color-brand-navy, #0B2545)" : "var(--color-text-secondary)",
            borderBottom: activeTab === "matrix" ? "2px solid var(--color-brand-navy, #0B2545)" : "2px solid transparent",
          }}
        >
          Master 14-Week Duty Matrix
        </button>

        <button
          onClick={() => setActiveTab("teachers")}
          style={{
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 800,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "teachers" ? "var(--color-brand-navy, #0B2545)" : "var(--color-text-secondary)",
            borderBottom: activeTab === "teachers" ? "2px solid var(--color-brand-navy, #0B2545)" : "2px solid transparent",
          }}
        >
          Faculty Duty Workload ({data?.teachers?.length || 0} Staff)
        </button>

        <button
          onClick={() => setActiveTab("substitutions")}
          style={{
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 800,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "substitutions" ? "var(--color-brand-navy, #0B2545)" : "var(--color-text-secondary)",
            borderBottom: activeTab === "substitutions" ? "2px solid var(--color-brand-navy, #0B2545)" : "2px solid transparent",
          }}
        >
          Relief &amp; Substitutions ({substitutionsList.length})
        </button>
      </div>

      {/* ── TAB 1: MASTER 14-WEEK DUTY MATRIX ── */}
      {activeTab === "matrix" && (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-secondary)" }}>
              Loading master faculty duty roster...
            </div>
          ) : !data || data.weeks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                border: "1px dashed var(--color-border, #E2E8F0)",
                borderRadius: 12,
                backgroundColor: "#F8FAFC",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)", margin: 0 }}>
                No Term Duty Roster Generated Yet
              </h3>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", maxWidth: 460, margin: "6px auto 16px" }}>
                Generate the balanced 14-week supervisory rota to distribute assembly, gate, corridor, and dining hall duties across all teachers.
              </p>
              {isAdmin && (
                <button onClick={() => setGenModalOpen(true)} className="btn btn-primary" style={{ fontWeight: 700, fontSize: 13 }}>
                  Auto-Generate 14-Week Roster
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                className="print-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid var(--color-border, #CBD5E1)",
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#F1F5F9" }}>
                    <th style={{ width: 80, padding: "8px 6px", textAlign: "center", border: "1px solid #CBD5E1", fontWeight: 800 }}>
                      Term Week
                    </th>
                    {DUTY_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          border: "1px solid #CBD5E1",
                          fontWeight: 800,
                          color: "var(--color-ink)",
                        }}
                      >
                        <div>{col.label}</div>
                        <div style={{ fontSize: 9, fontWeight: 500, color: "var(--color-text-secondary)", marginTop: 1 }}>
                          {col.venue}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.weeks.map((week) => (
                    <tr
                      key={week.weekNumber}
                      style={{
                        backgroundColor: week.weekNumber % 2 === 0 ? "#F8FAFC" : "#FFFFFF",
                      }}
                    >
                      {/* Week Label */}
                      <td
                        style={{
                          textAlign: "center",
                          padding: "8px 6px",
                          border: "1px solid #CBD5E1",
                          fontWeight: 800,
                          color: "var(--color-brand-navy, #0B2545)",
                          backgroundColor: "#F1F5F9",
                        }}
                      >
                        Week {week.weekNumber}
                      </td>

                      {/* Duty Columns */}
                      {DUTY_COLUMNS.map((col) => {
                        const duty = week.duties[col.key];
                        return (
                          <td
                            key={col.key}
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #CBD5E1",
                              verticalAlign: "top",
                            }}
                          >
                            {duty ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ fontWeight: 800, color: "var(--color-ink)", fontSize: 11 }}>
                                  {duty.teacher.firstName} {duty.teacher.lastName}
                                </div>
                                <div style={{ fontSize: 8.5, color: "var(--color-text-secondary)" }}>
                                  {duty.venue}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                  <span
                                    style={{
                                      fontSize: 8,
                                      fontWeight: 700,
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                      backgroundColor: duty.isCompleted ? "#D1FAE5" : "#FEF3C7",
                                      color: duty.isCompleted ? "#065F46" : "#92400E",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {duty.isCompleted ? "Completed" : "Scheduled"}
                                  </span>
                                  {isAdmin && (
                                    <button
                                      onClick={() => toggleComplete(duty.id)}
                                      className="no-print"
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        fontSize: 8.5,
                                        color: "var(--color-brand-teal, #0E7D75)",
                                        cursor: "pointer",
                                        fontWeight: 700,
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {duty.isCompleted ? "Mark Pending" : "Mark Done"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 10 }}>—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ── Official Notice Board Signatures Block (Visible in Print) ── */}
              <div
                className="print-only"
                style={{
                  display: "none",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  paddingTop: 16,
                  marginTop: 12,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 170, borderBottom: "1px solid #182220", marginBottom: 4 }} />
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Vice Principal (Academic)</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 90, height: 32, border: "1px dashed #70817B", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, color: "#70817B", margin: "0 auto 4px" }}>
                    School Stamp
                  </div>
                  <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Official Seal</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 170, borderBottom: "1px solid #182220", marginBottom: 4, marginLeft: "auto" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Principal / Director</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: FACULTY DUTY WORKLOAD SUMMARY ── */}
      {activeTab === "teachers" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {data?.teachers?.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid var(--color-border, #E2E8F0)",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--color-ink)" }}>
                      {t.firstName} {t.lastName}
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {t.email}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "4px 8px",
                      borderRadius: 6,
                      backgroundColor: "var(--color-surface-subtle, #F1F5F9)",
                      color: "var(--color-brand-navy, #0B2545)",
                    }}
                  >
                    {t.dutyStats?.totalDuties || 0} Duties
                  </span>
                </div>

                <div style={{ marginTop: 12, borderTop: "1px solid #F1F5F9", paddingTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 6 }}>
                    Category Allocations:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {DUTY_COLUMNS.map((col) => {
                      const count = t.dutyStats?.categories?.[col.key] || 0;
                      return (
                        <div
                          key={col.key}
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            backgroundColor: count > 0 ? "#EFF6FF" : "#F8FAFC",
                            border: `1px solid ${count > 0 ? "#BFDBFE" : "#E2E8F0"}`,
                            color: count > 0 ? "#1E40AF" : "#94A3B8",
                          }}
                        >
                          {col.label}: <strong>{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: RELIEF & SUBSTITUTIONS LOG ── */}
      {activeTab === "substitutions" && (
        <div>
          {substitutionsList.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 20px",
                border: "1px dashed var(--color-border, #E2E8F0)",
                borderRadius: 10,
                backgroundColor: "#F8FAFC",
              }}
            >
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--color-ink)" }}>
                No Active Relief Substitutions Recorded
              </h4>
              <p style={{ margin: "4px 0 12px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                When a teacher is absent, use the Relief Substitution tool to match free colleagues and record coverage.
              </p>
              {isAdmin && (
                <button onClick={() => setSubModalOpen(true)} className="btn btn-secondary" style={{ fontWeight: 700, fontSize: 12 }}>
                  Assign Relief Coverage
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid var(--color-border, #E2E8F0)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Class &amp; Period</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Subject</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Absent Teacher</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Assigned Relief</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Reason / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {substitutionsList.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                        {new Date(s.date).toLocaleDateString("en-GB")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {s.lesson.classSection.name} · Period {s.lesson.periodNumber} ({s.lesson.startTime})
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--color-brand-teal, #0E7D75)" }}>
                        {s.lesson.subject.name}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>
                        {s.absentTeacher ? `${s.absentTeacher.firstName} ${s.absentTeacher.lastName}` : "Unassigned"}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 800, color: "var(--color-brand-navy, #0B2545)" }}>
                        {s.substituteTeacher.firstName} {s.substituteTeacher.lastName}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className="pill-success" style={{ fontSize: 10, fontWeight: 700 }}>
                          {s.status}
                        </span>
                        <div style={{ fontSize: 9.5, color: "var(--color-text-secondary)", marginTop: 2 }}>
                          {s.reason}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: AUTO-GENERATE TERM DUTY ROSTER ── */}
      {genModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(16, 20, 26, 0.48)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 24,
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--color-brand-navy, #0B2545)" }}>
              Auto-Generate Term Supervisory Rota
            </h3>
            <p style={{ margin: "4px 0 16px", fontSize: 12, color: "var(--color-text-secondary)" }}>
              Distributes 6 institutional duty categories across all active teachers using fair round-robin rotation.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>
                Term Duration (Weeks)
              </label>
              <input
                type="number"
                min={4}
                max={16}
                value={weeksCount}
                onChange={(e) => setWeeksCount(Number(e.target.value))}
                className="input"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setGenModalOpen(false)}
                className="btn btn-secondary"
                disabled={isGenerating}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                className="btn btn-primary"
                disabled={isGenerating}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {isGenerating ? "Generating Rota..." : "Generate Roster"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RELIEF & SUBSTITUTION FINDER ── */}
      {subModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(16, 20, 26, 0.48)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 24,
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--color-brand-navy, #0B2545)" }}>
              Relief Teacher Substitution Finder
            </h3>
            <p style={{ margin: "4px 0 16px", fontSize: 12, color: "var(--color-text-secondary)" }}>
              Scans all faculty members with free periods and recommends the most suitable substitute teacher.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>
                  Absence Date
                </label>
                <input
                  type="date"
                  value={subDate}
                  onChange={(e) => setSubDate(e.target.value)}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>
                  Select Class Lesson
                </label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="input"
                  style={{ width: "100%" }}
                >
                  {timetableLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.day} P{l.periodNumber} · {l.classSection.name} ({l.subject.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>
                Reason for Relief Coverage
              </label>
              <input
                type="text"
                value={subReason}
                onChange={(e) => setSubReason(e.target.value)}
                placeholder="e.g. Medical Leave, Official Exam Workshop"
                className="input"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ textAlign: "right", marginBottom: 16 }}>
              <button
                onClick={handleFindSubstitutes}
                disabled={searchingSubs}
                className="btn btn-secondary"
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {searchingSubs ? "Scanning Faculty..." : "Find Free Candidates"}
              </button>
            </div>

            {/* Candidates List */}
            {candidates.length > 0 && (
              <div style={{ borderTop: "1px solid var(--color-border, #E2E8F0)", paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--color-ink)", marginBottom: 8 }}>
                  Ranked Free Teachers Available:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                  {candidates.map((cand) => (
                    <label
                      key={cand.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: selectedSubTeacherId === cand.id ? "1.5px solid var(--color-brand-teal, #0E7D75)" : "1px solid #E2E8F0",
                        backgroundColor: selectedSubTeacherId === cand.id ? "#F0FDF4" : "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          type="radio"
                          name="subCandidate"
                          value={cand.id}
                          checked={selectedSubTeacherId === cand.id}
                          onChange={() => setSelectedSubTeacherId(cand.id)}
                        />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-ink)" }}>
                            {cand.firstName} {cand.lastName}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                            {cand.recommendationReason}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            backgroundColor: cand.isSubjectMatch ? "#DCFCE7" : "#F1F5F9",
                            color: cand.isSubjectMatch ? "#166534" : "#475569",
                          }}
                        >
                          {cand.periodsToday} periods today
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setSubModalOpen(false)}
                className="btn btn-secondary"
                disabled={submittingSub}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                Close
              </button>
              <button
                onClick={handleConfirmSubstitution}
                disabled={submittingSub || !selectedSubTeacherId}
                className="btn btn-primary"
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {submittingSub ? "Assigning..." : "Confirm Relief Coverage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
