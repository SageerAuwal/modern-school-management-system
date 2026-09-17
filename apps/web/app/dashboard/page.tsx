"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Overview = {
  students: { total: number; enrolled: number };
  staff: { records: number; teachers: number };
  classes: number;
  buses: number;
  fees: { unpaidCount: number; outstandingAmount: number };
  library: { onLoan: number; overdue: number };
  attendance: { todayMarked: number; rate: number };
};

type Enrollment = { id: string; name: string; level: string; count: number }[];
type FeesData = { term: string; academicYear: string; invoiced: number; collected: number }[];
type Alerts = {
  overdueBooks: { count: number; items: any[] };
  unpaidFees: { count: number; items: any[] };
  busesNearFull: { count: number; items: any[] };
};
type Activity = { id: string; action: string; actorEmail: string | null; targetType: string; createdAt: string }[];

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [fees, setFees] = useState<FeesData | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  // Live Real-Time Calendar State
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  // Operations Filter Checklist State
  const [filters, setFilters] = useState({
    senior: true,
    junior: true,
    highDebt: false,
    lowAttendance: false,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, enrollmentRes, feesRes, alertsRes, activityRes] = await Promise.all([
          fetch(`${API}/api/v1/dashboard/overview`, { credentials: "include" }).then((res) => res.json()).catch(() => null),
          fetch(`${API}/api/v1/dashboard/enrollment`, { credentials: "include" }).then((res) => res.json()).catch(() => null),
          fetch(`${API}/api/v1/dashboard/fees`, { credentials: "include" }).then((res) => res.json()).catch(() => null),
          fetch(`${API}/api/v1/dashboard/alerts`, { credentials: "include" }).then((res) => res.json()).catch(() => null),
          fetch(`${API}/api/v1/dashboard/activity`, { credentials: "include" }).then((res) => res.json()).catch(() => null),
        ]);

        setOverview(overviewRes);
        setEnrollment(enrollmentRes);
        setFees(feesRes);
        setAlerts(alertsRes);
        setActivity(activityRes);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatNaira = (amount: number) => `₦${Number(amount || 0).toLocaleString()}`;

  const formatAction = (action: string) => {
    const actions: Record<string, string> = {
      ATTENDANCE_MARKED: "marked attendance",
      SCORES_ENTERED: "entered scores",
      PAYMENT_RECEIVED: "recorded payment",
      STUDENT_ENROLLED: "enrolled student",
      BOOK_LOANED: "loaned book",
      BOOK_RETURNED: "returned book",
    };
    return actions[action] || action;
  };

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Calendar computations
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const { daysInMonth, startDayOfWeek } = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    return { daysInMonth: totalDays, startDayOfWeek: firstDay };
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleResetToday = () => {
    const now = new Date();
    setCalendarDate(now);
    setSelectedDay(now.getDate());
  };

  if (loading) {
    return (
      <div className="page" style={{ padding: "28px" }}>
        <div className="page-header">
          <div className="skeleton" style={{ width: 300, height: 40, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 200, height: 20 }} />
        </div>
        <div className="stats-grid" style={{ marginBottom: "2rem" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 120 }}></div>
          ))}
        </div>
      </div>
    );
  }

  const maxEnrollment = enrollment?.reduce((max, item) => Math.max(max, item.count), 0) || 1;

  return (
    <div style={{ padding: "24px 28px", backgroundColor: "#FFFFFF", minHeight: "100%" }}>
      {/* ── Two-Column Main Layout ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 28,
          alignItems: "start",
        }}
      >
        {/* ════ LEFT COLUMN: Live Mini Calendar, Radar Card, Filters ══════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card 1: Real-Time Mini Calendar */}
          <div
            className="card"
            style={{
              padding: "20px",
              borderRadius: "var(--radius-card, 20px)",
              border: "1px solid var(--color-border, #E8ECE9)",
              backgroundColor: "#FFFFFF",
            }}
          >
            {/* Month Header and Arrow Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--color-ink, #182220)" }}>
                {monthName}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--color-text-secondary, #70817B)",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: "2px 6px",
                  }}
                >
                  &lt;
                </button>
                <button
                  type="button"
                  onClick={handleResetToday}
                  title="Return to Today"
                  style={{
                    border: "none",
                    background: "var(--color-surface-subtle, #F4F7F5)",
                    color: "var(--color-brand-teal, #0E7D75)",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 9999,
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Next Month"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--color-text-secondary, #70817B)",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: "2px 6px",
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
                fontWeight: 700,
                color: "var(--color-text-secondary, #70817B)",
                marginBottom: 8,
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
                gap: "3px",
                textAlign: "center",
              }}
            >
              {/* Empty offset padding for days before month start */}
              {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} style={{ height: 30 }} />
              ))}

              {/* Day numbers */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const isToday =
                  dayNum === new Date().getDate() &&
                  currentMonth === new Date().getMonth() &&
                  currentYear === new Date().getFullYear();
                const isSelected = dayNum === selectedDay;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedDay(dayNum)}
                    style={{
                      width: 30,
                      height: 30,
                      margin: "0 auto",
                      border: "none",
                      borderRadius: "50%",
                      backgroundColor: isSelected || isToday ? "var(--color-brand-teal, #0E7D75)" : "transparent",
                      color: isSelected || isToday ? "#FFFFFF" : "var(--color-ink, #182220)",
                      fontWeight: isSelected || isToday ? 800 : 500,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isToday) e.currentTarget.style.backgroundColor = "var(--color-surface-subtle, #F4F7F5)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isToday) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--color-border)", fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", fontWeight: 600 }}>
              First Term · 2025/2026 Academic Session
            </div>
          </div>

          {/* Card 2: Deep Teal High-Contrast Live Radar Card */}
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
                Mathematics - SS2 Arm A
              </h3>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255, 255, 255, 0.85)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>08:40 AM - 09:20 AM</span>
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
                    fontWeight: 800,
                  }}
                >
                  MR
                </div>
                <div
                  className="avatar"
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: 10,
                    backgroundColor: "#FFFFFF",
                    color: "#0E7D75",
                    fontWeight: 800,
                  }}
                >
                  SA
                </div>
                <div
                  className="avatar"
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: 9,
                    backgroundColor: "rgba(255, 255, 255, 0.25)",
                    color: "#FFFFFF",
                    fontWeight: 700,
                  }}
                >
                  +2
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link
                  href="/timetable"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 9999,
                    backgroundColor: "var(--color-accent-gold, #F7C844)",
                    color: "#182220",
                    fontSize: 11,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Adjust
                </Link>
                <button
                  type="button"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 9999,
                    backgroundColor: "#0A5A54",
                    color: "#FFFFFF",
                    fontSize: 11,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Confirmed
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Operations Filter Checklist */}
          <div
            className="card"
            style={{
              padding: "18px 20px",
              borderRadius: "var(--radius-card, 20px)",
              border: "1px solid var(--color-border, #E8ECE9)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-ink, #182220)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Operations Filter
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  checked={filters.junior}
                  onChange={(e) => setFilters({ ...filters, junior: e.target.checked })}
                  style={{ accentColor: "var(--color-brand-teal, #0E7D75)", width: 16, height: 16 }}
                />
                Junior Secondary (JS1 - JS3)
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", color: "var(--color-ink)" }}>
                <input
                  type="checkbox"
                  checked={filters.highDebt}
                  onChange={(e) => setFilters({ ...filters, highDebt: e.target.checked })}
                  style={{ accentColor: "var(--color-brand-teal, #0E7D75)", width: 16, height: 16 }}
                />
                Outstanding Fees Only
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", color: "var(--color-ink)" }}>
                <input
                  type="checkbox"
                  checked={filters.lowAttendance}
                  onChange={(e) => setFilters({ ...filters, lowAttendance: e.target.checked })}
                  style={{ accentColor: "var(--color-brand-teal, #0E7D75)", width: 16, height: 16 }}
                />
                Attendance Below 85%
              </label>
            </div>
          </div>

          {/* Card 4: Quick Action Launch Pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link
              href="/students/new"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderRadius: 9999,
                backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                border: "1px solid var(--color-border, #E8ECE9)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              <span>+ Register Student</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Admission</span>
            </Link>

            <Link
              href="/attendance"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderRadius: 9999,
                backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                border: "1px solid var(--color-border, #E8ECE9)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              <span>+ Mark Attendance</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Daily Roll</span>
            </Link>

            <Link
              href="/fees"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderRadius: 9999,
                backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                border: "1px solid var(--color-border, #E8ECE9)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              <span>+ Issue Invoice</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Billing</span>
            </Link>
          </div>
        </div>

        {/* ════ RIGHT COLUMN: Metrics Grid, Charts & Activity ═════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div>
              <h1 className="page-title">Your school at a glance</h1>
              <p className="page-subtitle">{todayStr}</p>
            </div>
          </div>

          {/* 7 Key Stats Cards */}
          <div className="stats-grid" style={{ marginBottom: 4 }}>
            <Link href="/students" className="card" style={{ textDecoration: "none", borderRadius: 20, transition: "transform 0.15s ease" }}>
              <div className="stat-label">Students</div>
              <div className="stat-value">{overview?.students?.total || 0}</div>
              <div className="stat-sub">{overview?.students?.enrolled || 0} enrolled</div>
            </Link>
            <Link href="/classes" className="card" style={{ textDecoration: "none", borderRadius: 20, transition: "transform 0.15s ease" }}>
              <div className="stat-label">Classes</div>
              <div className="stat-value">{overview?.classes || 0}</div>
              <div className="stat-sub">Active classes</div>
            </Link>
            <Link href="/staff" className="card" style={{ textDecoration: "none", borderRadius: 20, transition: "transform 0.15s ease" }}>
              <div className="stat-label">Staff</div>
              <div className="stat-value">{overview?.staff?.records || 0}</div>
              <div className="stat-sub">{overview?.staff?.teachers || 0} teachers</div>
            </Link>
            <Link href="/attendance" className="card" style={{ textDecoration: "none", borderRadius: 20, transition: "transform 0.15s ease" }}>
              <div className="stat-label">Attendance Today</div>
              <div className="stat-value">{overview?.attendance?.todayMarked || 0}</div>
              <div className="stat-sub">{overview?.attendance?.rate || 0}% rate</div>
            </Link>
            <Link href="/fees" className="card" style={{ textDecoration: "none", borderRadius: 20, transition: "transform 0.15s ease" }}>
              <div className="stat-label">Outstanding Fees</div>
              <div className="stat-value">{formatNaira(overview?.fees?.outstandingAmount || 0)}</div>
              <div className="stat-sub">{overview?.fees?.unpaidCount || 0} unpaid invoices</div>
            </Link>
            <Link href="/library" className="card" style={{ textDecoration: "none", borderRadius: 20, transition: "transform 0.15s ease" }}>
              <div className="stat-label">Books on Loan</div>
              <div className="stat-value">{overview?.library?.onLoan || 0}</div>
              <div className="stat-sub">{overview?.library?.overdue || 0} overdue</div>
            </Link>
            <Link href="/transport" className="card" style={{ textDecoration: "none", borderRadius: 20, transition: "transform 0.15s ease" }}>
              <div className="stat-label">Buses</div>
              <div className="stat-value">{overview?.buses || 0}</div>
              <div className="stat-sub">Active fleet</div>
            </Link>
          </div>

          {/* Two-Column: Enrollment by Class & Fee Collection */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            <div className="card" style={{ borderRadius: 24 }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>
                Enrollment by Class
              </h2>
              {enrollment && enrollment.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {enrollment.map((item) => (
                    <div key={item.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{item.name}</span>
                        <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-brand-teal)" }}>{item.count}</span>
                      </div>
                      <div style={{ width: "100%", backgroundColor: "var(--color-surface-subtle, #F4F7F5)", height: "8px", borderRadius: 9999, overflow: "hidden" }}>
                        <div style={{ width: `${(item.count / maxEnrollment) * 100}%`, backgroundColor: "var(--color-brand-teal, #0E7D75)", height: "100%", borderRadius: 9999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "32px 16px" }}>
                  <div className="empty-state-title">No enrollment data</div>
                  <div className="empty-state-text">Add your first student to start tracking enrollment.</div>
                </div>
              )}
            </div>

            <div className="card" style={{ borderRadius: 24 }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>
                Fee Collection
              </h2>
              {fees && fees.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {fees.map((fee, i) => {
                    const percent = fee.invoiced > 0 ? Math.round((fee.collected / fee.invoiced) * 100) : 0;
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>{fee.term} {fee.academicYear}</span>
                          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-brand-teal)" }}>{percent}% Collected</span>
                        </div>
                        <div style={{ width: "100%", backgroundColor: "var(--color-surface-subtle, #F4F7F5)", height: "8px", borderRadius: 9999, overflow: "hidden", marginBottom: "0.35rem" }}>
                          <div style={{ width: `${percent}%`, backgroundColor: "var(--color-accent-gold, #F7C844)", height: "100%", borderRadius: 9999 }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          <span>Collected: {formatNaira(fee.collected)}</span>
                          <span>Target: {formatNaira(fee.invoiced)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "32px 16px" }}>
                  <div className="empty-state-title">No fee data</div>
                  <div className="empty-state-text">Issue invoices to start tracking fee collection.</div>
                </div>
              )}
            </div>
          </div>

          {/* Two-Column: Action Needed & Recent Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderRadius: 24 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--color-ink)" }}>
                Action Needed
              </h2>

              <Link href="/library/loans" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ padding: "0.875rem 1rem", border: "1px solid var(--color-border)", borderRadius: 16, backgroundColor: "var(--color-surface-subtle, #F4F7F5)", transition: "background 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>Overdue Books</span>
                    <span className="pill-danger">{alerts?.overdueBooks?.count || 0}</span>
                  </div>
                </div>
              </Link>

              <Link href="/fees" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ padding: "0.875rem 1rem", border: "1px solid var(--color-border)", borderRadius: 16, backgroundColor: "var(--color-surface-subtle, #F4F7F5)", transition: "background 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>Unpaid Fees</span>
                    <span className="pill-warning">{alerts?.unpaidFees?.count || 0}</span>
                  </div>
                </div>
              </Link>

              <Link href="/transport" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ padding: "0.875rem 1rem", border: "1px solid var(--color-border)", borderRadius: 16, backgroundColor: "var(--color-surface-subtle, #F4F7F5)", transition: "background 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>Buses Near Capacity</span>
                    <span className="pill-info">{alerts?.busesNearFull?.count || 0}</span>
                  </div>
                </div>
              </Link>
            </div>

            <div className="card" style={{ borderRadius: 24 }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>
                Recent Activity
              </h2>
              {activity && activity.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {activity.slice(0, 8).map((act) => {
                    const email = act.actorEmail || "System";
                    const initial = email.charAt(0).toUpperCase();
                    return (
                      <div key={act.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", paddingBottom: "0.75rem", borderBottom: "1px solid var(--color-border)" }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: "0.75rem", flexShrink: 0 }}>
                          {initial}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "0.85rem", lineHeight: 1.3 }}>
                            <span style={{ fontWeight: 600 }}>{email}</span> {formatAction(act.action)}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                            {new Date(act.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "32px 16px" }}>
                  <div className="empty-state-title">No recent activity</div>
                  <div className="empty-state-text">System events will appear here as actions occur.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
