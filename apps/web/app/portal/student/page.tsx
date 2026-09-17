"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProfileSwitcherTabs, { ProfileTabItem } from "../../components/ProfileSwitcherTabs";
import MiniCalendarSchedule, { ScheduleEvent } from "../../components/MiniCalendarSchedule";
import ActivityTimeline from "../../components/ActivityTimeline";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  gender: string | null;
  enrollmentStatus: string;
  enrollments?: Array<{
    classSection: { id: string; name: string; level: string };
    academicYear: string;
  }>;
}

interface BookLoan {
  id: string;
  book: { title: string; author: string };
  dueDate: string;
  status: string;
  fineAmount?: number;
}

export default function StudentPortalPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"overview" | "activity" | "services">("overview");

  // Load students list
  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch(`${API}/api/v1/students`, { credentials: "include" });
        const data = await res.json();
        if (Array.isArray(data)) {
          setStudents(data);
          if (data.length > 0) {
            setSelectedStudentId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load students", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, []);

  // When selected student changes, fetch their specific loans
  useEffect(() => {
    if (!selectedStudentId) return;
    fetch(`${API}/api/v1/library/loans/student/${selectedStudentId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLoans(data);
        else setLoans([]);
      })
      .catch(() => setLoans([]));
  }, [selectedStudentId]);

  const activeStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const currentEnrollment = activeStudent?.enrollments?.[0];

  const profileTabs: ProfileTabItem[] = students.slice(0, 5).map((s) => ({
    id: s.id,
    label: `${s.firstName} ${s.lastName}`,
    subtitle: s.admissionNumber || undefined,
  }));

  const upcomingExams: ScheduleEvent[] = [
    {
      id: "ex-1",
      title: "Mathematics Mid-Term Exam",
      date: "14 February 2026",
      category: "exam",
      tag: "Term Exam",
      daysRemaining: 5,
      progressPercent: 70,
      color: "#3b82f6",
    },
    {
      id: "ex-2",
      title: "English Essay & Comprehension",
      date: "22 February 2026",
      category: "exam",
      tag: "Continuous Assessment",
      daysRemaining: 12,
      progressPercent: 40,
      color: "#8b5cf6",
    },
    {
      id: "ex-3",
      title: "Basic Science & Technology",
      date: "25 February 2026",
      category: "class",
      tag: "Lab Practical",
      daysRemaining: 15,
      progressPercent: 25,
      color: "#0d9488",
    },
    {
      id: "ex-4",
      title: "Social Studies Assessment",
      date: "28 February 2026",
      category: "event",
      tag: "Theory Test",
      daysRemaining: 18,
      progressPercent: 15,
      color: "#f59e0b",
    },
  ];

  return (
    <div className="page">
      {/* 1. Top Profile Switcher & View Nav */}
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
        {students.length > 1 && (
          <ProfileSwitcherTabs
            items={profileTabs}
            activeId={selectedStudentId}
            onSelect={(id) => setSelectedStudentId(id)}
          />
        )}

        {/* View toggle */}
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
            Activity Calendar
          </button>
          <button
            type="button"
            onClick={() => setActiveView("services")}
            className={`btn ${activeView === "services" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 14px", fontSize: 12, borderRadius: 18 }}
          >
            Library &amp; Bus
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 260, borderRadius: 18 }} />
      ) : !activeStudent ? (
        <div className="card empty-state">
          <div className="empty-state-title">No student record found</div>
          <div className="empty-state-text">Add students to the database to view student portal details.</div>
          <Link href="/students/new" className="btn btn-primary">
            Add First Student
          </Link>
        </div>
      ) : activeView === "activity" ? (
        /* Screen 1: Student Activity Calendar Timeline */
        <ActivityTimeline studentName={`${activeStudent.firstName} ${activeStudent.lastName}`} />
      ) : activeView === "services" ? (
        /* Library Loans & Transport Grid */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
          {/* Library Loans */}
          <div className="card" style={{ backgroundColor: "#ffffff", borderRadius: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                  Library Books on Loan
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                  Active book loans borrowed from the school library.
                </p>
              </div>
              <Link href="/library" style={{ fontSize: 12, color: "var(--color-ink)", fontWeight: 600 }}>
                Browse Library →
              </Link>
            </div>

            {loans.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                No active book loans. Visit the school library to borrow books.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id}>
                      <td style={{ fontWeight: 600 }}>{loan.book.title}</td>
                      <td>{new Date(loan.dueDate).toLocaleDateString()}</td>
                      <td>
                        <span className={loan.status === "OVERDUE" ? "pill-danger" : "pill-info"}>
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* School Bus Assignment */}
          <div className="card" style={{ backgroundColor: "#ffffff", borderRadius: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                  School Bus Pass
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                  Designated morning &amp; afternoon shuttle details.
                </p>
              </div>
              <span className="pill-success">Active Pass</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Assigned Bus:</span>
                <strong>Blue Star Shuttle (KMC-492-AA)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Designated Route:</span>
                <strong>Kano Ring Road Route 1</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Pickup Location:</span>
                <strong>Gidan Murtala Bus Stop</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Pickup Time:</span>
                <strong>07:15 AM</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Driver Contact:</span>
                <strong>Malam Ibrahim (0803-000-1122)</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Screen 2: Modern Student Overview */
        <>
          {/* Greeting Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
              Good Morning, {activeStudent.firstName} 👋
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
              Here is your personal academic overview, daily timetable, and scheduled exams.
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
            {/* Card 1: Progress Status */}
            <div className="card" style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Progress status</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Syllabus Goals</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Term Progress</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>75%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ width: "75%", height: "100%", backgroundColor: "#f59e0b", borderRadius: 3 }} />
              </div>
            </div>

            {/* Card 2: Upcoming Class */}
            <div className="card" style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#8b5cf6" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Upcoming class</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {currentEnrollment?.classSection?.name ?? "Assigned Class"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Next Period</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>Basic Science · 35 Min</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ width: "55%", height: "100%", backgroundColor: "#8b5cf6", borderRadius: 3 }} />
              </div>
            </div>

            {/* Card 3: Attendance Gauge */}
            <div className="card" style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Attendance</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--color-success-text)", fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Attendance Score</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>96% Present</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ width: "96%", height: "100%", backgroundColor: "#10b981", borderRadius: 3 }} />
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
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#ede9fe", color: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  📄
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>4</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Assignments</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </button>

            <Link
              href="/exams"
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
                  🔔
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>3</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>School Events</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </Link>

            <button
              type="button"
              onClick={() => setActiveView("services")}
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
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#ede9fe", color: "#5b21b6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  📚
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>{loans.length}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Library Books</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </button>

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
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  🏆
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>Report Card</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>View Results</div>
                </div>
              </div>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>›</span>
            </Link>
          </div>

          {/* Schedule Calendar with Colored Dots + Exam Countdown Cards */}
          <MiniCalendarSchedule events={upcomingExams} title="Exam Schedule & Deadlines" />
        </>
      )}
    </div>
  );
}
