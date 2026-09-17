"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProfileSwitcherTabs, { ProfileTabItem } from "../../components/ProfileSwitcherTabs";
import MiniCalendarSchedule, { ScheduleEvent } from "../../components/MiniCalendarSchedule";
import ActivityTimeline from "../../components/ActivityTimeline";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ClassSection {
  id: string;
  name: string;
  level: string;
  teacherId: string | null;
  teacher: { firstName: string; lastName: string } | null;
  _count?: { enrollments: number };
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  user?: { id: string; email: string } | null;
}

export default function TeacherPortalPage() {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [teachers, setTeachers] = useState<StaffMember[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"overview" | "activity">("overview");

  useEffect(() => {
    async function loadData() {
      try {
        const [clsRes, stfRes] = await Promise.all([
          fetch(`${API}/api/v1/classes`, { credentials: "include" }).then((r) => r.json()),
          fetch(`${API}/api/v1/staff?all=true`, { credentials: "include" }).then((r) => r.json()),
        ]);

        if (Array.isArray(clsRes)) {
          setClasses(clsRes);
          if (clsRes.length > 0) setSelectedClassId(clsRes[0].id);
        }
        if (Array.isArray(stfRes)) {
          const teacherList = stfRes.filter((s: StaffMember) => s.role === "TEACHER" || s.role === "ADMIN");
          setTeachers(teacherList);
        }
      } catch (err) {
        console.error("Failed to load teacher portal data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const classTabs: ProfileTabItem[] = classes.map((c) => ({
    id: c.id,
    label: c.name,
    subtitle: `${c._count?.enrollments ?? 25} Students`,
    badgeCount: c._count?.enrollments,
  }));

  const upcomingExamSchedule: ScheduleEvent[] = [
    {
      id: "ex-1",
      title: "Mathematics Mid-Term Exam",
      date: "14 February 2026",
      category: "exam",
      tag: "Hall A · Form 1",
      daysRemaining: 5,
      progressPercent: 70,
      color: "#3b82f6",
    },
    {
      id: "ex-2",
      title: "English Essay & Grammar",
      date: "22 February 2026",
      category: "exam",
      tag: "Hall B · All Arms",
      daysRemaining: 12,
      progressPercent: 40,
      color: "#8b5cf6",
    },
    {
      id: "ex-3",
      title: "Basic Science Lab Practical",
      date: "25 February 2026",
      category: "class",
      tag: "Science Lab",
      daysRemaining: 15,
      progressPercent: 25,
      color: "#0d9488",
    },
  ];

  return (
    <div className="page">
      {/* 1. Top Class Switcher Tabs & View Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {classes.length > 0 && (
          <ProfileSwitcherTabs
            items={classTabs}
            activeId={selectedClassId}
            onSelect={(id) => setSelectedClassId(id)}
            addTooltip="Manage classrooms"
          />
        )}

        <div style={{ display: "inline-flex", gap: 6, marginLeft: "auto" }}>
          <button
            type="button"
            onClick={() => setActiveView("overview")}
            className={`btn ${activeView === "overview" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 18 }}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveView("activity")}
            className={`btn ${activeView === "activity" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 18 }}
          >
            Class Activity Calendar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 240, borderRadius: 18 }} />
      ) : activeView === "activity" ? (
        /* Screen 1: Activity Timeline for Selected Classroom */
        <ActivityTimeline studentName={activeClass ? `${activeClass.name} Activity Log` : "Class Activity"} />
      ) : (
        /* Screen 2: Modern Overview */
        <>
          {/* Greeting Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
              Good Morning, Teacher 👋
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
              Managing <strong>{activeClass?.name || "Assigned Classes"}</strong>. Record daily attendance, grade continuous assessments, and review schedules.
            </p>
          </div>

          {/* 3 Status Cards with Linear Progress Bars */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            {/* Card 1: Attendance Ratio */}
            <div className="card" style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Daily Attendance</span>
                </div>
                <Link href="/attendance" style={{ fontSize: 11, color: "var(--color-text-secondary)", textDecoration: "none" }}>
                  Roll call →
                </Link>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Present Students</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>21 / 25</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ width: "84%", height: "100%", backgroundColor: "#10b981", borderRadius: 3 }} />
              </div>
            </div>

            {/* Card 2: Upcoming Class */}
            <div className="card" style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#8b5cf6" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Upcoming Period</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {activeClass?.name || "Period 3"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Next Class</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>Mathematics · 40 Min</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ width: "65%", height: "100%", backgroundColor: "#8b5cf6", borderRadius: 3 }} />
              </div>
            </div>

            {/* Card 3: Grading / Scores Progress */}
            <div className="card" style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Assessment Scores</span>
                </div>
                <Link href="/grades" style={{ fontSize: 11, color: "var(--color-text-secondary)", textDecoration: "none" }}>
                  Gradebook →
                </Link>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>CA1 / CA2 Entered</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>72% Recorded</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ width: "72%", height: "100%", backgroundColor: "#f59e0b", borderRadius: 3 }} />
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Badges */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Link
              href="/attendance"
              className="card"
              style={{
                backgroundColor: "#ffffff",
                padding: "14px 18px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>Mark Roll Call</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Attendance</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </Link>

            <Link
              href="/grades"
              className="card"
              style={{
                backgroundColor: "#ffffff",
                padding: "14px 18px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#ede9fe", color: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  📝
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>Enter Scores</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>CA1, CA2 &amp; Exam</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </Link>

            <Link
              href="/results"
              className="card"
              style={{
                backgroundColor: "#ffffff",
                padding: "14px 18px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  📊
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>Report Cards</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Terminal Results</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </Link>

            <button
              type="button"
              onClick={() => setActiveView("activity")}
              className="card"
              style={{
                backgroundColor: "#ffffff",
                padding: "14px 18px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                border: "1px solid rgba(0,0,0,0.05)",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  📅
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>Class Log</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Activity Feed</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </button>
          </div>

          {/* Assigned Classes Grid */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                Class Sections Overview
              </h2>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {classes.length} active classes
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {classes.map((cls) => (
                <div key={cls.id} className="card" style={{ backgroundColor: "#ffffff", borderRadius: 18, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>{cls.name}</h3>
                      <span className="pill-neutral" style={{ marginTop: 4, display: "inline-block" }}>Level: {cls.level}</span>
                    </div>
                    <span className="pill-success">
                      {cls._count?.enrollments ?? 25} Students
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <Link href="/attendance" className="btn btn-primary" style={{ flex: 1, textAlign: "center", fontSize: 12, padding: "6px 8px" }}>
                      Attendance
                    </Link>
                    <Link href="/grades" className="btn btn-secondary" style={{ flex: 1, textAlign: "center", fontSize: 12, padding: "6px 8px" }}>
                      Scores
                    </Link>
                    <Link href="/results" className="btn btn-secondary" style={{ flex: 1, textAlign: "center", fontSize: 12, padding: "6px 8px" }}>
                      Reports
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Calendar with Colored Dots + Exam Countdown Cards */}
          <MiniCalendarSchedule events={upcomingExamSchedule} title="Examination Schedule & Venues" />
        </>
      )}
    </div>
  );
}
