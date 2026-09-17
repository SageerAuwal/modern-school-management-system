"use client";

import { useState, useEffect, FormEvent } from "react";

interface Teacher {
  id?: string;
  firstName: string;
  lastName: string;
}

interface ClassSection {
  id: string;
  name: string;
  level: string;
  stream?: string | null;
  capacity?: number | null;
  academicYear?: string;
  isActive: boolean;
  teacher: Teacher | null;
  _count: {
    enrollments: number;
  };
}

interface UserTeacher {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teachers, setTeachers] = useState<UserTeacher[]>([]);
  const [classNameInput, setClassNameInput] = useState("");
  const [levelInput, setLevelInput] = useState("");
  const [academicYearInput, setAcademicYearInput] = useState("2025/2026");
  const [streamInput, setStreamInput] = useState("");
  const [capacityInput, setCapacityInput] = useState("");
  const [teacherIdInput, setTeacherIdInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchClasses = () => {
    setLoading(true);
    setError("");
    fetch(`${API}/api/v1/classes`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load classes");
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setError(data.message ?? "Failed to load classes");
        }
      })
      .catch((err) => {
        setError(err.message || "Network error");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    // Attempt to load teachers for assignment dropdown
    fetch(`${API}/api/v1/users`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setTeachers(data.filter((u: UserTeacher) => u.role === "TEACHER"));
        }
      })
      .catch(() => {
        // Teacher assignment list is an optional enhancement
      });
  }, []);

  const handleOpenModal = () => {
    setCreateError("");
    setClassNameInput("");
    setLevelInput("");
    setStreamInput("");
    setCapacityInput("");
    setTeacherIdInput("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!submitting) {
      setIsModalOpen(false);
    }
  };

  const handleCreateClass = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: classNameInput.trim(),
        level: levelInput.trim(),
        academicYear: academicYearInput.trim(),
      };

      if (streamInput.trim()) {
        payload.stream = streamInput.trim();
      }

      if (capacityInput.trim()) {
        const parsed = parseInt(capacityInput, 10);
        if (!isNaN(parsed) && parsed > 0) {
          payload.capacity = parsed;
        }
      }

      if (teacherIdInput) {
        payload.teacherId = teacherIdInput;
      }

      const res = await fetch(`${API}/api/v1/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.message ?? "Failed to create class");
        return;
      }

      setIsModalOpen(false);
      fetchClasses();
    } catch {
      setCreateError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Classes</h1>
          <p className="page-subtitle">
            {loading
              ? "Loading classes…"
              : `${classes.length} ${classes.length === 1 ? "class" : "classes"} configured`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenModal}
        >
          Create a class
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="pill-danger"
          style={{
            display: "inline-block",
            marginBottom: "16px",
            padding: "8px 14px",
            borderRadius: "var(--radius-control)",
          }}
        >
          {error}
        </div>
      )}

      {/* 4. Loading Skeleton */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                minHeight: "170px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div className="skeleton" style={{ width: "55%", height: "20px" }} />
                <div
                  className="skeleton"
                  style={{
                    width: "20%",
                    height: "18px",
                    borderRadius: "var(--radius-pill-badge)",
                  }}
                />
              </div>
              <div className="skeleton" style={{ width: "35%", height: "14px" }} />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "8px",
                }}
              >
                <div
                  className="skeleton"
                  style={{ width: "34px", height: "34px", borderRadius: "50%" }}
                />
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div className="skeleton" style={{ width: "40%", height: "11px" }} />
                  <div className="skeleton" style={{ width: "70%", height: "14px" }} />
                </div>
              </div>
              <div
                style={{
                  marginTop: "auto",
                  paddingTop: "12px",
                  borderTop: "var(--border-width) solid var(--color-border)",
                }}
              >
                <div className="skeleton" style={{ width: "30%", height: "14px" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Empty State */}
      {!loading && !error && classes.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          </div>
          <div className="empty-state-title">No classes yet</div>
          <div className="empty-state-text">
            Create your first class to organize students.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenModal}
          >
            Create a class
          </button>
        </div>
      )}

      {/* 2. Grid of cards (one per class) */}
      {!loading && !error && classes.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {classes.map((cls) => {
            const studentCount = cls._count?.enrollments ?? 0;
            const studentLabel = `${studentCount} ${studentCount === 1 ? "student" : "students"}`;
            const teacherName = cls.teacher
              ? `${cls.teacher.firstName} ${cls.teacher.lastName}`
              : "No teacher assigned";
            const initials = cls.teacher
              ? `${cls.teacher.firstName[0] ?? ""}${cls.teacher.lastName[0] ?? ""}`
              : "—";

            return (
              <div
                key={cls.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {cls.name}
                    </h2>
                    <span className={cls.isActive ? "pill-success" : "pill-neutral"}>
                      {cls.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      margin: "0 0 16px 0",
                    }}
                  >
                    {cls.level}
                    {cls.stream ? ` · ${cls.stream}` : ""}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "16px",
                    }}
                  >
                    <div className="avatar">{initials}</div>
                    <div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Class Teacher
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: cls.teacher
                            ? "var(--color-ink)"
                            : "var(--color-text-secondary)",
                        }}
                      >
                        {teacherName}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "var(--border-width) solid var(--color-border)",
                    paddingTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--color-ink)",
                    }}
                  >
                    {studentLabel}
                  </span>
                  {cls.capacity ? (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Capacity: {cls.capacity}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create a Class */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "color-mix(in srgb, var(--color-ink) 45%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 50,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    margin: "0 0 2px 0",
                  }}
                >
                  Create a Class
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                  }}
                >
                  Add a new class section for student enrollment.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                  padding: "4px",
                  display: "inline-flex",
                }}
                aria-label="Close dialog"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {createError && (
              <div
                className="pill-danger"
                style={{
                  display: "block",
                  marginBottom: "16px",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                  fontSize: "12px",
                }}
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateClass}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label className="label" htmlFor="class-name">
                    Class Name *
                  </label>
                  <input
                    id="class-name"
                    className="input"
                    type="text"
                    placeholder="e.g. JSS 1A or Grade 10B"
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="label" htmlFor="class-level">
                      Level *
                    </label>
                    <input
                      id="class-level"
                      className="input"
                      type="text"
                      placeholder="e.g. JSS 1 or Grade 10"
                      value={levelInput}
                      onChange={(e) => setLevelInput(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="academic-year">
                      Academic Year *
                    </label>
                    <input
                      id="academic-year"
                      className="input"
                      type="text"
                      placeholder="2025/2026"
                      value={academicYearInput}
                      onChange={(e) => setAcademicYearInput(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="label" htmlFor="class-stream">
                      Stream (Optional)
                    </label>
                    <input
                      id="class-stream"
                      className="input"
                      type="text"
                      placeholder="e.g. Science, Arts"
                      value={streamInput}
                      onChange={(e) => setStreamInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="class-capacity">
                      Capacity (Optional)
                    </label>
                    <input
                      id="class-capacity"
                      className="input"
                      type="number"
                      min="1"
                      max="200"
                      placeholder="e.g. 40"
                      value={capacityInput}
                      onChange={(e) => setCapacityInput(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="class-teacher">
                    Class Teacher (Optional)
                  </label>
                  <select
                    id="class-teacher"
                    className="input"
                    value={teacherIdInput}
                    onChange={(e) => setTeacherIdInput(e.target.value)}
                  >
                    <option value="">No teacher assigned</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Creating class…" : "Create class"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
