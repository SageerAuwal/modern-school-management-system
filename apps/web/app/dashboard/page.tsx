"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Overview {
  students: { total: number; enrolled: number };
  staff: { records: number; teachers: number };
  classes: number;
  buses: number;
  fees: { unpaidCount: number; outstandingAmount: number };
  library: { onLoan: number; overdue: number };
  attendance: { todayMarked: number; rate: number | null };
}

interface EnrollmentItem { id: string; name: string; level: string; count: number }
interface FeeItem { term: string; academicYear: string; invoiced: number; collected: number }
interface AlertsData {
  overdueBooks: { count: number; items: Array<{ id: string; bookTitle: string; borrowerName?: string; borrower: string; daysOverdue: number; estimatedFine: number }> };
  unpaidFees: { count: number; items: Array<{ id: string; student: { firstName: string; lastName: string }; term: string | null; outstanding: number }> };
  busesNearFull: { count: number; items: Array<{ id: string; name: string; plateNumber: string; assigned: number; capacity: number; occupancy: number }> };
}
interface ActivityItem { id: string; action: string; actorEmail: string | null; targetType: string; createdAt: string }

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [url]);
  return { data, loading };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, href, accent }: { label: string; value: string | number; sub?: string; href?: string; accent?: string }) {
  const card = (
    <div className="card" style={{ backgroundColor: "var(--color-surface)" }}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: accent ?? "var(--color-ink)", margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4, marginBottom: 0 }}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{card}</Link> : card;
}

// ── Horizontal bar chart (CSS only) ──────────────────────────────────────────

