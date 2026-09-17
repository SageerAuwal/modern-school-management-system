"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [clsRes, stfRes] = await Promise.all([
          fetch(`${API}/api/v1/classes`, { credentials: "include" }).then((r) => r.json()),
          fetch(`${API}/api/v1/staff?all=true`, { credentials: "include" }).then((r) => r.json()),
        ]);

        if (Array.isArray(clsRes)) setClasses(clsRes);
        if (Array.isArray(stfRes)) {
          const teacherList = stfRes.filter((s: StaffMember) => s.role === "TEACHER" || s.role === "ADMIN");
          setTeachers(teacherList);
          if (teacherList.length > 0) {
            setSelectedTeacherId(teacherList[0].user?.id || teacherList[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load teacher portal data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeTeacher = teachers.find((t) => (t.user?.id || t.id) === selectedTeacherId) || teachers[0];
  const myAssignedClasses = classes.filter((c) => c.teacherId === selectedTeacherId || !selectedTeacherId);

  return (
    <div className="page">
      {/* Top Banner with Teacher Switcher for Offline Testing */}
      <div className="card" style={{ marginBottom: 24, backgroundColor: "var(--color-surface)", borderLeft: "4px solid var(--color-ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Teacher Workspace
            </span>
            <h1 className="page-title" style={{ marginTop: 2, fontSize: 22 }}>
              Welcome back, {activeTeacher ? `${activeTeacher.firstName} ${activeTeacher.lastName}` : "Instructor"}
            </h1>
            <p className="page-subtitle">Manage your assigned classroom rosters, daily roll call, and student scores.</p>
          </div>

          {teachers.length > 1 && (
            <div style={{ minWidth: 200 }}>
              <label className="label" style={{ fontSize: 11 }}>Switch Active Teacher Profile</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="input"
                style={{ fontSize: 13 }}
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.user?.id || t.id}>
                    {t.lastName}, {t.firstName} ({t.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Assigned Classes</div>
          <div className="stat-value">{myAssignedClasses.length}</div>
          <div className="stat-sub">Form master</div>
        </div>
        <div className="card">
          <div className="stat-label">Daily Attendance</div>
          <div className="stat-value" style={{ fontSize: 18, color: "var(--color-success-text)" }}>
            Ready to Mark
          </div>
          <div className="stat-sub">Today's register</div>
        </div>
        <div className="card">
          <div className="stat-label">Continuous Assessment</div>
          <div className="stat-value">CA1 &amp; CA2</div>
          <div className="stat-sub">Grading open</div>
        </div>
        <div className="card">
          <div className="stat-label">Report Cards</div>
          <div className="stat-value">Available</div>
          <div className="stat-sub">Terminal scores</div>
        </div>
      </div>

      {/* Primary Action Section: My Classes */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>My Classes (Form Teacher)</h2>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {myAssignedClasses.length} active class sections
          </span>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 140 }} />
        ) : myAssignedClasses.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-title">No class assigned yet</div>
            <div className="empty-state-text">You have not been assigned as a class form teacher for this session.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {myAssignedClasses.map((cls) => (
              <div key={cls.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{cls.name}</h3>
                      <span className="pill-neutral" style={{ marginTop: 4 }}>Level: {cls.level}</span>
                    </div>
                    <span className="pill-success">
                      {cls._count?.enrollments ?? 0} Students
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16 }}>
                    Form Teacher: {cls.teacher ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : "Self"}
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
                  <Link href={`/attendance`} className="btn btn-primary" style={{ flex: 1, textAlign: "center", fontSize: 12 }}>
                    Mark Attendance
                  </Link>
                  <Link href={`/grades`} className="btn btn-secondary" style={{ flex: 1, textAlign: "center", fontSize: 12 }}>
                    Enter Scores
                  </Link>
                  <Link href={`/results`} className="btn btn-secondary" style={{ flex: 1, textAlign: "center", fontSize: 12 }}>
                    Report Cards
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Classroom Quick Shortcuts */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Daily Workflow Shortcuts</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Link href="/attendance" style={{ textDecoration: "none" }}>
            <div style={{ padding: 14, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", transition: "background-color 0.15s" }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Daily Roll Call</div>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
                Record student daily attendance with Present, Absent, Late, or Excused status.
              </p>
            </div>
          </Link>

          <Link href="/grades" style={{ textDecoration: "none" }}>
            <div style={{ padding: 14, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", transition: "background-color 0.15s" }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Score Sheets</div>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
                Enter CA1, CA2, and terminal examination marks for your enrolled students.
              </p>
            </div>
          </Link>

          <Link href="/exams" style={{ textDecoration: "none" }}>
            <div style={{ padding: 14, borderRadius: "var(--radius-control)", border: "1px solid var(--color-border)", transition: "background-color 0.15s" }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Exam Timetable</div>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
                Check scheduled dates, times, and exam hall venues for upcoming exams.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
