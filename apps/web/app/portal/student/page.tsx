"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

interface TransportInfo {
  busName: string;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
  routeName: string;
  stopName: string;
  pickupTime: string;
}

export default function StudentPortalPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [loading, setLoading] = useState(true);

  // Load students list for simulation/selection
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

  return (
    <div className="page">
      {/* Student Banner with Quick Profile Switcher */}
      <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--color-ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
              {activeStudent ? `${activeStudent.firstName[0]}${activeStudent.lastName[0]}` : "ST"}
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Student Portal
              </span>
              <h1 className="page-title" style={{ marginTop: 2, fontSize: 22 }}>
                {activeStudent ? `${activeStudent.firstName} ${activeStudent.lastName}` : "Student Profile"}
              </h1>
              <p className="page-subtitle">
                Admission: <strong>{activeStudent?.admissionNumber ?? "Pending"}</strong> • Class:{" "}
                <strong>{currentEnrollment?.classSection?.name ?? "Enrolled"}</strong>
              </p>
            </div>
          </div>

          {students.length > 1 && (
            <div style={{ minWidth: 200 }}>
              <label className="label" style={{ fontSize: 11 }}>Switch Student Profile</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="input"
                style={{ fontSize: 13 }}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.lastName}, {s.firstName} ({s.admissionNumber || "No Adm No"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : !activeStudent ? (
        <div className="card empty-state">
          <div className="empty-state-title">No student record found</div>
          <div className="empty-state-text">Add students to the database to view student portal details.</div>
          <Link href="/students/new" className="btn btn-primary">
            Add First Student
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="stat-label">Term Attendance</div>
              <div className="stat-value" style={{ color: "var(--color-success-text)" }}>96%</div>
              <div className="stat-sub">Present this term</div>
            </div>
            <div className="card">
              <div className="stat-label">Borrowed Books</div>
              <div className="stat-value">{loans.length}</div>
              <div className="stat-sub">{loans.filter((l) => l.status === "OVERDUE").length} overdue</div>
            </div>
            <div className="card">
              <div className="stat-label">School Bus</div>
              <div className="stat-value" style={{ fontSize: 18 }}>Bus #102</div>
              <div className="stat-sub">Kano Central Route</div>
            </div>
            <div className="card">
              <div className="stat-label">Current Session</div>
              <div className="stat-value" style={{ fontSize: 18 }}>First Term</div>
              <div className="stat-sub">2025/2026 Academic Year</div>
            </div>
          </div>

          {/* Academic Results Card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Academic Terminal Performance</h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  View full continuous assessment scores, examination results, and class rank.
                </p>
              </div>
              <Link href="/results" className="btn btn-primary" style={{ fontSize: 13 }}>
                Check Official Report Card
              </Link>
            </div>
            <div style={{ padding: 16, backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)" }}>
              <p style={{ fontSize: 13, color: "var(--color-ink)", margin: 0 }}>
                Terminal results for <strong>{currentEnrollment?.classSection?.name ?? "Current Class"}</strong> are available.
                Click the button above to generate and print your official stamp-approved report card.
              </p>
            </div>
          </div>

          {/* Library Loans & Transport Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
            {/* Library Loans */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Library Books on Loan</h2>
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
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>School Bus &amp; Transport</h2>
                <span className="pill-success">Active Bus Pass</span>
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
                  <span style={{ color: "var(--color-text-secondary)" }}>Morning Pickup Time:</span>
                  <strong>07:15 AM</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Driver Contact:</span>
                  <strong>Malam Ibrahim (0803-000-1122)</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
