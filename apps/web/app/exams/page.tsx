"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Term {
  id: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface ExamSession {
  id: string;
  subject: string;
  classLevel: string;
  date: string;
  time: string;
  hall: string;
}

const GRADING_SCALE = [
  { min: 75, max: 100, grade: "A", label: "Distinction", pill: "pill-success" },
  { min: 65, max: 74, grade: "B", label: "Very Good", pill: "pill-success" },
  { min: 50, max: 64, grade: "C", label: "Credit", pill: "pill-info" },
  { min: 45, max: 49, grade: "D", label: "Pass", pill: "pill-warning" },
  { min: 40, max: 44, grade: "E", label: "Fair", pill: "pill-warning" },
  { min: 0, max: 39, grade: "F", label: "Fail", pill: "pill-danger" },
];

const INITIAL_EXAMS: ExamSession[] = [
  { id: "1", subject: "Mathematics", classLevel: "JSS 1 - SS 3", date: "2026-11-20", time: "09:00 AM - 11:30 AM", hall: "Main Exam Hall A" },
  { id: "2", subject: "English Language", classLevel: "JSS 1 - SS 3", date: "2026-11-21", time: "09:00 AM - 11:30 AM", hall: "Main Exam Hall A" },
  { id: "3", subject: "Basic Science & Technology", classLevel: "JSS 1 - JSS 3", date: "2026-11-22", time: "10:00 AM - 12:00 PM", hall: "Science Complex Hall" },
  { id: "4", subject: "Physics / Chemistry", classLevel: "SS 1 - SS 3", date: "2026-11-23", time: "09:00 AM - 12:00 PM", hall: "Science Lab 1 & 2" },
];

