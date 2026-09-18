"use client";

import { useState, useEffect, useMemo } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface ClassItem {
  id: string;
  name: string;
  level: string;
}

interface StudentRosterItem {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  status: AttendanceStatus | null;
  recordId: string | null;
  note: string | null;
}

interface ClassAttendanceData {
  classSection: {
    id: string;
    name: string;
    level: string;
  };
  date: string;
  totalStudents: number;
  markedCount: number;
  roster: StudentRosterItem[];
}

interface StatusOption {
  status: AttendanceStatus;
  code: string;
  label: string;
  bgColor: string;
  textColor: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    status: "PRESENT",
    code: "P",
    label: "Present",
    bgColor: "var(--color-success-bg)",
    textColor: "var(--color-success-text)",
  },
  {
    status: "ABSENT",
    code: "A",
    label: "Absent",
    bgColor: "var(--color-danger-bg)",
    textColor: "var(--color-danger-text)",
  },
  {
    status: "LATE",
    code: "L",
    label: "Late",
    bgColor: "var(--color-warning-bg)",
    textColor: "var(--color-warning-text)",
  },
  {
    status: "EXCUSED",
    code: "E",
    label: "Excused",
    bgColor: "var(--color-info-bg)",
    textColor: "var(--color-info-text)",
  },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function AttendancePage() {
  const { isAdmin, isTeacher } = useCurrentUser();
  const canMarkAttendance = isAdmin || isTeacher;
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [rosterData, setRosterData] = useState<ClassAttendanceData | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [initialAttendance, setInitialAttendance] = useState<Record<string, AttendanceStatus>>({});

  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  // Fetch classes on mount and check URL params if present
  useEffect(() => {
    let isMounted = true;
    setLoadingClasses(true);

    fetch(`${API}/api/v1/classes`, { credentials: "include" })
      .then((res) => res.json())
      .then((data: ClassItem[]) => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setFeedback({
            type: "danger",
            text: "Failed to load class list.",
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setFeedback({
          type: "danger",
          text: "Network error loading classes.",
        });
      })
      .finally(() => {
        if (isMounted) setLoadingClasses(false);
      });

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const classIdParam = searchParams.get("classId");
      if (classIdParam) {
        setSelectedClassId(classIdParam);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch roster when class or date changes
  useEffect(() => {
    if (!selectedClassId) {
      setRosterData(null);
      setAttendance({});
      setInitialAttendance({});
      return;
    }

    let isMounted = true;
    setLoadingRoster(true);
    setFeedback(null);

    fetch(`${API}/api/v1/attendance/class/${selectedClassId}?date=${date}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: ClassAttendanceData) => {
        if (!isMounted) return;
        setRosterData(data);
        const prefill: Record<string, AttendanceStatus> = {};
        if (Array.isArray(data.roster)) {
          data.roster.forEach((student) => {
            if (student.status) {
              prefill[student.id] = student.status;
            }
          });
        }
        setAttendance(prefill);
        setInitialAttendance(prefill);
      })
      .catch(() => {
        if (!isMounted) return;
        setFeedback({
          type: "danger",
          text: "Failed to load attendance roster for this class.",
        });
      })
      .finally(() => {
        if (isMounted) setLoadingRoster(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedClassId, date]);

  // Auto-dismiss success feedback after 4 seconds
  useEffect(() => {
    if (feedback?.type === "success") {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Determine if any changes were made compared to initial fetched state
  const hasChanges = useMemo(() => {
    if (!rosterData || rosterData.roster.length === 0) return false;
    return rosterData.roster.some(
      (student) => (attendance[student.id] ?? null) !== (initialAttendance[student.id] ?? null)
    );
  }, [rosterData, attendance, initialAttendance]);

  const handleToggle = (studentId: string, status: AttendanceStatus) => {
    if (!canMarkAttendance) return;
    setAttendance((prev) => {
      if (prev[studentId] === status) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return { ...prev, [studentId]: status };
    });
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!canMarkAttendance) return;
    if (!rosterData || rosterData.roster.length === 0) return;
    const allMarked: Record<string, AttendanceStatus> = {};
    rosterData.roster.forEach((student) => {
      allMarked[student.id] = status;
    });
    setAttendance(allMarked);
  };

  const handleSave = async () => {
    if (!canMarkAttendance) return;
    if (!selectedClassId || !rosterData || !hasChanges) return;

    setSaving(true);
    setFeedback(null);

    try {
      const recordsPayload = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const res = await fetch(`${API}/api/v1/attendance/bulk`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classSectionId: selectedClassId,
          date,
          records: recordsPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: "danger",
          text: data.message ?? "Failed to save attendance.",
        });
        return;
      }

      setInitialAttendance({ ...attendance });
      setFeedback({
        type: "success",
        text: "Attendance saved successfully.",
      });
    } catch {
      setFeedback({
        type: "danger",
        text: "Network error saving attendance.",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalStudents = rosterData?.roster.length ?? 0;
  const markedStudentsCount = Object.keys(attendance).length;
  const presentCount = Object.values(attendance).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(attendance).filter((s) => s === "ABSENT").length;
  const lateCount = Object.values(attendance).filter((s) => s === "LATE").length;
  const excusedCount = Object.values(attendance).filter((s) => s === "EXCUSED").length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mark attendance</h1>
          <p className="page-subtitle">Record daily attendance across student rosters</p>
        </div>
      </div>

      {feedback && (
        <div
          className={feedback.type === "success" ? "pill-success" : "pill-danger"}
          style={{
            display: "block",
            marginBottom: "16px",
            padding: "10px 14px",
            borderRadius: "var(--radius-control)",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* Class selector and Date inputs */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label className="label" htmlFor="class-selector">
              Class
            </label>
            <select
              id="class-selector"
              className="input"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={loadingClasses}
            >
              <option value="">
                {loadingClasses ? "Loading classes…" : "Select a class"}
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="date-input">
              Date
            </label>
            <input
              id="date-input"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* When no class selected */}
      {!selectedClassId && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: "0 auto", display: "block" }}
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
            <div className="empty-state-title">Select a class to mark attendance</div>
            <div className="empty-state-text">
              Choose a class and date above to view the student roster and record attendance.
            </div>
          </div>
        </div>
      )}

      {/* When class selected and loading */}
      {selectedClassId && loadingRoster && (
        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px 0" }}>
            <div className="skeleton" style={{ height: "32px", width: "220px" }} />
            <div className="skeleton" style={{ height: "48px" }} />
            <div className="skeleton" style={{ height: "48px" }} />
            <div className="skeleton" style={{ height: "48px" }} />
            <div className="skeleton" style={{ height: "48px" }} />
          </div>
        </div>
      )}

      {/* When class selected, loaded, but no students */}
      {selectedClassId && !loadingRoster && rosterData && rosterData.roster.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">No students enrolled in this class</div>
            <div className="empty-state-text">
              Enroll students in this class section to start tracking daily attendance.
            </div>
          </div>
        </div>
      )}

      {/* When class selected, loaded, and has students */}
      {selectedClassId && !loadingRoster && rosterData && rosterData.roster.length > 0 && (
        <>
          {/* Quick stats grid */}
          <div className="stats-grid">
            <div className="card">
              <div className="stat-label">Enrolled</div>
              <div className="stat-value">{totalStudents}</div>
              <div className="stat-sub">{rosterData.classSection.name}</div>
            </div>
            <div className="card">
              <div className="stat-label">Marked</div>
              <div className="stat-value">{markedStudentsCount}</div>
              <div className="stat-sub">{totalStudents - markedStudentsCount} unmarked</div>
            </div>
            <div className="card">
              <div className="stat-label">Present</div>
              <div className="stat-value">{presentCount}</div>
              <div className="stat-sub">
                {totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0}% rate
              </div>
            </div>
            <div className="card">
              <div className="stat-label">Absent</div>
              <div className="stat-value">{absentCount}</div>
              <div className="stat-sub">{lateCount} late, {excusedCount} excused</div>
            </div>
          </div>

          {/* Roster card */}
          <div className="card">
            {/* Quick-mark bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>
                  Class roster
                </h2>
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "2px 0 0 0" }}>
                  Click status buttons to toggle student attendance
                </p>
              </div>

              {canMarkAttendance && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Mark all:
                  </span>
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.status}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleMarkAll(opt.status)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        backgroundColor: opt.bgColor,
                        color: opt.textColor,
                        borderColor: "transparent",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "44px" }}>#</th>
                    <th>Name</th>
                    <th>Adm No</th>
                    <th style={{ textAlign: "right", minWidth: "180px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterData.roster.map((student, index) => {
                    const currentStatus = attendance[student.id];
                    return (
                      <tr key={student.id}>
                        <td
                          style={{
                            color: "var(--color-text-secondary)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {index + 1}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                          {student.firstName} {student.lastName}
                        </td>
                        <td
                          style={{
                            color: "var(--color-text-secondary)",
                            fontFamily: "monospace",
                            fontSize: "12px",
                          }}
                        >
                          {student.admissionNumber ?? "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              gap: "6px",
                              alignItems: "center",
                            }}
                          >
                            {STATUS_OPTIONS.map((opt) => {
                              const isSelected = currentStatus === opt.status;
                              return (
                                <button
                                  key={opt.status}
                                  type="button"
                                  disabled={!canMarkAttendance}
                                  onClick={() => handleToggle(student.id, opt.status)}
                                  aria-pressed={isSelected}
                                  aria-label={`Mark ${student.firstName} ${student.lastName} as ${opt.label}`}
                                  style={{
                                    minWidth: "34px",
                                    height: "32px",
                                    padding: "0 8px",
                                    borderRadius: "var(--radius-control)",
                                    border: isSelected
                                      ? `1px solid ${opt.textColor}`
                                      : "1px solid var(--color-border)",
                                    backgroundColor: isSelected
                                      ? opt.bgColor
                                      : "var(--color-surface)",
                                    color: isSelected
                                      ? opt.textColor
                                      : "var(--color-text-secondary)",
                                    fontFamily: '"Manrope", sans-serif',
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    cursor: canMarkAttendance ? "pointer" : "default",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
                                    opacity: !canMarkAttendance && !isSelected ? 0.45 : 1,
                                  }}
                                >
                                  {opt.code}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom save bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "20px",
                flexWrap: "wrap",
                gap: "12px",
                borderTop: "var(--border-width) solid var(--color-border)",
                paddingTop: "16px",
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                {markedStudentsCount} of {totalStudents} marked
              </div>
              {canMarkAttendance && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                >
                  {saving ? "Saving attendance…" : "Save attendance"}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