function BarChart({ data, maxValue, color, label }: { data: { label: string; value: number }[]; maxValue: number; color: string; label: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 12 }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 80, textAlign: "right" as const, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.label}</span>
            <div style={{ flex: 1, height: 16, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`, height: "100%", backgroundColor: color, borderRadius: 4, transition: "width 0.4s ease", minWidth: item.value > 0 ? 4 : 0 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)", width: 36, flexShrink: 0 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    ATTENDANCE_MARKED: "Marked attendance",
    ATTENDANCE_EDITED: "Edited attendance record",
    SCORES_ENTERED: "Entered scores",
    INVOICE_CREATED: "Created invoice",
    PAYMENT_RECORDED_CASH: "Recorded cash payment",
    PAYMENT_CONFIRMED_PAYSTACK: "Paystack payment confirmed",
    BOOK_ISSUED: "Issued book",
    BOOK_RETURNED: "Returned book",
    STUDENT_ASSIGNED_BUS: "Assigned student to bus",
    BUS_CREATED: "Added new bus",
    BOOK_ADDED: "Added book to catalogue",
  };
  return map[action] ?? action.replace(/_/g, " ").toLowerCase();
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: overview, loading: loadingOverview } = useFetch<Overview>(`${API}/api/v1/dashboard/overview`);
  const { data: enrollment, loading: loadingEnrollment } = useFetch<EnrollmentItem[]>(`${API}/api/v1/dashboard/enrollment`);
  const { data: fees, loading: loadingFees } = useFetch<FeeItem[]>(`${API}/api/v1/dashboard/fees`);
  const { data: alerts } = useFetch<AlertsData>(`${API}/api/v1/dashboard/alerts`);
  const { data: activity } = useFetch<ActivityItem[]>(`${API}/api/v1/dashboard/activity`);

  const maxEnrollment = Math.max(...(enrollment ?? []).map((e) => e.count), 1);
  const maxFees = Math.max(...(fees ?? []).map((f) => f.invoiced), 1);

  const totalAlerts = (alerts?.overdueBooks.count ?? 0) + (alerts?.unpaidFees.count ?? 0) + (alerts?.busesNearFull.count ?? 0);

  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI stat cards */}
      {loadingOverview ? (
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 24 }}>Loading overview…</p>
      ) : overview && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard label="Students" value={overview.students.total} sub={`${overview.students.enrolled} enrolled`} href="/students" />
          <StatCard label="Classes" value={overview.classes} href="/classes" />
          <StatCard label="Staff" value={overview.staff.records} sub={`${overview.staff.teachers} teachers`} href="/staff" />
          <StatCard label="Attendance Today" value={overview.attendance.rate !== null ? `${overview.attendance.rate}%` : "—"}
            sub={`${overview.attendance.todayMarked} marked`} href="/attendance"
            accent={overview.attendance.rate !== null && overview.attendance.rate < 70 ? "#991b1b" : undefined} />
          <StatCard label="Outstanding Fees" value={formatNaira(overview.fees.outstandingAmount)}
            sub={`${overview.fees.unpaidCount} invoice${overview.fees.unpaidCount !== 1 ? "s" : ""}`} href="/fees"
            accent={overview.fees.outstandingAmount > 0 ? "#854d0e" : undefined} />
          <StatCard label="Books on Loan" value={overview.library.onLoan}
            sub={overview.library.overdue > 0 ? `${overview.library.overdue} overdue` : "All on time"} href="/library"
            accent={overview.library.overdue > 0 ? "#991b1b" : undefined} />
          <StatCard label="Buses" value={overview.buses} href="/transport" />
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Enrollment per class chart */}
        <div className="card">
          {loadingEnrollment ? <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Loading…</p> : (enrollment && enrollment.length > 0) ? (
            <BarChart
              label="Enrollment per Class"
              color="#10141A"
              maxValue={maxEnrollment}
              data={enrollment.map((e) => ({ label: e.name, value: e.count }))}
            />
          ) : <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>No classes yet.</p>}
        </div>

        {/* Fee collection by term chart */}
        <div className="card">
          {loadingFees ? <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Loading…</p> : (fees && fees.length > 0) ? (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 12 }}>Fee Collection by Term</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {fees.slice(0, 5).map((f) => {
                  const collectPct = f.invoiced > 0 ? (f.collected / f.invoiced) * 100 : 0;
                  return (
                    <div key={`${f.term}-${f.academicYear}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--color-ink)" }}>{f.term} · {f.academicYear}</span>
                        <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{formatNaira(f.collected)} / {formatNaira(f.invoiced)}</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${collectPct}%`, height: "100%", backgroundColor: collectPct >= 80 ? "#166534" : collectPct >= 50 ? "#854d0e" : "#991b1b", borderRadius: 999, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>No fee data yet.</p>}
        </div>
      </div>

      {/* Alerts + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Alerts */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", margin: 0 }}>Alerts</p>
            {totalAlerts > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#fee2e2", color: "#991b1b" }}>{totalAlerts}</span>}
          </div>
          {!alerts ? <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Loading…</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.overdueBooks.count > 0 && (
                <Link href="/library/loans" style={{ textDecoration: "none" }}>
                  <div style={{ padding: "10px 12px", borderRadius: "var(--radius-control)", backgroundColor: "#fef2f2", border: "1px solid #fecaca", cursor: "pointer" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", margin: "0 0 2px" }}>📚 {alerts.overdueBooks.count} overdue book{alerts.overdueBooks.count !== 1 ? "s" : ""}</p>
                    <p style={{ fontSize: 11, color: "#b91c1c", margin: 0 }}>
                      {alerts.overdueBooks.items.slice(0, 2).map((b) => `${b.bookTitle} (${b.daysOverdue}d)`).join(" · ")}
                    </p>
                  </div>
                </Link>
              )}
              {alerts.unpaidFees.count > 0 && (
                <Link href="/fees" style={{ textDecoration: "none" }}>
                  <div style={{ padding: "10px 12px", borderRadius: "var(--radius-control)", backgroundColor: "#fefce8", border: "1px solid #fde047", cursor: "pointer" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#854d0e", margin: "0 0 2px" }}>💰 {alerts.unpaidFees.count} unpaid invoice{alerts.unpaidFees.count !== 1 ? "s" : ""}</p>
                    <p style={{ fontSize: 11, color: "#92400e", margin: 0 }}>
                      {alerts.unpaidFees.items.slice(0, 2).map((i) => `${i.student.firstName} ${i.student.lastName} — ${formatNaira(i.outstanding)}`).join(" · ")}
                    </p>
                  </div>
                </Link>
              )}
              {alerts.busesNearFull.count > 0 && (
                <Link href="/transport" style={{ textDecoration: "none" }}>
                  <div style={{ padding: "10px 12px", borderRadius: "var(--radius-control)", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", cursor: "pointer" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1e40af", margin: "0 0 2px" }}>🚌 {alerts.busesNearFull.count} bus{alerts.busesNearFull.count !== 1 ? "es" : ""} near capacity</p>
                    <p style={{ fontSize: 11, color: "#1e3a8a", margin: 0 }}>
                      {alerts.busesNearFull.items.slice(0, 2).map((b) => `${b.name} ${b.occupancy}%`).join(" · ")}
                    </p>
                  </div>
                </Link>
              )}
              {totalAlerts === 0 && (
                <p style={{ color: "var(--color-text-secondary)", fontSize: 13, textAlign: "center" as const, padding: "16px 0" }}>✅ No alerts right now</p>
              )}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", margin: "0 0 14px" }}>Recent Activity</p>
          {!activity ? <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Loading…</p> : activity.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>No activity yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {activity.slice(0, 10).map((log) => (
                <div key={log.id} style={{ padding: "8px 0", borderBottom: "var(--border-width) solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, margin: 0, fontWeight: 500, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{actionLabel(log.action)}</p>
                    {log.actorEmail && <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>{log.actorEmail}</p>}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--color-text-secondary)", flexShrink: 0, marginTop: 2 }}>
                    {new Date(log.createdAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
