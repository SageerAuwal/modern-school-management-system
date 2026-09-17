"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

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
  { key: "MONDAY", label: "Monday", short: "Mon", dateNum: 16 },
  { key: "TUESDAY", label: "Tuesday", short: "Tue", dateNum: 17 },
  { key: "WEDNESDAY", label: "Wednesday", short: "Wed", dateNum: 18 },
  { key: "THURSDAY", label: "Thursday", short: "Thu", dateNum: 19 },
  { key: "FRIDAY", label: "Friday", short: "Fri", dateNum: 20 },
];

/* ── Clean Pastel Palette (Zero Emojis) ───────────────────────────────────── */
function getSubjectTheme(name: string = ""): { bg: string; border: string; text: string; badgeBg: string } {
  const n = name.toLowerCase();
  // Mathematics & Quantitative Core
  if (n.includes("math") || n.includes("further") || n.includes("arithmetic") || n.includes("calc")) {
    return { bg: "#FDE2F2", border: "#F9CEEA", text: "#96286B", badgeBg: "#F6BCD6" };
  }
  // Languages & Literature
  if (n.includes("eng") || n.includes("lit") || n.includes("gram") || n.includes("read") || n.includes("french") || n.includes("hausa")) {
    return { bg: "#E3DCFA", border: "#D5CAFA", text: "#4C3A96", badgeBg: "#C8B9F5" };
  }
  // Sciences & ICT
  if (n.includes("sci") || n.includes("phy") || n.includes("chem") || n.includes("bio") || n.includes("comp") || n.includes("ict")) {
    return { bg: "#D1F0FA", border: "#B9E8F7", text: "#13637B", badgeBg: "#A8E1F3" };
  }
  // Humanities & Commercial
  if (n.includes("civic") || n.includes("soc") || n.includes("hist") || n.includes("geo") || n.includes("econ") || n.includes("govt") || n.includes("comm")) {
    return { bg: "#FDE6D2", border: "#F8D4B7", text: "#8F5419", badgeBg: "#F4C29B" };
  }
  // Vocational & Health
  if (n.includes("agric") || n.includes("farm") || n.includes("phe") || n.includes("health") || n.includes("art") || n.includes("music")) {
    return { bg: "#DDF5E9", border: "#C3EED7", text: "#166E4E", badgeBg: "#A9E4C5" };
  }
  return { bg: "#EAE6FD", border: "#DDD6FA", text: "#4338CA", badgeBg: "#D1C8FA" };
}

/* ── Compact Subject Name for Master Single-A4 Grid ──────────────────────── */
function getSubjectShortName(name: string = ""): string {
  const n = name.trim();
  if (n.length <= 11) return n;
  const lower = n.toLowerCase();
  if (lower.includes("math")) return "Math";
  if (lower.includes("english")) return "English";
  if (lower.includes("biology")) return "Biology";
  if (lower.includes("chemistry")) return "Chemistry";
  if (lower.includes("physics")) return "Physics";
  if (lower.includes("geography")) return "Geography";
  if (lower.includes("economics")) return "Economics";
  if (lower.includes("commerce")) return "Commerce";
  if (lower.includes("account")) return "Accounts";
  if (lower.includes("government")) return "Govt";
  if (lower.includes("literature")) return "Literature";
  if (lower.includes("basic sci")) return "Basic Sci";
  if (lower.includes("civic")) return "Civic Edu";
  if (lower.includes("computer") || lower.includes("ict")) return "ICT/Comp";
  if (lower.includes("agric")) return "Agric Sci";
  if (lower.includes("phe") || lower.includes("physical")) return "PHE";
  return n.slice(0, 10) + ".";
}

