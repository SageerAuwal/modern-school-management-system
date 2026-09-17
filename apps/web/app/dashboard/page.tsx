"use client";

import { useEffect, useState } from "react";
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
type Activity = { id: string; action: string; actorEmail: string; targetType: string; createdAt: string }[];

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [fees, setFees] = useState<FeesData | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, enrollmentRes, feesRes, alertsRes, activityRes] = await Promise.all([
          fetch(`${API}/api/v1/dashboard/overview`, { credentials: "include" }).then(res => res.json()),
          fetch(`${API}/api/v1/dashboard/enrollment`, { credentials: "include" }).then(res => res.json()),
          fetch(`${API}/api/v1/dashboard/fees`, { credentials: "include" }).then(res => res.json()),
          fetch(`${API}/api/v1/dashboard/alerts`, { credentials: "include" }).then(res => res.json()),
          fetch(`${API}/api/v1/dashboard/activity`, { credentials: "include" }).then(res => res.json()),
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

  const formatNaira = (amount: number) => `₦${amount.toLocaleString()}`;

  const formatAction = (action: string) => {
    const actions: Record<string, string> = {
      ATTENDANCE_MARKED: "Marked attendance",
      SCORES_ENTERED: "Entered scores",
      PAYMENT_RECEIVED: "Recorded payment",
      STUDENT_ENROLLED: "Enrolled student",
      BOOK_LOANED: "Loaned book",
      BOOK_RETURNED: "Returned book",
    };
    return actions[action] || action;
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="skeleton" style={{ width: 300, height: 40, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 200, height: 20 }} />
        </div>
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 120 }}></div>
          ))}
        </div>
      </div>
    );
  }

  const maxEnrollment = enrollment?.reduce((max, item) => Math.max(max, item.count), 0) || 1;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Your school at a glance</h1>
        <p className="page-subtitle">{today}</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <Link href="/students" className="card" style={{ textDecoration: 'none' }}>
          <div className="stat-label">Students</div>
          <div className="stat-value">{overview?.students?.total || 0}</div>
          <div className="stat-sub">{overview?.students?.enrolled || 0} enrolled</div>
        </Link>
        <Link href="/classes" className="card" style={{ textDecoration: 'none' }}>
          <div className="stat-label">Classes</div>
          <div className="stat-value">{overview?.classes || 0}</div>
          <div className="stat-sub">Active classes</div>
        </Link>
        <Link href="/staff" className="card" style={{ textDecoration: 'none' }}>
          <div className="stat-label">Staff</div>
          <div className="stat-value">{overview?.staff?.records || 0}</div>
          <div className="stat-sub">{overview?.staff?.teachers || 0} teachers</div>
        </Link>
        <Link href="/attendance" className="card" style={{ textDecoration: 'none' }}>
          <div className="stat-label">Attendance Today</div>
          <div className="stat-value">{overview?.attendance?.todayMarked || 0}</div>
          <div className="stat-sub">{overview?.attendance?.rate || 0}% rate</div>
        </Link>
        <Link href="/fees" className="card" style={{ textDecoration: 'none' }}>
          <div className="stat-label">Outstanding Fees</div>
          <div className="stat-value">{formatNaira(overview?.fees?.outstandingAmount || 0)}</div>
          <div className="stat-sub">{overview?.fees?.unpaidCount || 0} unpaid invoices</div>
        </Link>
        <Link href="/library" className="card" style={{ textDecoration: 'none' }}>
          <div className="stat-label">Books on Loan</div>
          <div className="stat-value">{overview?.library?.onLoan || 0}</div>
          <div className="stat-sub">{overview?.library?.overdue || 0} overdue</div>
        </Link>
        <Link href="/buses" className="card" style={{ textDecoration: 'none' }}>
          <div className="stat-label">Buses</div>
          <div className="stat-value">{overview?.buses || 0}</div>
          <div className="stat-sub">Active fleet</div>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Enrollment by Class</h2>
          {enrollment && enrollment.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {enrollment.map(item => (
                <div key={item.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem' }}>{item.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.count}</span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: 'var(--color-surface)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(item.count / maxEnrollment) * 100}%`, backgroundColor: 'var(--color-ink)', height: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="empty-state">
              <div className="empty-state-title">No enrollment data</div>
              <div className="empty-state-text">Add your first student to start tracking enrollment.</div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Fee Collection</h2>
          {fees && fees.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {fees.map((fee, i) => {
                const percent = fee.invoiced > 0 ? Math.round((fee.collected / fee.invoiced) * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{fee.term} {fee.academicYear}</span>
                      <span style={{ fontSize: '0.875rem' }}>{percent}% Collected</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: 'var(--color-surface)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.25rem' }}>
                      <div style={{ width: `${percent}%`, backgroundColor: 'var(--color-success-bg, #10b981)', height: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      <span>Collected: {formatNaira(fee.collected)}</span>
                      <span>Target: {formatNaira(fee.invoiced)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">No fee data</div>
              <div className="empty-state-text">Issue invoices to start tracking fee collection.</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Action Needed</h2>
          
          <Link href="/library" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>Overdue Books</span>
                <span className="pill-danger">{alerts?.overdueBooks?.count || 0}</span>
              </div>
            </div>
          </Link>
          
          <Link href="/fees" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>Unpaid Fees</span>
                <span className="pill-warning">{alerts?.unpaidFees?.count || 0}</span>
              </div>
            </div>
          </Link>

          <Link href="/buses" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>Buses Near Capacity</span>
                <span className="pill-info">{alerts?.busesNearFull?.count || 0}</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Recent Activity</h2>
          {activity && activity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activity.slice(0, 10).map((act) => (
                <div key={act.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div className="avatar" style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', borderRadius: '50%', fontWeight: 600 }}>
                    {act.actorEmail.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 600 }}>{act.actorEmail}</span> {formatAction(act.action)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {new Date(act.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">No recent activity</div>
              <div className="empty-state-text">Check back later for updates.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
