"use client";

import { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface ClassItem {
  id: string;
  name: string;
  level?: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code?: string;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
}

interface ScoreRow {
  ca1: string;
  ca2: string;
  exam: string;
}

interface TermInfo {
  id: string;
  name: string;
  academicYear: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function computeRowTotal(ca1: string, ca2: string, exam: string): number | null {
  const hasValue = ca1.trim() !== "" || ca2.trim() !== "" || exam.trim() !== "";
  if (!hasValue) return null;
  const n1 = parseFloat(ca1) || 0;
  const n2 = parseFloat(ca2) || 0;
  const n3 = parseFloat(exam) || 0;
  return n1 + n2 + n3;
}

function computeGrade(total: number | null): string | null {
  if (total === null) return null;
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";
  return "F";
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

export default function GradesPage() {
  const { isAdmin, isTeacher } = useCurrentUser();
  const canEnterScores = isAdmin || isTeacher;
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [rows, setRows] = useState<Record<string, ScoreRow>>({});
  const [termInfo, setTermInfo] = useState<TermInfo | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 1. Fetch class list on mount
  useEffect(() => {
    let ignore = false;
    setLoadingClasses(true);

    fetch(`${API}/api/v1/classes`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load classes");
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          const list: ClassItem[] = Array.isArray(data) ? data : data.classes ?? [];
          setClasses(list);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message ?? "Failed to load classes");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingClasses(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // 2. Fetch subjects when class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      setSelectedSubjectId("");
      setStudents([]);
      setRows({});
      setTermInfo(null);
      return;
    }

    let ignore = false;
    setLoadingSubjects(true);
    setError("");

    fetch(`${API}/api/v1/subjects/class/${selectedClassId}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load subjects for selected class");
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          const rawList = Array.isArray(data) ? data : data.subjects ?? [];
          const normalized: SubjectItem[] = rawList.map(
            (item: { id?: string; classSubjectId?: string; subject?: { id: string; name: string; code?: string }; name?: string; code?: string }) => {
              const sub = item.subject ?? item;
              return {
                id: sub.id ?? item.id ?? "",
                name: sub.name ?? "Unnamed Subject",
                code: sub.code,
              };
            }
          );
          setSubjects(normalized);
          setSelectedSubjectId("");
          setStudents([]);
          setRows({});
          setTermInfo(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message ?? "Failed to load subjects");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingSubjects(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedClassId]);

  // 3. Fetch score sheet when both class and subject are selected
  const fetchScoreSheet = useCallback(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setStudents([]);
      setRows({});
      setTermInfo(null);
      return;
    }

    setLoadingSheet(true);
    setError("");
    setSuccessMessage("");

    fetch(`${API}/api/v1/scores/sheet/${selectedClassId}/${selectedSubjectId}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load score sheet");
        return res.json();
      })
      .then((data) => {
        if (data.term) {
          setTermInfo({
            id: data.term.id,
            name: data.term.name,
            academicYear: data.term.academicYear,
          });
        }

        const rawScores = data.scores ?? data.sheet ?? [];
        const studentList: StudentInfo[] = [];
        const initialRows: Record<string, ScoreRow> = {};

        rawScores.forEach((item: {
          studentId?: string;
          student?: { id?: string; firstName: string; lastName: string; admissionNumber?: string | null };
          id?: string;
          firstName?: string;
          lastName?: string;
          admissionNumber?: string | null;
          score?: { ca1?: number | string | null; ca2?: number | string | null; exam?: number | string | null };
          ca1?: number | string | null;
          ca2?: number | string | null;
          exam?: number | string | null;
        }) => {
          const studentObj = item.student ?? {
            id: item.studentId ?? item.id ?? "",
            firstName: item.firstName ?? "",
            lastName: item.lastName ?? "",
            admissionNumber: item.admissionNumber ?? null,
          };
          const sid = item.studentId ?? studentObj.id ?? "";

          studentList.push({
            id: sid,
            firstName: studentObj.firstName,
            lastName: studentObj.lastName,
            admissionNumber: studentObj.admissionNumber ?? null,
          });

          const scoreSource = item.score ?? item;
          const ca1Val = scoreSource.ca1 !== null && scoreSource.ca1 !== undefined ? String(scoreSource.ca1) : "";
          const ca2Val = scoreSource.ca2 !== null && scoreSource.ca2 !== undefined ? String(scoreSource.ca2) : "";
          const examVal = scoreSource.exam !== null && scoreSource.exam !== undefined ? String(scoreSource.exam) : "";

          initialRows[sid] = {
            ca1: ca1Val,
            ca2: ca2Val,
            exam: examVal,
          };
        });

        setStudents(studentList);
        setRows(initialRows);
      })
      .catch((err) => {
        setError(err.message ?? "Failed to load score sheet");
      })
      .finally(() => {
        setLoadingSheet(false);
      });
  }, [selectedClassId, selectedSubjectId]);

  useEffect(() => {
    fetchScoreSheet();
  }, [fetchScoreSheet]);

  const handleScoreChange = (studentId: string, field: keyof ScoreRow, value: string) => {
    setRows((prev) => ({
      ...prev,
      [studentId]: {
        ca1: prev[studentId]?.ca1 ?? "",
        ca2: prev[studentId]?.ca2 ?? "",
        exam: prev[studentId]?.exam ?? "",
        [field]: value,
      },
    }));
  };

  // 5. Save scores bulk
  const handleSave = async () => {
    if (!canEnterScores) return;
    if (!selectedClassId || !selectedSubjectId) return;

    setSaving(true);
    setError("");
    setSuccessMessage("");

    const scorePayload = students.map((s) => {
      const row = rows[s.id] ?? { ca1: "", ca2: "", exam: "" };
      return {
        studentId: s.id,
        ca1: row.ca1.trim() !== "" ? parseFloat(row.ca1) : null,
        ca2: row.ca2.trim() !== "" ? parseFloat(row.ca2) : null,
        exam: row.exam.trim() !== "" ? parseFloat(row.exam) : null,
      };
    });

    const body: Record<string, unknown> = {
      classSectionId: selectedClassId,
      subjectId: selectedSubjectId,
      scores: scorePayload,
      entries: scorePayload,
    };

    if (termInfo?.id) body.termId = termInfo.id;
    if (termInfo?.academicYear) body.academicYear = termInfo.academicYear;

    try {
      const res = await fetch(`${API}/api/v1/scores/bulk`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to save scores");
      }

      setSuccessMessage("Scores saved successfully.");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save scores");
      }
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = Boolean(selectedClassId && selectedSubjectId);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Grades</h1>
          <p className="page-subtitle">Record continuous assessments and exam scores</p>
        </div>
        {isConfigured && students.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving scores…" : "Save scores"}
          </button>
        )}
      </div>

      {/* Class and Subject Selectors */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            alignItems: "flex-end",
          }}
        >
          <div>
            <label htmlFor="class-select" className="label">
              Class
            </label>
            <select
              id="class-select"
              className="input"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={loadingClasses}
            >
              <option value="">
                {loadingClasses ? "Loading classes…" : "Select a class"}
              </option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                  {cls.level ? ` (${cls.level})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subject-select" className="label">
              Subject
            </label>
            <select
              id="subject-select"
              className="input"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={!selectedClassId || loadingSubjects}
            >
              <option value="">
                {!selectedClassId
                  ? "Select a class first"
                  : loadingSubjects
                  ? "Loading subjects…"
                  : subjects.length === 0
                  ? "No subjects available"
                  : "Select a subject"}
              </option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                  {sub.code ? ` (${sub.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          className="pill-danger"
          style={{
            display: "block",
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="pill-success"
          style={{
            display: "block",
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Initial state before selections */}
      {!isConfigured ? (
        <div className="card empty-state">
          <div
            className="empty-state-icon"
            style={{ display: "inline-flex", justifyContent: "center" }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
              <path d="M6 14h6" />
            </svg>
          </div>
          <h2 className="empty-state-title">Select a class and subject to enter scores</h2>
          <p className="empty-state-text">
            Choose a class and an assigned subject to load the score sheet and record student marks.
          </p>
        </div>
      ) : loadingSheet ? (
        /* Loading Skeleton */
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>Name</th>
                <th>Adm No</th>
                <th style={{ width: 84 }}>CA1</th>
                <th style={{ width: 84 }}>CA2</th>
                <th style={{ width: 84 }}>Exam</th>
                <th style={{ width: 72 }}>Total</th>
                <th style={{ width: 72 }}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="skeleton" style={{ height: 14, width: 20 }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 16, width: "65%" }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 14, width: "50%" }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 32, width: 68 }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 32, width: 68 }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 32, width: 68 }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 16, width: 36 }} />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{
                        height: 20,
                        width: 32,
                        borderRadius: "var(--radius-pill-badge)",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : students.length === 0 ? (
        /* Empty Students State */
        <div className="card empty-state">
          <div
            className="empty-state-icon"
            style={{ display: "inline-flex", justifyContent: "center" }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className="empty-state-title">No students enrolled</h2>
          <p className="empty-state-text">
            There are no active students in this class section to grade.
          </p>
        </div>
      ) : (
        /* Score Sheet Table */
        <div>
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Name</th>
                  <th>Adm No</th>
                  <th style={{ width: 84 }}>CA1</th>
                  <th style={{ width: 84 }}>CA2</th>
                  <th style={{ width: 84 }}>Exam</th>
                  <th style={{ width: 72 }}>Total</th>
                  <th style={{ width: 72 }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const row = rows[student.id] ?? { ca1: "", ca2: "", exam: "" };
                  const total = computeRowTotal(row.ca1, row.ca2, row.exam);
                  const grade = computeGrade(total);

                  return (
                    <tr key={student.id}>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
                        {index + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                        {student.firstName} {student.lastName}
                      </td>
                      <td
                        style={{
                          color: "var(--color-text-secondary)",
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      >
                        {student.admissionNumber ?? "—"}
                      </td>
                      <td>
                        <input
                          type="number"
                          disabled={!canEnterScores}
                          min={0}
                          max={100}
                          className="input"
                          value={row.ca1}
                          onChange={(e) =>
                            handleScoreChange(student.id, "ca1", e.target.value)
                          }
                          placeholder="0"
                          style={{
                            width: 68,
                            padding: "6px 8px",
                            textAlign: "center",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          disabled={!canEnterScores}
                          min={0}
                          max={100}
                          className="input"
                          value={row.ca2}
                          onChange={(e) =>
                            handleScoreChange(student.id, "ca2", e.target.value)
                          }
                          placeholder="0"
                          style={{
                            width: 68,
                            padding: "6px 8px",
                            textAlign: "center",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          disabled={!canEnterScores}
                          min={0}
                          max={100}
                          className="input"
                          value={row.exam}
                          onChange={(e) =>
                            handleScoreChange(student.id, "exam", e.target.value)
                          }
                          placeholder="0"
                          style={{
                            width: 68,
                            padding: "6px 8px",
                            textAlign: "center",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color:
                            total !== null
                              ? "var(--color-ink)"
                              : "var(--color-text-secondary)",
                        }}
                      >
                        {total !== null ? total : "—"}
                      </td>
                      <td>
                        {grade ? (
                          <span className={getGradePillClass(grade)}>{grade}</span>
                        ) : (
                          <span style={{ color: "var(--color-text-secondary)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {students.length} {students.length === 1 ? "student" : "students"} listed
            </p>
            {canEnterScores && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving scores…" : "Save scores"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
