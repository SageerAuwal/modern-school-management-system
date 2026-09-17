"use client";

import { useState, useEffect, useMemo } from "react";

interface ClassSection {
  id: string;
  name: string;
  level: string;
  stream?: string | null;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Lesson {
  id: string;
  day?: string;
  dayOfWeek?: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  classSectionId: string;
  subjectId: string;
  teacherId?: string | null;
  classSection: ClassSection;
  subject: Subject;
  teacher?: Teacher | null;
}

interface Term {
  id: string;
  name: string;
  academicYear: string;
  isCurrent: boolean;
}

interface TimetableData {
  id: string;
  title: string;
  academicYear: string;
  termId: string;
  isActive: boolean;
  periodsPerDay: number;
  periodDuration?: number;
  lessonDuration?: number;
  startTime: string;
  breakAfter?: number;
  breakAfterPeriod?: number;
  breakDuration: number;
  createdAt: string;
  term?: Term;
  lessons: Lesson[];
  _count?: {
    lessons: number;
  };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const DAYS_OF_WEEK = [
  { key: "MONDAY", label: "Monday", short: "Mon" },
  { key: "TUESDAY", label: "Tuesday", short: "Tue" },
  { key: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { key: "THURSDAY", label: "Thursday", short: "Thu" },
  { key: "FRIDAY", label: "Friday", short: "Fri" },
];

/* ── Subject Color Palette ─────────────────────────────────────────────────── */
function getSubjectTheme(name: string = ""): { bg: string; border: string; text: string; badgeBg: string } {
  const n = name.toLowerCase();
  if (n.includes("math") || n.includes("arithmetic") || n.includes("further")) {
    return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", badgeBg: "#DBEAFE" };
  }
  if (n.includes("eng") || n.includes("literature") || n.includes("grammar") || n.includes("reading")) {
    return { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", badgeBg: "#DCFCE7" };
  }
  if (n.includes("sci") || n.includes("phy") || n.includes("chem") || n.includes("bio")) {
    return { bg: "#FAF5FF", border: "#E9D5FF", text: "#6B21A8", badgeBg: "#F3E8FF" };
  }
  if (n.includes("civic") || n.includes("social") || n.includes("history") || n.includes("geo") || n.includes("govt")) {
    return { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", badgeBg: "#FEF3C7" };
  }
  if (n.includes("comp") || n.includes("ict") || n.includes("data") || n.includes("tech")) {
    return { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155", badgeBg: "#E2E8F0" };
  }
  if (n.includes("agric") || n.includes("farm") || n.includes("phe") || n.includes("health")) {
    return { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D", badgeBg: "#DCFCE7" };
  }
  if (n.includes("islam") || n.includes("arab") || n.includes("crs") || n.includes("relig")) {
    return { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46", badgeBg: "#D1FAE5" };
  }
  if (n.includes("french") || n.includes("hausa") || n.includes("yoruba") || n.includes("igbo") || n.includes("art")) {
    return { bg: "#FFF1F2", border: "#FECDD3", text: "#9F1239", badgeBg: "#FFE4E6" };
  }
  return { bg: "#F8FAFC", border: "#E2E8F0", text: "#1E293B", badgeBg: "#F1F5F9" };
}

export default function TimetablePage() {
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Views: 'class' | 'teacher' | 'master'
  const [activeView, setActiveView] = useState<"class" | "teacher" | "master">("class");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedMasterDay, setSelectedMasterDay] = useState<string>("MONDAY");

  // Generator Modal State
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genTitle, setGenTitle] = useState("Weekly Academic Routine");
  const [genTermId, setGenTermId] = useState("");
  const [genAcademicYear, setGenAcademicYear] = useState("2025/2026");
  const [genPeriodsPerDay, setGenPeriodsPerDay] = useState(8);
  const [genLessonDuration, setGenLessonDuration] = useState(40);
  const [genStartTime, setGenStartTime] = useState("08:00");
  const [genBreakAfter, setGenBreakAfter] = useState(4);
  const [genBreakDuration, setGenBreakDuration] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [genSuccessMsg, setGenSuccessMsg] = useState("");
  const [genError, setGenError] = useState("");

  // Lesson Edit Modal State
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editRoom, setEditRoom] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [savingLesson, setSavingLesson] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  /* ── 1. Fetch Active Timetable & Metadata ─────────────────────────────────── */
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [resTt, resCls, resStaff, resTerms] = await Promise.all([
        fetch(`${API}/api/v1/timetable/active`, { credentials: "include" }),
        fetch(`${API}/api/v1/classes`, { credentials: "include" }),
        fetch(`${API}/api/v1/staff`, { credentials: "include" }),
        fetch(`${API}/api/v1/terms`, { credentials: "include" }),
      ]);

      if (resTt.ok) {
        const data = await resTt.json();
        setTimetable(data);
      } else {
        setTimetable(null);
      }

      if (resCls.ok) {
        const data = await resCls.json();
        if (Array.isArray(data)) {
          setClasses(data);
          if (data.length > 0 && !selectedClassId) {
            setSelectedClassId(data[0].id);
          }
        }
      }

      if (resStaff.ok) {
        const data = await resStaff.json();
        if (Array.isArray(data)) {
          const teacherList = data
            .filter((s: { role?: string; isActive?: boolean }) => s.isActive !== false)
            .map((s: { id: string; firstName: string; lastName: string; email?: string }) => ({
              id: s.id,
              firstName: s.firstName,
              lastName: s.lastName,
              email: s.email,
            }));
          setTeachers(teacherList);
          if (teacherList.length > 0 && !selectedTeacherId) {
            setSelectedTeacherId(teacherList[0].id);
          }
        }
      }

      if (resTerms.ok) {
        const data = await resTerms.json();
        if (Array.isArray(data)) {
          setTerms(data);
          const current = data.find((t: Term) => t.isCurrent);
          if (current) {
            setGenTermId(current.id);
            setGenAcademicYear(current.academicYear || "2025/2026");
          } else if (data.length > 0) {
            setGenTermId(data[0].id);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to timetable server";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Computed Period Slots Grid ──────────────────────────────────────────── */
  const periodSlots = useMemo(() => {
    const periodsCount = timetable?.periodsPerDay || 8;
    const lessonMin = timetable?.periodDuration || timetable?.lessonDuration || 40;
    const startStr = timetable?.startTime || "08:00";
    const breakAfter = timetable?.breakAfter || timetable?.breakAfterPeriod || 4;
    const breakMin = timetable?.breakDuration || 30;

    const [sH, sM] = startStr.split(":").map(Number);
    let curMin = (sH || 8) * 60 + (sM || 0);

    const formatTime = (totalMinutes: number) => {
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const slots = [];
    for (let p = 1; p <= periodsCount; p++) {
      const pStart = formatTime(curMin);
      curMin += lessonMin;
      const pEnd = formatTime(curMin);

      slots.push({
        periodNumber: p,
        isBreak: false,
        startTime: pStart,
        endTime: pEnd,
        label: `Period ${p}`,
      });

      if (p === breakAfter) {
        const bStart = formatTime(curMin);
        curMin += breakMin;
        const bEnd = formatTime(curMin);
        slots.push({
          periodNumber: -1,
          isBreak: true,
          startTime: bStart,
          endTime: bEnd,
          label: "Recess / Break",
        });
      }
    }
    return slots;
  }, [timetable]);

  const getDay = (l: Lesson) => l.day || l.dayOfWeek || "";

  /* ── Filtered Lessons for Class View ─────────────────────────────────────── */
  const classLessonsMap = useMemo(() => {
    if (!timetable?.lessons || !selectedClassId) return new Map<string, Lesson>();
    const map = new Map<string, Lesson>();
    for (const l of timetable.lessons) {
      if (l.classSectionId === selectedClassId) {
        map.set(`${getDay(l)}_${l.periodNumber}`, l);
      }
    }
    return map;
  }, [timetable, selectedClassId]);

  /* ── Filtered Lessons for Teacher View ───────────────────────────────────── */
  const teacherLessonsMap = useMemo(() => {
    if (!timetable?.lessons || !selectedTeacherId) return new Map<string, Lesson>();
    const map = new Map<string, Lesson>();
    for (const l of timetable.lessons) {
      if (l.teacherId === selectedTeacherId) {
        map.set(`${getDay(l)}_${l.periodNumber}`, l);
      }
    }
    return map;
  }, [timetable, selectedTeacherId]);

  /* ── Filtered Lessons for Master Day Grid ─────────────────────────────────── */
  const masterDayLessonsMap = useMemo(() => {
    if (!timetable?.lessons) return new Map<string, Lesson>();
    const map = new Map<string, Lesson>();
    for (const l of timetable.lessons) {
      if (getDay(l) === selectedMasterDay) {
        map.set(`${l.classSectionId}_${l.periodNumber}`, l);
      }
    }
    return map;
  }, [timetable, selectedMasterDay]);

  /* ── Selected Class & Teacher Objects ────────────────────────────────────── */
  const selectedClassObj = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || classes[0],
    [classes, selectedClassId]
  );
  const selectedTeacherObj = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) || teachers[0],
    [teachers, selectedTeacherId]
  );

  /* ── Conflict Verification / Integrity Check ────────────────────────────── */
  const integrityStats = useMemo(() => {
    if (!timetable?.lessons) return { clashes: 0, totalLessons: 0, scheduledClasses: 0 };
    const teacherSlots = new Set<string>();
    let clashes = 0;
    const classSet = new Set<string>();

    for (const l of timetable.lessons) {
      classSet.add(l.classSectionId);
      if (l.teacherId) {
        const key = `${l.teacherId}_${getDay(l)}_${l.periodNumber}`;
        if (teacherSlots.has(key)) {
          clashes++;
        } else {
          teacherSlots.add(key);
        }
      }
    }
    return {
      clashes,
      totalLessons: timetable.lessons.length,
      scheduledClasses: classSet.size,
    };
  }, [timetable]);

  /* ── Handle Auto-Generate Submit ─────────────────────────────────────────── */
  const handleAutoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenError("");
    setGenSuccessMsg("");

    try {
      const res = await fetch(`${API}/api/v1/timetable/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: genTitle.trim(),
          termId: genTermId,
          academicYear: genAcademicYear.trim(),
          periodsPerDay: Number(genPeriodsPerDay),
          periodDuration: Number(genLessonDuration),
          lessonDuration: Number(genLessonDuration),
          startTime: genStartTime,
          breakAfter: Number(genBreakAfter),
          breakAfterPeriod: Number(genBreakAfter),
          breakDuration: Number(genBreakDuration),
          schoolDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenError(data.message || "Failed to generate timetable");
        return;
      }

      setGenSuccessMsg(`✅ Timetable generated: ${data.stats?.lessonsCreated || 0} conflict-free lessons scheduled across ${data.stats?.classesCount || 0} classes!`);
      setTimeout(() => {
        setIsGenModalOpen(false);
        loadData();
      }, 1200);
    } catch {
      setGenError("Network connection error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  /* ── Handle Quick Lesson Edit ────────────────────────────────────────────── */
  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setEditRoom(lesson.room || "");
    setEditTeacherId(lesson.teacherId || "");
    setEditMsg("");
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;
    setSavingLesson(true);
    setEditMsg("");

    try {
      const res = await fetch(`${API}/api/v1/timetable/lessons/${editingLesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          room: editRoom.trim() || undefined,
          teacherId: editTeacherId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEditMsg(data.message || "Failed to update lesson slot");
        return;
      }

      setEditingLesson(null);
      loadData();
    } catch {
      setEditMsg("Network error updating slot");
    } finally {
      setSavingLesson(false);
    }
  };

  return (
    <div className="page">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="page-header no-print">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="page-title">Timetable & Routine</h1>
            {timetable?.isActive && (
              <span className="pill-success" style={{ gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--color-success-text)" }} />
                Active Routine
              </span>
            )}
          </div>
          <p className="page-subtitle">
            {timetable
              ? `${timetable.title} (${timetable.academicYear}) · ${integrityStats.totalLessons} lessons generated`
              : "Generate conflict-free weekly timetables across all classes and subjects"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
            disabled={!timetable}
            title="Print printable A4 class routine"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Timetable
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setGenError("");
              setGenSuccessMsg("");
              setIsGenModalOpen(true);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Auto-Generate Timetable
          </button>
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="pill-danger no-print" style={{ display: "inline-block", marginBottom: 16, padding: "8px 14px", borderRadius: "var(--radius-control)" }}>
          {error}
        </div>
      )}

      {/* ── Stat Badges Summary Bar ────────────────────────────────────────── */}
      {timetable && (
        <div className="stats-grid no-print" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 20 }}>
          <div className="card" style={{ padding: "14px 16px" }}>
            <div className="stat-label">Classes Scheduled</div>
            <div className="stat-value">{integrityStats.scheduledClasses} / {classes.length}</div>
            <div className="stat-sub">Across all levels & arms</div>
          </div>
          <div className="card" style={{ padding: "14px 16px" }}>
            <div className="stat-label">Weekly Lessons</div>
            <div className="stat-value">{integrityStats.totalLessons}</div>
            <div className="stat-sub">{timetable.periodsPerDay} periods × 5 school days</div>
          </div>
          <div className="card" style={{ padding: "14px 16px" }}>
            <div className="stat-label">Constraint Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span className={integrityStats.clashes === 0 ? "pill-success" : "pill-danger"}>
                {integrityStats.clashes === 0 ? "0 Teacher Clashes" : `${integrityStats.clashes} Clashes`}
              </span>
            </div>
            <div className="stat-sub">Automated CSP verification</div>
          </div>
          <div className="card" style={{ padding: "14px 16px" }}>
            <div className="stat-label">Daily Schedule</div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              {timetable.startTime} · {timetable.lessonDuration}m
            </div>
            <div className="stat-sub">Recess after Period {timetable.breakAfterPeriod} ({timetable.breakDuration}m)</div>
          </div>
        </div>
      )}

      {/* ── Empty State when no Timetable exists ────────────────────────────── */}
      {!loading && !timetable && (
        <div className="card empty-state" style={{ maxWidth: 640, margin: "40px auto", padding: 48 }}>
          <div className="empty-state-icon" style={{ fontSize: 44 }}>
            📅
          </div>
          <h2 className="empty-state-title" style={{ fontSize: 18 }}>No Timetable Active</h2>
          <p className="empty-state-text" style={{ maxWidth: 440, margin: "0 auto 20px" }}>
            Generate a full, automated weekly routine for all classes. The algorithm automatically allocates subjects, prevents teacher clashes, and balances daily core subjects.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsGenModalOpen(true)}
          >
            ⚡ Auto-Generate Timetable Now
          </button>
        </div>
      )}

      {/* ── Multi-Mode View Switcher & Controls ────────────────────────────── */}
      {timetable && (
        <div className="no-print" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          {/* View Pill Tabs */}
          <div style={{ display: "inline-flex", padding: 3, backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 9999 }}>
            <button
              type="button"
              onClick={() => setActiveView("class")}
              style={{
                border: "none",
                background: activeView === "class" ? "var(--color-ink)" : "transparent",
                color: activeView === "class" ? "#FFFFFF" : "var(--color-text-secondary)",
                padding: "6px 16px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              🏫 Class Routine
            </button>
            <button
              type="button"
              onClick={() => setActiveView("teacher")}
              style={{
                border: "none",
                background: activeView === "teacher" ? "var(--color-ink)" : "transparent",
                color: activeView === "teacher" ? "#FFFFFF" : "var(--color-text-secondary)",
                padding: "6px 16px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              👨‍🏫 Teacher Roster
            </button>
            <button
              type="button"
              onClick={() => setActiveView("master")}
              style={{
                border: "none",
                background: activeView === "master" ? "var(--color-ink)" : "transparent",
                color: activeView === "master" ? "#FFFFFF" : "var(--color-text-secondary)",
                padding: "6px 16px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              📋 Master Day Matrix
            </button>
          </div>

          {/* Context Selector Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {activeView === "class" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Class:</span>
                <select
                  className="input"
                  style={{ width: "auto", minWidth: 160, padding: "6px 12px", height: 36 }}
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeView === "teacher" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Teacher:</span>
                <select
                  className="input"
                  style={{ width: "auto", minWidth: 200, padding: "6px 12px", height: 36 }}
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeView === "master" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Day:</span>
                <select
                  className="input"
                  style={{ width: "auto", minWidth: 160, padding: "6px 12px", height: 36 }}
                  value={selectedMasterDay}
                  onChange={(e) => setSelectedMasterDay(e.target.value)}
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Printable Header (shown during window.print()) ────────────────── */}
      <div
        className="print-only-header"
        style={{
          display: "none",
          textAlign: "center",
          marginBottom: 16,
          borderBottom: "2px solid #000",
          paddingBottom: 10,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          MODERN SCHOOL
        </h2>
        <p style={{ fontSize: 13, margin: "2px 0 0", color: "#333" }}>
          Official Weekly Academic Timetable · {timetable?.academicYear} Academic Session
        </p>
        <p style={{ fontSize: 12, fontWeight: 700, margin: "4px 0 0" }}>
          {activeView === "class" && `CLASS: ${selectedClassObj?.name || "All Classes"} (${selectedClassObj?.level || ""})`}
          {activeView === "teacher" && `TEACHER: ${selectedTeacherObj?.firstName} ${selectedTeacherObj?.lastName}`}
          {activeView === "master" && `MASTER SCHEDULE · ${selectedMasterDay}`}
        </p>
      </div>

      {/* ── VIEW 1: CLASS ROUTINE VIEW ─────────────────────────────────────── */}
      {timetable && activeView === "class" && (
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--color-border)" }}>
          {/* Class Subheader */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "var(--color-page)" }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>
                {selectedClassObj?.name || "Class"} Weekly Routine
              </span>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", marginLeft: 8 }}>
                {selectedClassObj?.level} {selectedClassObj?.stream ? `· ${selectedClassObj.stream}` : ""}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Click any lesson slot to adjust teacher or venue
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 900, borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-surface)" }}>
                  <th style={{ width: 110, textAlign: "center", borderRight: "1px solid var(--color-border)", padding: "10px 8px" }}>
                    Day / Time
                  </th>
                  {periodSlots.map((slot, idx) => (
                    <th
                      key={idx}
                      style={{
                        textAlign: "center",
                        padding: "8px 6px",
                        borderRight: idx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                        backgroundColor: slot.isBreak ? "var(--color-warning-bg)" : "inherit",
                        width: slot.isBreak ? 85 : 120,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: slot.isBreak ? "var(--color-warning-text)" : "var(--color-ink)" }}>
                        {slot.label}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 500, color: slot.isBreak ? "var(--color-warning-text)" : "var(--color-text-secondary)", marginTop: 2 }}>
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS_OF_WEEK.map((day) => (
                  <tr key={day.key} style={{ borderTop: "1px solid var(--color-border)" }}>
                    {/* Day Column */}
                    <td
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        textAlign: "center",
                        backgroundColor: "var(--color-surface)",
                        borderRight: "1px solid var(--color-border)",
                        borderBottom: "1px solid var(--color-border)",
                        padding: "12px 6px",
                        color: "var(--color-ink)",
                      }}
                    >
                      <div>{day.label}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                        {day.short}
                      </div>
                    </td>

                    {/* Periods */}
                    {periodSlots.map((slot, idx) => {
                      if (slot.isBreak) {
                        return (
                          <td
                            key={idx}
                            style={{
                              backgroundColor: "var(--color-warning-bg)",
                              textAlign: "center",
                              borderRight: idx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                              borderBottom: "1px solid var(--color-border)",
                              verticalAlign: "middle",
                              padding: 4,
                            }}
                          >
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-warning-text)", letterSpacing: "0.05em", transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>
                              RECESS
                            </div>
                          </td>
                        );
                      }

                      const lesson = classLessonsMap.get(`${day.key}_${slot.periodNumber}`);
                      const theme = lesson ? getSubjectTheme(lesson.subject.name) : null;

                      return (
                        <td
                          key={idx}
                          onClick={() => lesson && openEditModal(lesson)}
                          style={{
                            borderRight: idx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                            borderBottom: "1px solid var(--color-border)",
                            padding: 6,
                            verticalAlign: "top",
                            cursor: lesson ? "pointer" : "default",
                            backgroundColor: theme ? theme.bg : "transparent",
                            transition: "filter 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (lesson) e.currentTarget.style.filter = "brightness(0.96)";
                          }}
                          onMouseLeave={(e) => {
                            if (lesson) e.currentTarget.style.filter = "none";
                          }}
                        >
                          {lesson ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 3,
                                height: "100%",
                                minHeight: 62,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: theme?.text,
                                    lineHeight: 1.2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                  title={lesson.subject.name}
                                >
                                  {lesson.subject.name}
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "auto" }}>
                                <div
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    backgroundColor: theme?.badgeBg,
                                    color: theme?.text,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  {lesson.teacher ? `${lesson.teacher.firstName[0]}${lesson.teacher.lastName[0]}` : "—"}
                                </div>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--color-text-secondary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                  title={lesson.teacher ? `${lesson.teacher.firstName} ${lesson.teacher.lastName}` : "No teacher"}
                                >
                                  {lesson.teacher ? `${lesson.teacher.firstName} ${lesson.teacher.lastName}` : "Unassigned"}
                                </span>
                              </div>

                              {lesson.room && (
                                <div style={{ fontSize: 9, color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                                  📍 {lesson.room}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ textAlign: "center", padding: "16px 0", color: "var(--color-border)", fontSize: 12 }}>
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 2: TEACHER ROSTER VIEW ────────────────────────────────────── */}
      {timetable && activeView === "teacher" && (
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--color-border)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "var(--color-page)" }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>
                {selectedTeacherObj ? `${selectedTeacherObj.firstName} ${selectedTeacherObj.lastName}` : "Teacher"} Schedule
              </span>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", marginLeft: 8 }}>
                {selectedTeacherObj?.email || "Academic Staff"}
              </span>
            </div>
            <span className="pill-info">Zero Overlapping Periods</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 900, borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-surface)" }}>
                  <th style={{ width: 110, textAlign: "center", borderRight: "1px solid var(--color-border)", padding: "10px 8px" }}>
                    Day / Time
                  </th>
                  {periodSlots.map((slot, idx) => (
                    <th
                      key={idx}
                      style={{
                        textAlign: "center",
                        padding: "8px 6px",
                        borderRight: idx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                        backgroundColor: slot.isBreak ? "var(--color-warning-bg)" : "inherit",
                        width: slot.isBreak ? 85 : 120,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: slot.isBreak ? "var(--color-warning-text)" : "var(--color-ink)" }}>
                        {slot.label}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 500, color: slot.isBreak ? "var(--color-warning-text)" : "var(--color-text-secondary)", marginTop: 2 }}>
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS_OF_WEEK.map((day) => (
                  <tr key={day.key} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        textAlign: "center",
                        backgroundColor: "var(--color-surface)",
                        borderRight: "1px solid var(--color-border)",
                        borderBottom: "1px solid var(--color-border)",
                        padding: "12px 6px",
                        color: "var(--color-ink)",
                      }}
                    >
                      <div>{day.label}</div>
                    </td>

                    {periodSlots.map((slot, idx) => {
                      if (slot.isBreak) {
                        return (
                          <td
                            key={idx}
                            style={{
                              backgroundColor: "var(--color-warning-bg)",
                              textAlign: "center",
                              borderRight: idx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                              borderBottom: "1px solid var(--color-border)",
                              verticalAlign: "middle",
                              padding: 4,
                            }}
                          >
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-warning-text)", letterSpacing: "0.05em", transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>
                              RECESS
                            </div>
                          </td>
                        );
                      }

                      const lesson = teacherLessonsMap.get(`${day.key}_${slot.periodNumber}`);
                      const theme = lesson ? getSubjectTheme(lesson.subject.name) : null;

                      return (
                        <td
                          key={idx}
                          onClick={() => lesson && openEditModal(lesson)}
                          style={{
                            borderRight: idx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                            borderBottom: "1px solid var(--color-border)",
                            padding: 6,
                            verticalAlign: "top",
                            cursor: lesson ? "pointer" : "default",
                            backgroundColor: theme ? theme.bg : "var(--color-page)",
                          }}
                        >
                          {lesson ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, minHeight: 62 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: theme?.text, lineHeight: 1.2 }}>
                                {lesson.subject.name}
                              </span>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: "auto" }}>
                                <span className="pill-neutral" style={{ fontSize: 10, padding: "1px 6px" }}>
                                  {lesson.classSection.name}
                                </span>
                              </div>
                              {lesson.room && (
                                <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>
                                  📍 {lesson.room}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ textAlign: "center", padding: "18px 0", color: "var(--color-text-secondary)", opacity: 0.4, fontSize: 11 }}>
                              Free Period
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 3: MASTER DAY MATRIX ──────────────────────────────────────── */}
      {timetable && activeView === "master" && (
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--color-border)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "var(--color-page)" }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>
                Master Schedule · {DAYS_OF_WEEK.find((d) => d.key === selectedMasterDay)?.label}
              </span>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", marginLeft: 8 }}>
                All classes side-by-side
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Comprehensive school-wide period grid
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 900, borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-surface)" }}>
                  <th style={{ width: 120, textAlign: "left", borderRight: "1px solid var(--color-border)", padding: "10px 14px" }}>
                    Class Section
                  </th>
                  {periodSlots.map((slot, idx) => (
                    <th
                      key={idx}
                      style={{
                        textAlign: "center",
                        padding: "8px 6px",
                        borderRight: idx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                        backgroundColor: slot.isBreak ? "var(--color-warning-bg)" : "inherit",
                        width: slot.isBreak ? 85 : 120,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: slot.isBreak ? "var(--color-warning-text)" : "var(--color-ink)" }}>
                        {slot.label}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 500, color: slot.isBreak ? "var(--color-warning-text)" : "var(--color-text-secondary)", marginTop: 2 }}>
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        backgroundColor: "var(--color-surface)",
                        borderRight: "1px solid var(--color-border)",
                        borderBottom: "1px solid var(--color-border)",
                        padding: "10px 14px",
                        color: "var(--color-ink)",
                      }}
                    >
                      <div>{cls.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                        {cls.level}
                      </div>
                    </td>

                    {periodSlots.map((slot, idx) => {
                      if (slot.isBreak) {
                        return (
                          <td
                            key={idx}
                            style={{
                              backgroundColor: "var(--color-warning-bg)",
                              textAlign: "center",
                              borderRight: idx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                              borderBottom: "1px solid var(--color-border)",
                              verticalAlign: "middle",
                              padding: 4,
                            }}
                          >
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-warning-text)", letterSpacing: "0.05em" }}>
                              BREAK
                            </div>
                          </td>
                        );
                      }

                      const lesson = masterDayLessonsMap.get(`${cls.id}_${slot.periodNumber}`);
                      const theme = lesson ? getSubjectTheme(lesson.subject.name) : null;

                      return (
                        <td
                          key={idx}
                          onClick={() => lesson && openEditModal(lesson)}
                          style={{
                            borderRight: idx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                            borderBottom: "1px solid var(--color-border)",
                            padding: 6,
                            verticalAlign: "top",
                            cursor: lesson ? "pointer" : "default",
                            backgroundColor: theme ? theme.bg : "transparent",
                          }}
                        >
                          {lesson ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 52 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: theme?.text, lineHeight: 1.2 }}>
                                {lesson.subject.name}
                              </span>
                              <span style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: "auto" }}>
                                {lesson.teacher ? `${lesson.teacher.firstName[0]}. ${lesson.teacher.lastName}` : "—"}
                              </span>
                            </div>
                          ) : (
                            <div style={{ textAlign: "center", padding: "14px 0", color: "var(--color-border)", fontSize: 11 }}>
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Printable Signature Section (for paper A4 routine) ─────────────── */}
      <div
        className="print-only-signatures"
        style={{
          display: "none",
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid #000",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ width: 180, borderBottom: "1px solid #000", marginBottom: 4 }} />
            <div style={{ fontSize: 11, fontWeight: 700 }}>Class Teacher / Form Master</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#444" }}>School Stamp / Seal</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ width: 180, borderBottom: "1px solid #000", marginBottom: 4, marginLeft: "auto" }} />
            <div style={{ fontSize: 11, fontWeight: 700 }}>Principal / Vice-Principal Academics</div>
          </div>
        </div>
      </div>

      {/* ── MODAL: AUTO-GENERATE TIMETABLE ─────────────────────────────────── */}
      {isGenModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(16, 20, 26, 0.48)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !generating) setIsGenModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              padding: 24,
              backgroundColor: "var(--color-surface)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 4px" }}>
                  ⚡ Auto-Generate Timetable
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  Produces a conflict-free schedule across all classes and subjects.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !generating && setIsGenModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)" }}
              >
                ✕
              </button>
            </div>

            {genError && (
              <div className="pill-danger" style={{ display: "block", marginBottom: 14, padding: "8px 12px", borderRadius: "var(--radius-control)" }}>
                {genError}
              </div>
            )}

            {genSuccessMsg && (
              <div className="pill-success" style={{ display: "block", marginBottom: 14, padding: "8px 12px", borderRadius: "var(--radius-control)" }}>
                {genSuccessMsg}
              </div>
            )}

            <form onSubmit={handleAutoGenerate}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="label">Routine Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={genTitle}
                    onChange={(e) => setGenTitle(e.target.value)}
                    placeholder="e.g. First Term 2025/2026 Academic Routine"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Academic Term *</label>
                    <select
                      className="input"
                      value={genTermId}
                      onChange={(e) => setGenTermId(e.target.value)}
                      required
                    >
                      <option value="">Select Term</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.academicYear}) {t.isCurrent ? "· Current" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Academic Year *</label>
                    <input
                      type="text"
                      className="input"
                      value={genAcademicYear}
                      onChange={(e) => setGenAcademicYear(e.target.value)}
                      placeholder="2025/2026"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Start Time</label>
                    <input
                      type="time"
                      className="input"
                      value={genStartTime}
                      onChange={(e) => setGenStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Lesson Duration (Mins)</label>
                    <input
                      type="number"
                      className="input"
                      min={30}
                      max={90}
                      value={genLessonDuration}
                      onChange={(e) => setGenLessonDuration(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Periods Per Day</label>
                    <select
                      className="input"
                      value={genPeriodsPerDay}
                      onChange={(e) => setGenPeriodsPerDay(Number(e.target.value))}
                    >
                      <option value={6}>6 Periods</option>
                      <option value={7}>7 Periods</option>
                      <option value={8}>8 Periods (Standard)</option>
                      <option value={9}>9 Periods</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Break Interval</label>
                    <select
                      className="input"
                      value={genBreakAfter}
                      onChange={(e) => setGenBreakAfter(Number(e.target.value))}
                    >
                      <option value={3}>After Period 3</option>
                      <option value={4}>After Period 4 (Standard)</option>
                      <option value={5}>After Period 5</option>
                    </select>
                  </div>
                </div>

                <div style={{ padding: "10px 12px", backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>
                    Constraint Satisfaction Guarantee
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                    • Zero teacher double-booking (no teacher in two rooms at once)
                    <br />
                    • Maximum 1 lesson per subject per day for balanced learning
                    <br />
                    • Core subjects (Mathematics & English) scheduled daily in morning slots
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsGenModalOpen(false)}
                    disabled={generating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={generating || !genTermId}
                  >
                    {generating ? "Generating Routine…" : "Generate Timetable"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT / REASSIGN SINGLE LESSON ────────────────────────────── */}
      {editingLesson && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(16, 20, 26, 0.48)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingLesson) setEditingLesson(null);
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 440, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 2px" }}>
                  Adjust Lesson Slot
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
                  {editingLesson.classSection.name} · {getDay(editingLesson)} · Period {editingLesson.periodNumber} ({editingLesson.startTime} - {editingLesson.endTime})
                </p>
              </div>
              <button
                type="button"
                onClick={() => !savingLesson && setEditingLesson(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {editMsg && (
              <div className="pill-danger" style={{ display: "block", marginBottom: 12, padding: "6px 10px" }}>
                {editMsg}
              </div>
            )}

            <form onSubmit={handleSaveLesson}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label className="label">Subject</label>
                  <input
                    type="text"
                    className="input"
                    value={editingLesson.subject.name}
                    disabled
                    style={{ backgroundColor: "var(--color-page)" }}
                  />
                </div>

                <div>
                  <label className="label">Teacher Assigned</label>
                  <select
                    className="input"
                    value={editTeacherId}
                    onChange={(e) => setEditTeacherId(e.target.value)}
                  >
                    <option value="">No teacher assigned</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Classroom / Venue</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Room 102, Science Lab, ICT Center"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingLesson(null)}
                    disabled={savingLesson}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingLesson}
                  >
                    {savingLesson ? "Saving…" : "Save Changes"}
                  </button>
                </div>
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
    </div>
  );
}