export default function TimetablePage() {
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Views: 'class' (Weekly Routine) | 'teacher' (Teacher Roster) | 'master' (Master Day Matrix)
  const [activeView, setActiveView] = useState<"class" | "teacher" | "master">("class");
  const [selectedClassId, setSelectedClassId] = useState<string>("all"); // Default to "all" so generated timetable shows weekly for all classes
  const [printMode, setPrintMode] = useState<"single-master" | "booklet">("single-master"); // "single-master": fits all classes on 1 A4 page; "booklet": 1 page per class
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedMasterDay, setSelectedMasterDay] = useState<string>("WEDNESDAY");

  // Left Calendar State
  const [calMonth, setCalMonth] = useState(new Date(2025, 5, 1));
  const [selectedDayNum, setSelectedDayNum] = useState(18);

  // Filters Checklist State
  const [filters, setFilters] = useState({
    junior: true,
    senior: true,
    coreSubjects: true,
    practicals: false,
  });

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
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
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
          label: "Recess Break",
        });
      }
    }
    return slots;
  }, [timetable]);

  const getDay = (l: Lesson) => l.day || l.dayOfWeek || "";

  /* ── Classes to Display (Supports "all" or specific class) ─────────────────── */
  const classesToDisplay = useMemo(() => {
    if (selectedClassId === "all" || !selectedClassId) {
      return classes;
    }
    const single = classes.find((c) => c.id === selectedClassId);
    return single ? [single] : classes;
  }, [classes, selectedClassId]);

  /* ── Helper to build Lesson Map for any specific Class ───────────────────── */
  const getLessonsMapForClass = (classId: string) => {
    const map = new Map<string, Lesson>();
    if (!timetable?.lessons) return map;
    for (const l of timetable.lessons) {
      if (l.classSectionId === classId) {
        map.set(`${getDay(l)}_${l.periodNumber}`, l);
      }
    }
    return map;
  };

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

  const selectedTeacherObj = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) || teachers[0],
    [teachers, selectedTeacherId]
  );

  /* ── Upcoming Highlight Lesson (for the Deep Teal Card) ─────────────────── */
  const upcomingLesson = useMemo(() => {
    if (!timetable?.lessons || timetable.lessons.length === 0) return null;
    const wednesdayLessons = timetable.lessons.filter(
      (l) => getDay(l) === "WEDNESDAY" && (selectedClassId === "all" || l.classSectionId === selectedClassId)
    );
    return wednesdayLessons[0] || timetable.lessons[0];
  }, [timetable, selectedClassId]);

  /* ── Auto-Generate Timetable ─────────────────────────────────────────────── */
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

      setGenSuccessMsg(`Timetable generated: ${data.stats?.lessonsCreated || 0} conflict-free lessons scheduled across all ${data.stats?.classesCount || 0} classes!`);
      // Immediately set selectedClassId to "all" so user sees weekly routine for all classes!
      setSelectedClassId("all");
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

  /* ── Lesson Quick Edit ───────────────────────────────────────────────────── */
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

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 30; i++) {
      days.push(i);
    }
    return days;
  }, []);

  return (
    <div className="timetable-page-container" style={{ padding: "24px 28px", backgroundColor: "#FFFFFF", minHeight: "100%" }}>
      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="pill-danger no-print" style={{ marginBottom: 16, padding: "8px 16px", borderRadius: 9999 }}>
          {error}
        </div>
      )}

      {/* ── Two-Column Main Layout (Ignored in Print) ───────────────────────── */}
      <div
        className="timetable-grid-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 28,
          alignItems: "start",
        }}
      >
        {/* ════ LEFT COLUMN: Mini Calendar, Teal Card, Filters (NO PRINT) ═════ */}
        <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card 1: Mini Month Calendar Card */}
          <div
            className="card"
            style={{
              padding: "20px",
              borderRadius: "var(--radius-card, 20px)",
              border: "1px solid var(--color-border, #E8ECE9)",
              backgroundColor: "#FFFFFF",
            }}
          >
            {/* Header: Month and Chevron controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink, #182220)" }}>
                June 2025
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setSelectedDayNum((prev) => Math.max(1, prev - 1))}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--color-text-secondary, #70817B)",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 4,
                  }}
                >
                  &lt;
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDayNum((prev) => Math.min(30, prev + 1))}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--color-text-secondary, #70817B)",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 4,
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>

            {/* Day of Week Letters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-secondary, #70817B)",
                marginBottom: 10,
              }}
            >
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Days Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "4px",
                textAlign: "center",
              }}
            >
              {calendarDays.map((d) => {
                const isSelected = d === selectedDayNum;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDayNum(d)}
                    style={{
                      width: 32,
                      height: 32,
                      margin: "0 auto",
                      border: "none",
                      borderRadius: "50%",
                      backgroundColor: isSelected ? "var(--color-brand-teal, #0E7D75)" : "transparent",
                      color: isSelected ? "#FFFFFF" : "var(--color-ink, #182220)",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "var(--color-surface-subtle, #F4F7F5)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: High-Contrast Deep Teal Reminder Card */}
          <div
            style={{
              backgroundColor: "var(--color-brand-teal, #0E7D75)",
              color: "#FFFFFF",
              borderRadius: 24,
              padding: "20px 22px",
              boxShadow: "0 12px 32px rgba(14, 125, 117, 0.22)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255, 255, 255, 0.75)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Routine Reminder
              </span>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#FFFFFF",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {upcomingLesson ? `${upcomingLesson.subject.name} - ${upcomingLesson.classSection.name}` : "Academic Assembly"}
              </h3>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255, 255, 255, 0.85)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{upcomingLesson ? `${upcomingLesson.startTime} - ${upcomingLesson.endTime}` : "08:00 AM - 08:40 AM"}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <div className="avatar-stack">
                <div
                  className="avatar"
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: 10,
                    backgroundColor: "#F7C844",
                    color: "#182220",
                  }}
                >
                  {upcomingLesson?.teacher ? `${upcomingLesson.teacher.firstName[0]}${upcomingLesson.teacher.lastName[0]}` : "T"}
                </div>
                <div
                  className="avatar"
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: 10,
                    backgroundColor: "#FFFFFF",
                    color: "#0E7D75",
                  }}
                >
                  S
                </div>
                <div
                  className="avatar"
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: 9,
                    backgroundColor: "rgba(255, 255, 255, 0.25)",
                    color: "#FFFFFF",
                  }}
                >
                  +5
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {upcomingLesson && (
                  <button
                    type="button"
                    onClick={() => openEditModal(upcomingLesson)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 9999,
                      backgroundColor: "var(--color-accent-gold, #F7C844)",
                      color: "#182220",
                      border: "none",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Adjust
                  </button>
                )}

                <button
                  type="button"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 9999,
                    backgroundColor: "#0A5A54",
                    color: "#FFFFFF",
                    border: "none",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Confirmed
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Filters Card */}
          <div
            className="card"
            style={{
              padding: "18px 20px",
              borderRadius: "var(--radius-card, 20px)",
              border: "1px solid var(--color-border, #E8ECE9)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-ink, #182220)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Operations Filter
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", color: "var(--color-ink)" }}>
                <input
                  type="checkbox"
                  checked={filters.junior}
                  onChange={(e) => setFilters({ ...filters, junior: e.target.checked })}
                  style={{ accentColor: "var(--color-brand-teal, #0E7D75)", width: 16, height: 16 }}
                />
                Junior Secondary (JS1 - JS3)
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", color: "var(--color-ink)" }}>
                <input
                  type="checkbox"
                  checked={filters.senior}
                  onChange={(e) => setFilters({ ...filters, senior: e.target.checked })}
                  style={{ accentColor: "var(--color-brand-teal, #0E7D75)", width: 16, height: 16 }}
                />
                Senior Secondary (SS1 - SS3)
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", color: "var(--color-ink)" }}>
                <input
                  type="checkbox"
                  checked={filters.coreSubjects}
                  onChange={(e) => setFilters({ ...filters, coreSubjects: e.target.checked })}
                  style={{ accentColor: "var(--color-brand-teal, #0E7D75)", width: 16, height: 16 }}
                />
                Core Subjects (Maths & English)
              </label>
            </div>
          </div>

          {/* Card 4: Quick Link to Exam Timetable */}
          <Link
            href="/exams"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderRadius: "var(--radius-card, 20px)",
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--color-border, #E8ECE9)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink, #182220)" }}>
              Exam & Term Timetable
            </span>
            <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
              View
            </span>
          </Link>
        </div>

        {/* ════ RIGHT MAIN AREA: Controls + Weekly Schedule for All Classes ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0, width: "100%" }}>
          {/* Top Schedule Controls Bar (NO PRINT) */}
          <div
            className="no-print"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            {/* Left: Date Navigation */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedDayNum((prev) => Math.max(1, prev - 1))}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 16,
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                &lt;
              </button>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-ink, #182220)", margin: 0 }}>
                June, {selectedDayNum} 2025
              </h2>
              <button
                type="button"
                onClick={() => setSelectedDayNum((prev) => Math.min(30, prev + 1))}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 16,
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                &gt;
              </button>
            </div>

            {/* Center: Segmented View Switcher */}
            <div
              style={{
                display: "inline-flex",
                backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                padding: 4,
                borderRadius: 9999,
                border: "1px solid var(--color-border, #E8ECE9)",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveView("class")}
                style={{
                  border: "none",
                  background: activeView === "class" ? "#FFFFFF" : "transparent",
                  color: activeView === "class" ? "var(--color-ink, #182220)" : "var(--color-text-secondary, #70817B)",
                  padding: "6px 18px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: activeView === "class" ? 700 : 500,
                  boxShadow: activeView === "class" ? "0 2px 8px rgba(0, 0, 0, 0.06)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Weekly Routine
              </button>

              <button
                type="button"
                onClick={() => setActiveView("teacher")}
                style={{
                  border: "none",
                  background: activeView === "teacher" ? "#FFFFFF" : "transparent",
                  color: activeView === "teacher" ? "var(--color-ink, #182220)" : "var(--color-text-secondary, #70817B)",
                  padding: "6px 18px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: activeView === "teacher" ? 700 : 500,
                  boxShadow: activeView === "teacher" ? "0 2px 8px rgba(0, 0, 0, 0.06)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Teacher Roster
              </button>

              <button
                type="button"
                onClick={() => setActiveView("master")}
                style={{
                  border: "none",
                  background: activeView === "master" ? "#FFFFFF" : "transparent",
                  color: activeView === "master" ? "var(--color-ink, #182220)" : "var(--color-text-secondary, #70817B)",
                  padding: "6px 18px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: activeView === "master" ? 700 : 500,
                  boxShadow: activeView === "master" ? "0 2px 8px rgba(0, 0, 0, 0.06)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Master Day Matrix
              </button>
            </div>

            {/* Right: Class / Teacher / Day Selector & Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {activeView === "class" && (
                <select
                  className="input"
                  style={{ width: "auto", minWidth: 180, height: 38, padding: "6px 14px", borderRadius: 9999 }}
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="all">All Classes ({classes.length} Sections)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level})
                    </option>
                  ))}
                </select>
              )}

              {activeView === "teacher" && (
                <select
                  className="input"
                  style={{ width: "auto", minWidth: 160, height: 38, padding: "6px 14px", borderRadius: 9999 }}
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              )}

              {activeView === "master" && (
                <select
                  className="input"
                  style={{ width: "auto", minWidth: 130, height: 38, padding: "6px 14px", borderRadius: 9999 }}
                  value={selectedMasterDay}
                  onChange={(e) => setSelectedMasterDay(e.target.value)}
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Mode Switcher for All Classes */}
              {activeView === "class" && selectedClassId === "all" && (
                <div
                  className="no-print"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                    border: "1px solid var(--color-border, #E8ECE9)",
                    borderRadius: 9999,
                    padding: 3,
                    gap: 3,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPrintMode("single-master")}
                    style={{
                      border: "none",
                      backgroundColor: printMode === "single-master" ? "var(--color-brand-teal, #0E7D75)" : "transparent",
                      color: printMode === "single-master" ? "#FFFFFF" : "var(--color-text-secondary, #70817B)",
                      fontWeight: 700,
                      fontSize: 12,
                      padding: "5px 12px",
                      borderRadius: 9999,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Single A4 Master
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode("booklet")}
                    style={{
                      border: "none",
                      backgroundColor: printMode === "booklet" ? "var(--color-brand-teal, #0E7D75)" : "transparent",
                      color: printMode === "booklet" ? "#FFFFFF" : "var(--color-text-secondary, #70817B)",
                      fontWeight: 700,
                      fontSize: 12,
                      padding: "5px 12px",
                      borderRadius: 9999,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Class Booklet
                  </button>
                </div>
              )}

              {/* Auto-Generate Button */}
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  backgroundColor: "var(--color-accent-gold, #F7C844)",
                  color: "#182220",
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(247, 200, 68, 0.35)",
                  padding: "9px 20px",
                }}
                onClick={() => {
                  setGenError("");
                  setGenSuccessMsg("");
                  setIsGenModalOpen(true);
                }}
              >
                Auto-Generate Routine
              </button>

              {/* Print Button (Scales to A4 Paper) */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "9px 18px", fontWeight: 700 }}
                onClick={() => window.print()}
                title="Print clean official A4 timetable"
              >
                {selectedClassId === "all"
                  ? printMode === "single-master"
                    ? "Print Master Sheet (1 A4 Page)"
                    : `Print All Classes Booklet (${classes.length} Pages)`
                  : `Print ${classes.find((c) => c.id === selectedClassId)?.name || "Class"} (1 Page)`}
              </button>
            </div>
          </div>

          {/* Empty State */}
          {!loading && !timetable && (
            <div className="card empty-state" style={{ padding: 48, borderRadius: 24, textAlign: "center" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>No Timetable Active</h2>
              <p style={{ color: "var(--color-text-secondary)", maxWidth: 460, margin: "0 auto 20px" }}>
                Generate an automated conflict-free academic routine across all classes and subjects with one click.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsGenModalOpen(true)}
              >
                Auto-Generate Timetable Now
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              WEEKLY ROUTINE FOR ALL CLASSES (SCREEN & A4 PRINT READY)
          ══════════════════════════════════════════════════════════════════════ */}
          {timetable && activeView === "class" && (
            <>
              {/* ── OPTION A: SINGLE A4 MASTER SHEET (ALL CLASSES ON 1 A4 PAGE) ── */}
              {selectedClassId === "all" && printMode === "single-master" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Screen Info Banner */}
                  <div
                    className="no-print"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                      borderRadius: 16,
                      border: "1px solid var(--color-border, #E8ECE9)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-brand-teal, #0E7D75)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Single A4 Master Routine View
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        All {classes.length} classes and assigned subjects across Monday–Friday are formatted to fit standard A4 landscape paper on a single page.
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setPrintMode("booklet")}
                        style={{ fontSize: 12, padding: "6px 14px", fontWeight: 700, backgroundColor: "#FFFFFF" }}
                      >
                        Switch to Full Class Booklet View
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => window.print()}
                        style={{ fontSize: 12, padding: "6px 16px", fontWeight: 700, backgroundColor: "var(--color-brand-teal, #0E7D75)" }}
                      >
                        Print Master Sheet (1 A4)
                      </button>
                    </div>
                  </div>

                  {/* ── Official Single A4 Master Sheet ── */}
                  <div
                    className="print-single-master-sheet card"
                    style={{
                      padding: "16px 20px",
                      borderRadius: 20,
                      backgroundColor: "#FFFFFF",
                      overflowX: "auto",
                    }}
                  >
                    {/* School Letterhead */}
                    <div className="master-print-header">
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-ink)" }}>
                          Modern School Management System
                        </div>
                        <div style={{ fontSize: 9.5, color: "var(--color-text-secondary)", fontWeight: 700 }}>
                          Official Master Weekly Academic Routine · {timetable.academicYear} Academic Session · All Classes
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--color-brand-teal, #0E7D75)", textTransform: "uppercase" }}>
                          Institutional Master Schedule
                        </div>
                        <div style={{ fontSize: 8.5, color: "var(--color-text-secondary)" }}>
                          5 Days · {classes.length} Class Sections · Constraint Satisfaction Verified
                        </div>
                      </div>
                    </div>

                    {/* Master Grid Table */}
                    <table
                      className="master-print-table"
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginTop: 6,
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "var(--color-surface-subtle, #F4F7F5)" }}>
                          <th style={{ width: 44, padding: "4px 2px", textAlign: "center", border: "1px solid #182220", fontSize: 9, fontWeight: 800 }}>
                            Day
                          </th>
                          <th style={{ width: 75, padding: "4px 4px", textAlign: "left", border: "1px solid #182220", fontSize: 9, fontWeight: 800 }}>
                            Class
                          </th>
                          {periodSlots.map((slot, sIdx) => (
                            <th
                              key={sIdx}
                              style={{
                                padding: "4px 2px",
                                textAlign: "center",
                                border: "1px solid #182220",
                                backgroundColor: slot.isBreak ? "var(--color-warning-bg, #FEF3C7)" : "inherit",
                                width: slot.isBreak ? 46 : undefined,
                              }}
                            >
                              <div style={{ fontSize: 8.5, fontWeight: 800, color: slot.isBreak ? "var(--color-warning-text, #92400E)" : "var(--color-ink)" }}>
                                {slot.isBreak ? "Break" : `P${slot.periodNumber}`}
                              </div>
                              <div style={{ fontSize: 7, fontWeight: 600, color: slot.isBreak ? "var(--color-warning-text)" : "var(--color-text-secondary)", marginTop: 1 }}>
                                {slot.startTime.replace(":00", "")} - {slot.endTime.replace(":00", "")}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS_OF_WEEK.map((day) => {
                          return classes.map((cls, cIdx) => {
                            const classLessonsMap = getLessonsMapForClass(cls.id);
                            const isFirstClass = cIdx === 0;
                            const isLastClass = cIdx === classes.length - 1;

                            return (
                              <tr
                                key={`${day.key}_${cls.id}`}
                                style={{
                                  borderTop: isFirstClass ? "2px solid #182220" : "1px solid var(--color-border, #E8ECE9)",
                                  borderBottom: isLastClass ? "2px solid #182220" : undefined,
                                }}
                              >
                                {/* Day Header Column with rowSpan */}
                                {isFirstClass && (
                                  <td
                                    rowSpan={classes.length}
                                    style={{
                                      textAlign: "center",
                                      verticalAlign: "middle",
                                      backgroundColor: "#182220",
                                      color: "#FFFFFF",
                                      fontWeight: 900,
                                      fontSize: 10,
                                      letterSpacing: "0.08em",
                                      border: "1px solid #182220",
                                      padding: "2px 0",
                                    }}
                                  >
                                    <div style={{ textTransform: "uppercase" }}>{day.short}</div>
                                  </td>
                                )}

                                {/* Class Name */}
                                <td
                                  style={{
                                    padding: "2px 4px",
                                    fontSize: 8.5,
                                    fontWeight: 800,
                                    backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                                    border: "1px solid #182220",
                                    whiteSpace: "nowrap",
                                    color: "var(--color-ink)",
                                  }}
                                >
                                  {cls.name}
                                </td>

                                {/* Periods */}
                                {periodSlots.map((slot, pIdx) => {
                                  if (slot.isBreak) {
                                    if (!isFirstClass) return null; // Handled by rowSpan
                                    return (
                                      <td
                                        key={pIdx}
                                        rowSpan={classes.length}
                                        style={{
                                          backgroundColor: "var(--color-warning-bg, #FEF3C7)",
                                          color: "var(--color-warning-text, #92400E)",
                                          textAlign: "center",
                                          verticalAlign: "middle",
                                          fontWeight: 900,
                                          fontSize: 8,
                                          letterSpacing: "0.1em",
                                          border: "1px solid #182220",
                                          padding: 0,
                                        }}
                                      >
                                        RECESS
                                      </td>
                                    );
                                  }

                                  const lesson = classLessonsMap.get(`${day.key}_${slot.periodNumber}`);
                                  const theme = lesson ? getSubjectTheme(lesson.subject.name) : null;

                                  return (
                                    <td
                                      key={pIdx}
                                      onClick={() => lesson && openEditModal(lesson)}
                                      style={{
                                        padding: "2px 3px",
                                        verticalAlign: "middle",
                                        textAlign: "center",
                                        backgroundColor: theme ? theme.bg : "#FFFFFF",
                                        border: "1px solid #182220",
                                        cursor: lesson ? "pointer" : "default",
                                        height: 18,
                                      }}
                                      title={lesson ? `${lesson.subject.name} · ${lesson.teacher ? `${lesson.teacher.firstName} ${lesson.teacher.lastName}` : "Unassigned"}` : undefined}
                                    >
                                      {lesson ? (
                                        <div style={{ lineHeight: 1.15 }}>
                                          <div style={{ fontSize: 8, fontWeight: 800, color: theme?.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {getSubjectShortName(lesson.subject.name)}
                                          </div>
                                          {lesson.teacher && (
                                            <div style={{ fontSize: 6.8, fontWeight: 600, color: "#444444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                              {lesson.teacher.firstName[0]}. {lesson.teacher.lastName}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span style={{ color: "#CCCCCC", fontSize: 8 }}>—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>

                    {/* Single Master Signatures Block */}
                    <div
                      className="print-master-signatures"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        paddingTop: 8,
                        marginTop: 4,
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: 140, borderBottom: "1px solid #182220", marginBottom: 2 }} />
                        <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>Timetable Coordinator</div>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: 80, height: 26, border: "1px dashed #70817B", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7.5, color: "#70817B", margin: "0 auto 2px" }}>
                          School Seal
                        </div>
                        <div style={{ fontSize: 7.5, color: "var(--color-text-secondary)" }}>Official Stamp</div>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: 140, borderBottom: "1px solid #182220", marginBottom: 2, marginLeft: "auto" }} />
                        <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>Principal / Vice-Principal Academics</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── OPTION B: FULL CLASS BOOKLET OR INDIVIDUAL CLASS VIEW ── */}
              {(selectedClassId !== "all" || printMode === "booklet") && (
                <div className="timetable-class-routine-wrapper" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                  {/* Screen Info Banner (when booklet is selected for all classes) */}
                  {selectedClassId === "all" && (
                    <div
                      className="no-print"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 20px",
                        backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                        borderRadius: 16,
                        border: "1px solid var(--color-border, #E8ECE9)",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-brand-teal, #0E7D75)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Class-by-Class Booklet View
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                          Displaying full individual weekly timetable sheets for all {classes.length} classes. Each class prints onto its own dedicated A4 landscape sheet.
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setPrintMode("single-master")}
                          style={{ fontSize: 12, padding: "6px 14px", fontWeight: 700, backgroundColor: "#FFFFFF" }}
                        >
                          Switch to Single A4 Master Sheet
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => window.print()}
                          style={{ fontSize: 12, padding: "6px 16px", fontWeight: 700, backgroundColor: "var(--color-brand-teal, #0E7D75)" }}
                        >
                          Print All Classes ({classes.length} Pages)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* If "all" is selected on screen, show quick index navigation */}
                  {selectedClassId === "all" && classes.length > 1 && (
                    <div
                      className="no-print"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        padding: "12px 16px",
                        backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                        borderRadius: 16,
                        border: "1px solid var(--color-border, #E8ECE9)",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--color-ink)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Quick Jump:
                      </span>
                      {classes.map((c) => (
                        <a
                          key={c.id}
                          href={`#class-section-${c.id}`}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 9999,
                            backgroundColor: "#FFFFFF",
                            border: "1px solid var(--color-border, #E8ECE9)",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--color-brand-teal, #0E7D75)",
                            textDecoration: "none",
                          }}
                        >
                          {c.name}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Loop through classesToDisplay: If "all", renders ALL classes! */}
                  {classesToDisplay.map((cls) => {
                    const classLessonsMap = getLessonsMapForClass(cls.id);

                    return (
                      <div
                        key={cls.id}
                        id={`class-section-${cls.id}`}
                        className="print-a4-sheet"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        {/* ── Official School Letterhead (Appears on every A4 Print Sheet) ── */}
                        <div
                          className="print-header"
                          style={{
                            paddingBottom: 8,
                            borderBottom: "2px solid #182220",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-ink)" }}>
                              Modern School Management System
                            </div>
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary, #70817B)", fontWeight: 600 }}>
                              Official Weekly Academic Routine · {timetable.academicYear} Academic Session
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-brand-teal, #0E7D75)" }}>
                              {cls.name}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary, #70817B)" }}>
                              Level: {cls.level} {cls.stream ? `· Arm: ${cls.stream}` : ""}
                            </div>
                          </div>
                        </div>

                        {/* ── Standard 5-Day Weekly Timetable Grid ── */}
                        <div style={{ overflowX: "auto" }}>
                          <table
                            className="print-table"
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              border: "1px solid var(--color-border, #E8ECE9)",
                            }}
                          >
                            <thead>
                              <tr style={{ backgroundColor: "var(--color-surface-subtle, #F4F7F5)" }}>
                                <th style={{ width: 110, padding: "8px 6px", textAlign: "center", borderRight: "1px solid var(--color-border)" }}>
                                  Day / Time
                                </th>
                                {periodSlots.map((slot, sIdx) => (
                                  <th
                                    key={sIdx}
                                    style={{
                                      textAlign: "center",
                                      padding: "8px 4px",
                                      borderRight: sIdx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                                      backgroundColor: slot.isBreak ? "var(--color-warning-bg, #FEF3C7)" : "inherit",
                                      width: slot.isBreak ? 75 : 120,
                                    }}
                                  >
                                    <div style={{ fontSize: 11, fontWeight: 800, color: slot.isBreak ? "var(--color-warning-text, #92400E)" : "var(--color-ink)" }}>
                                      {slot.label}
                                    </div>
                                    <div style={{ fontSize: 9, fontWeight: 500, color: slot.isBreak ? "var(--color-warning-text)" : "var(--color-text-secondary)", marginTop: 2 }}>
                                      {slot.startTime} - {slot.endTime}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {DAYS_OF_WEEK.map((day) => (
                                <tr key={day.key} style={{ borderTop: "1px solid var(--color-border)" }}>
                                  {/* Day Label */}
                                  <td
                                    style={{
                                      textAlign: "center",
                                      padding: "10px 6px",
                                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                                      borderRight: "1px solid var(--color-border)",
                                      fontWeight: 800,
                                      fontSize: 12,
                                      color: "var(--color-ink)",
                                    }}
                                  >
                                    <div>{day.label}</div>
                                  </td>

                                  {/* Periods */}
                                  {periodSlots.map((slot, pIdx) => {
                                    if (slot.isBreak) {
                                      return (
                                        <td
                                          key={pIdx}
                                          style={{
                                            backgroundColor: "var(--color-warning-bg, #FEF3C7)",
                                            textAlign: "center",
                                            borderRight: pIdx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                                            verticalAlign: "middle",
                                            padding: 2,
                                          }}
                                        >
                                          <div style={{ fontSize: 9, fontWeight: 800, color: "var(--color-warning-text, #92400E)", letterSpacing: "0.08em" }}>
                                            RECESS
                                          </div>
                                        </td>
                                      );
                                    }

                                    const lesson = classLessonsMap.get(`${day.key}_${slot.periodNumber}`);
                                    const theme = lesson ? getSubjectTheme(lesson.subject.name) : null;

                                    return (
                                      <td
                                        key={pIdx}
                                        onClick={() => lesson && openEditModal(lesson)}
                                        style={{
                                          padding: 5,
                                          verticalAlign: "top",
                                          borderRight: pIdx < periodSlots.length - 1 ? "1px solid var(--color-border)" : "none",
                                          backgroundColor: theme ? theme.bg : "transparent",
                                          cursor: lesson ? "pointer" : "default",
                                        }}
                                      >
                                        {lesson ? (
                                          <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 48 }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: theme?.text, lineHeight: 1.2 }}>
                                              {lesson.subject.name}
                                            </div>
                                            <div style={{ fontSize: 9, color: "var(--color-text-secondary)", fontWeight: 600, marginTop: "auto" }}>
                                              {lesson.teacher ? `${lesson.teacher.firstName[0]}. ${lesson.teacher.lastName}` : "Unassigned"}
                                            </div>
                                            {lesson.room && (
                                              <div style={{ fontSize: 8, color: "var(--color-text-secondary)" }}>
                                                Venue: {lesson.room}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div style={{ textAlign: "center", padding: "12px 0", color: "var(--color-border)", fontSize: 11 }}>
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

                        {/* ── Official A4 Signatures Block ── */}
                        <div
                          className="print-signatures"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-end",
                            paddingTop: 12,
                            marginTop: 4,
                          }}
                        >
                          <div style={{ textAlign: "center" }}>
                            <div style={{ width: 180, borderBottom: "1px solid #182220", marginBottom: 4 }} />
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Form Master / Class Teacher</div>
                          </div>

                          <div style={{ textAlign: "center" }}>
                            <div style={{ width: 100, height: 36, border: "1px dashed #70817B", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#70817B", margin: "0 auto 4px" }}>
                              School Stamp
                            </div>
                            <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Official Seal</div>
                          </div>

                          <div style={{ textAlign: "center" }}>
                            <div style={{ width: 180, borderBottom: "1px solid #182220", marginBottom: 4, marginLeft: "auto" }} />
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Principal / Vice-Principal Academics</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── TEACHER ROSTER VIEW ─────────────────────────────────────────── */}
          {timetable && activeView === "teacher" && (
            <div className="card" style={{ padding: "16px 20px", borderRadius: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                    {selectedTeacherObj ? `${selectedTeacherObj.firstName} ${selectedTeacherObj.lastName}` : "Teacher"} Weekly Roster
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                    Constraint satisfaction verified · No double-booked teaching slots
                  </p>
                </div>
                <span className="pill-success">Conflict-Free</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {periodSlots.map((slot, pIdx) => {
                  if (slot.isBreak) {
                    return (
                      <div
                        key={pIdx}
                        style={{
                          backgroundColor: "var(--color-warning-bg)",
                          color: "var(--color-warning-text)",
                          padding: "8px 16px",
                          borderRadius: 9999,
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        RECESS BREAK
                      </div>
                    );
                  }

                  return (
                    <div
                      key={pIdx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px repeat(5, 1fr)",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", paddingTop: 8 }}>
                        {slot.startTime}
                      </div>

                      {DAYS_OF_WEEK.map((day) => {
                        const lesson = teacherLessonsMap.get(`${day.key}_${slot.periodNumber}`);
                        const theme = lesson ? getSubjectTheme(lesson.subject.name) : null;

                        if (!lesson) {
                          return (
                            <div
                              key={day.key}
                              style={{
                                borderRadius: 14,
                                border: "1px dashed var(--color-border)",
                                padding: "8px 10px",
                                textAlign: "center",
                                fontSize: 11,
                                color: "var(--color-text-secondary)",
                                opacity: 0.5,
                              }}
                            >
                              Free Period
                            </div>
                          );
                        }

                        return (
                          <div
                            key={day.key}
                            onClick={() => openEditModal(lesson)}
                            style={{
                              backgroundColor: theme?.bg,
                              border: `1px solid ${theme?.border}`,
                              color: theme?.text,
                              borderRadius: 14,
                              padding: "10px 12px",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{lesson.subject.name}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                              Class: {lesson.classSection.name}
                            </div>
                            {lesson.room && (
                              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>Venue: {lesson.room}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MASTER DAY MATRIX VIEW ──────────────────────────────────────── */}
          {timetable && activeView === "master" && (
            <div className="card" style={{ padding: "16px 20px", borderRadius: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                    Master Day Matrix · {DAYS_OF_WEEK.find((d) => d.key === selectedMasterDay)?.label}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                    All classes scheduled simultaneously across periods
                  </p>
                </div>
                <span className="pill-neutral">Master Schedule</span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>Class Section</th>
                      {periodSlots.map((slot, sIdx) => (
                        <th key={sIdx} style={{ textAlign: "center" }}>
                          {slot.isBreak ? "Break" : `P${slot.periodNumber}`}
                          <div style={{ fontSize: 9, fontWeight: 500 }}>{slot.startTime}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => (
                      <tr key={cls.id}>
                        <td style={{ fontWeight: 700 }}>
                          {cls.name} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)" }}>({cls.level})</span>
                        </td>
                        {periodSlots.map((slot, sIdx) => {
                          if (slot.isBreak) {
                            return (
                              <td key={sIdx} style={{ backgroundColor: "var(--color-warning-bg)", textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--color-warning-text)" }}>
                                BREAK
                              </td>
                            );
                          }
                          const lesson = masterDayLessonsMap.get(`${cls.id}_${slot.periodNumber}`);
                          const theme = lesson ? getSubjectTheme(lesson.subject.name) : null;
                          return (
                            <td
                              key={sIdx}
                              onClick={() => lesson && openEditModal(lesson)}
                              style={{
                                backgroundColor: theme ? theme.bg : "transparent",
                                color: theme ? theme.text : "inherit",
                                cursor: lesson ? "pointer" : "default",
                                padding: 6,
                              }}
                            >
                              {lesson ? (
                                <div style={{ fontSize: 11, fontWeight: 700 }}>
                                  {lesson.subject.name}
                                  <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}>
                                    {lesson.teacher ? `${lesson.teacher.firstName[0]}. ${lesson.teacher.lastName}` : "—"}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ opacity: 0.2 }}>—</span>
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
            backdropFilter: "blur(4px)",
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
              padding: 26,
              borderRadius: 24,
              backgroundColor: "var(--color-surface)",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.16)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-ink)", margin: "0 0 4px" }}>
                  Auto-Generate Timetable
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  Produces conflict-free schedules across all classes and subjects.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !generating && setIsGenModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)" }}
              >
                Close
              </button>
            </div>

            {genError && (
              <div className="pill-danger" style={{ display: "block", marginBottom: 14, padding: "8px 12px", borderRadius: 9999 }}>
                {genError}
              </div>
            )}

            {genSuccessMsg && (
              <div className="pill-success" style={{ display: "block", marginBottom: 14, padding: "8px 12px", borderRadius: 9999 }}>
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
                    placeholder="e.g. First Term Academic Routine"
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

                <div style={{ padding: "12px 14px", backgroundColor: "var(--color-surface-subtle)", borderRadius: 16, border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 2 }}>
                    Constraint Satisfaction Rules
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                    • Zero teacher double-booking guaranteed
                    <br />
                    • Maximum 1 lesson per subject per day
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
            backdropFilter: "blur(4px)",
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
          <div className="card" style={{ width: "100%", maxWidth: 440, padding: 24, borderRadius: 24 }}>
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
                Close
              </button>
            </div>

            {editMsg && (
              <div className="pill-danger" style={{ display: "block", marginBottom: 12, padding: "6px 10px", borderRadius: 9999 }}>
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
                    style={{ backgroundColor: "var(--color-surface-subtle)" }}
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

      {/* ── Strict A4 Paper Print Stylesheet ─────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10px !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Completely hide all screen chrome, navigation, cards, and buttons */
          nav,
          header,
          .no-print,
          button,
          select,
          input,
          .app-sidebar,
          .app-topbar {
            display: none !important;
          }
          .app-canvas {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .app-shell-card {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          .timetable-page-container {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .timetable-grid-layout {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .timetable-class-routine-wrapper {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* ── 1. Single Master Sheet Print Styling (Fits on Exactly 1 A4 Page) ── */
          .print-single-master-sheet {
            display: block !important;
            width: 100% !important;
            max-height: 195mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .master-print-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 2px solid #000000 !important;
            padding-bottom: 3px !important;
            margin-bottom: 4px !important;
          }
          .master-print-table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1.5px solid #000000 !important;
            margin-bottom: 4px !important;
          }
          .master-print-table th,
          .master-print-table td {
            border: 1px solid #000000 !important;
            padding: 2px 3px !important;
            font-size: 8px !important;
            line-height: 1.15 !important;
            color: #000000 !important;
          }
          .master-print-table th {
            background-color: #F0F2F1 !important;
            font-weight: 800 !important;
            text-align: center !important;
          }
          .print-master-signatures {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-end !important;
            margin-top: 4px !important;
            padding-top: 4px !important;
          }

          /* ── 2. Booklet Mode Print Styling (1 Full Page Per Class) ── */
          .print-a4-sheet {
            display: block !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            clear: both !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 0 6mm 0 !important;
            box-sizing: border-box !important;
          }
          .print-a4-sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print-header {
            display: flex !important;
            justify-content: space-between !important;
            border-bottom: 2px solid #000000 !important;
            padding-bottom: 4px !important;
            margin-bottom: 6px !important;
          }
          .print-table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1.5px solid #000000 !important;
            margin-bottom: 6px !important;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #000000 !important;
            padding: 3px 5px !important;
            font-size: 9.5px !important;
            line-height: 1.2 !important;
            color: #000000 !important;
          }
          .print-table th {
            background-color: #F0F2F1 !important;
            font-weight: 800 !important;
            text-align: center !important;
          }
          .print-signatures {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-end !important;
            margin-top: 8px !important;
            padding-top: 6px !important;
          }
        }
      `}</style>
    </div>
  );
}