export default function ExamsPage() {
  const [activeTab, setActiveTab] = useState<"terms" | "grading" | "timetable">("terms");
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New Term Form
  const [showTermModal, setShowTermModal] = useState(false);
  const [termName, setTermName] = useState("First Term");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submittingTerm, setSubmittingTerm] = useState(false);

  // Timetable
  const [examList, setExamList] = useState<ExamSession[]>(INITIAL_EXAMS);
  const [showExamModal, setShowExamModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("JSS 1");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newHall, setNewHall] = useState("");

  async function loadTerms() {
    try {
      const res = await fetch(`${API}/api/v1/terms`, { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setTerms(data);
    } catch {
      setError("Failed to load academic terms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTerms();
  }, []);

  async function handleSetCurrentTerm(termId: string) {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API}/api/v1/terms/${termId}/set-current`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        setError("Failed to set current term.");
        return;
      }
      setSuccess("Active academic term updated.");
      loadTerms();
    } catch {
      setError("Network error updating term.");
    }
  }

  async function handleCreateTerm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmittingTerm(true);

    try {
      const res = await fetch(`${API}/api/v1/terms`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: termName,
          academicYear,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Could not create term.");
        return;
      }
      setSuccess(`Term ${termName} created successfully.`);
      setShowTermModal(false);
      loadTerms();
    } catch {
      setError("Network connection failed.");
    } finally {
      setSubmittingTerm(false);
    }
  }

  function handleAddExam(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject || !newDate || !newTime || !newHall) return;
    const session: ExamSession = {
      id: Date.now().toString(),
      subject: newSubject,
      classLevel: newClassLevel,
      date: newDate,
      time: newTime,
      hall: newHall,
    };
    setExamList([...examList, session]);
    setShowExamModal(false);
    setNewSubject("");
    setNewDate("");
    setNewTime("");
    setNewHall("");
  }

  const currentTerm = terms.find((t) => t.isCurrent);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Exam &amp; Term Management</h1>
          <p className="page-subtitle">Configure academic sessions, grading criteria, and exam timetables.</p>
        </div>
        {activeTab === "terms" && (
          <button
            type="button"
            onClick={() => setShowTermModal(true)}
            className="btn btn-primary"
          >
            Create Academic Term
          </button>
        )}
        {activeTab === "timetable" && (
          <button
            type="button"
            onClick={() => setShowExamModal(true)}
            className="btn btn-primary"
          >
            Schedule Exam Paper
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Active Term</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {currentTerm ? currentTerm.name : "Not configured"}
          </div>
          <div className="stat-sub">{currentTerm ? currentTerm.academicYear : "Set a term below"}</div>
        </div>
        <div className="card">
          <div className="stat-label">Total Terms</div>
          <div className="stat-value">{terms.length}</div>
          <div className="stat-sub">Academic sessions</div>
        </div>
        <div className="card">
          <div className="stat-label">Standard Grading</div>
          <div className="stat-value">A – F</div>
          <div className="stat-sub">WAEC Scale</div>
        </div>
        <div className="card">
          <div className="stat-label">Scheduled Exams</div>
          <div className="stat-value">{examList.length}</div>
          <div className="stat-sub">Papers on timetable</div>
        </div>
      </div>

      {/* Notification banners */}
      {success && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-control)", backgroundColor: "var(--color-success-bg)", color: "var(--color-success-text)", fontSize: 13 }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-control)", backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger-text)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
        <button
          type="button"
          onClick={() => setActiveTab("terms")}
          className={`btn ${activeTab === "terms" ? "btn-primary" : "btn-secondary"}`}
        >
          Academic Terms
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("grading")}
          className={`btn ${activeTab === "grading" ? "btn-primary" : "btn-secondary"}`}
        >
          Grading Scale
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("timetable")}
          className={`btn ${activeTab === "timetable" ? "btn-primary" : "btn-secondary"}`}
        >
          Exam Timetable
        </button>
      </div>

      {/* Tab 1: Terms */}
      {activeTab === "terms" && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Configured Academic Terms</h2>
          {loading ? (
            <div className="skeleton" style={{ height: 160 }} />
          ) : terms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No academic terms found</div>
              <div className="empty-state-text">Create your first term to establish grading periods.</div>
              <button type="button" onClick={() => setShowTermModal(true)} className="btn btn-primary">
                Create Academic Term
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Term Name</th>
                  <th>Academic Year</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>{t.academicYear}</td>
                    <td>{new Date(t.startDate).toLocaleDateString()}</td>
                    <td>{new Date(t.endDate).toLocaleDateString()}</td>
                    <td>
                      {t.isCurrent ? (
                        <span className="pill-success">Active / Current</span>
                      ) : (
                        <span className="pill-neutral">Inactive</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {!t.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleSetCurrentTerm(t.id)}
                          className="btn btn-secondary"
                          style={{ padding: "4px 12px", fontSize: 12 }}
                        >
                          Set as Current
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Grading Scheme */}
      {activeTab === "grading" && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Standard Continuous Assessment &amp; Exam Scale</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 18 }}>
            Scores are evaluated out of 100: CA1 (20 Marks) + CA2 (20 Marks) + Examination (60 Marks).
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Score Range</th>
                <th>Grade Letter</th>
                <th>Classification</th>
                <th>Remark Description</th>
              </tr>
            </thead>
            <tbody>
              {GRADING_SCALE.map((item) => (
                <tr key={item.grade}>
                  <td style={{ fontWeight: 600 }}>{item.min}% – {item.max}%</td>
                  <td>
                    <span className={item.pill}>{item.grade}</span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.label}</td>
                  <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {item.grade === "A"
                      ? "Outstanding demonstration of learning objectives and subject mastery."
                      : item.grade === "B"
                      ? "Above-average understanding and high academic performance."
                      : item.grade === "C"
                      ? "Satisfactory completion of curricular requirements."
                      : item.grade === "D" || item.grade === "E"
                      ? "Marginal pass; remedial assistance recommended."
                      : "Unsatisfactory. Student must retake assessment or receive tutoring."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Exam Timetable */}
      {activeTab === "timetable" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Scheduled Examination Papers</h2>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{examList.length} scheduled</span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Class / Level</th>
                <th>Date</th>
                <th>Time Window</th>
                <th>Hall / Venue</th>
              </tr>
            </thead>
            <tbody>
              {examList.map((ex) => (
                <tr key={ex.id}>
                  <td style={{ fontWeight: 600 }}>{ex.subject}</td>
                  <td><span className="pill-neutral">{ex.classLevel}</span></td>
                  <td>{new Date(ex.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</td>
                  <td style={{ fontWeight: 500 }}>{ex.time}</td>
                  <td>{ex.hall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Term */}
      {showTermModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 100,
          }}
        >
          <div className="card" style={{ maxWidth: 460, width: "100%", backgroundColor: "#ffffff" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Create Academic Term</h3>
            <form onSubmit={handleCreateTerm} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Term Name</label>
                <select value={termName} onChange={(e) => setTermName(e.target.value)} className="input" required>
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>
              <div>
                <label className="label">Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2025/2026"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowTermModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={submittingTerm} className="btn btn-primary" style={{ flex: 2 }}>
                  {submittingTerm ? "Saving..." : "Save Academic Term"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Exam */}
      {showExamModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 100,
          }}
        >
          <div className="card" style={{ maxWidth: 460, width: "100%", backgroundColor: "#ffffff" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Schedule Exam Paper</h3>
            <form onSubmit={handleAddExam} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Subject Name</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Civic Education"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Target Class / Level</label>
                <input
                  type="text"
                  value={newClassLevel}
                  onChange={(e) => setNewClassLevel(e.target.value)}
                  placeholder="e.g. JSS 1 - JSS 3"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Exam Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Time Slot</label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="e.g. 09:00 AM - 11:30 AM"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Hall / Venue</label>
                <input
                  type="text"
                  value={newHall}
                  onChange={(e) => setNewHall(e.target.value)}
                  placeholder="e.g. Main Examination Hall"
                  className="input"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowExamModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Add to Timetable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
