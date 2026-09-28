"use client";

import { useState, useEffect, FormEvent } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface Teacher {
  id?: string;
  firstName: string;
  lastName: string;
}

interface ClassSubjectAssignment {
  id: string;
  subjectId: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  teacherId?: string | null;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
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
  classSubjects?: ClassSubjectAssignment[];
  _count: {
    enrollments: number;
  };
}

interface SchoolSubject {
  id: string;
  name: string;
  code: string;
}

interface UserTeacher {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ClassesPage() {
  const { isAdmin } = useCurrentUser();
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // School subjects & teacher assignments
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [createSubjectTeachers, setCreateSubjectTeachers] = useState<Record<string, string>>({});
  const [editSubjectTeachers, setEditSubjectTeachers] = useState<Record<string, string>>({});

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

  // Edit modal & form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editAcademicYear, setEditAcademicYear] = useState("2025/2026");
  const [editStream, setEditStream] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
      .catch(() => {});

    // Load school curriculum subjects for per-subject teacher assignment
    fetch(`${API}/api/v1/subjects`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setSchoolSubjects(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenModal = () => {
    if (!isAdmin) return;
    setCreateError("");
    setClassNameInput("");
    setLevelInput("");
    setStreamInput("");
    setCapacityInput("");
    setTeacherIdInput("");
    setCreateSubjectTeachers({});
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

      // If subject teachers were assigned during creation, persist them
      const subjectAssignEntries = Object.entries(createSubjectTeachers).filter(([, tId]) => Boolean(tId));
      if (data?.id && subjectAssignEntries.length > 0) {
        await Promise.all(
          subjectAssignEntries.map(([subjectId, teacherId]) =>
            fetch(`${API}/api/v1/subjects/assign`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                classSectionId: data.id,
                subjectId,
                teacherId,
              }),
            })
          )
        );
      }

      setIsModalOpen(false);
      setSuccessMsg(`Class "${classNameInput.trim()}" created successfully.`);
      fetchClasses();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setCreateError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (cls: ClassSection) => {
    if (!isAdmin) return;
    setEditError("");
    setEditingClassId(cls.id);
    setEditClassName(cls.name || "");
    setEditLevel(cls.level || "");
    setEditAcademicYear(cls.academicYear || "2025/2026");
    setEditStream(cls.stream || "");
    setEditCapacity(cls.capacity ? String(cls.capacity) : "");
    setEditTeacherId(cls.teacher?.id || "");

    const initialMap: Record<string, string> = {};
    if (Array.isArray(cls.classSubjects)) {
      for (const cs of cls.classSubjects) {
        if (cs.subjectId) {
          initialMap[cs.subjectId] = cs.teacher?.id || cs.teacherId || "";
        }
      }
    }
    setEditSubjectTeachers(initialMap);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (!editSubmitting) {
      setIsEditModalOpen(false);
    }
  };

  const handleUpdateClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingClassId) return;
    setEditError("");
    setEditSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: editClassName.trim(),
        level: editLevel.trim(),
        academicYear: editAcademicYear.trim(),
      };

      if (editStream.trim()) {
        payload.stream = editStream.trim();
      } else {
        payload.stream = null;
      }

      if (editCapacity.trim()) {
        const parsed = parseInt(editCapacity, 10);
        if (!isNaN(parsed) && parsed > 0) {
          payload.capacity = parsed;
        } else {
          payload.capacity = null;
        }
      } else {
        payload.capacity = null;
      }

      payload.teacherId = editTeacherId ? editTeacherId : null;

      const res = await fetch(`${API}/api/v1/classes/${editingClassId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.message ?? "Failed to update class");
        return;
      }

      // Persist subject-teacher assignments
      const subjectAssignEntries = Object.entries(editSubjectTeachers);
      if (subjectAssignEntries.length > 0) {
        await Promise.all(
          subjectAssignEntries.map(([subjectId, teacherId]) =>
            fetch(`${API}/api/v1/subjects/assign`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                classSectionId: editingClassId,
                subjectId,
                teacherId: teacherId || undefined,
              }),
            })
          )
        );
      }

      setIsEditModalOpen(false);
      setSuccessMsg(`Class "${editClassName.trim()}" and assigned teachers updated successfully.`);
      fetchClasses();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setEditError("Network error. Please check your connection.");
    } finally {
      setEditSubmitting(false);
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
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenModal}
          >
            Create a class
          </button>
        )}
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

      {/* Success Banner */}
      {successMsg && (
        <div
          className="pill-success"
          style={{
            display: "inline-block",
            marginBottom: "16px",
            padding: "8px 14px",
            borderRadius: "var(--radius-control)",
            fontWeight: 600,
          }}
        >
          {successMsg}
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
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenModal}
            >
              Create a class
            </button>
          )}
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
                  gap: "16px",
                  padding: "20px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "17px",
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        lineHeight: 1.3,
                      }}
                    >
                      {cls.name}
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span className="pill-neutral">
                        {cls.level}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cls)}
                          title="Edit / Amend Class"
                          style={{
                            border: "1px solid var(--color-border)",
                            background: "var(--color-surface-subtle)",
                            padding: "3px 9px",
                            borderRadius: "var(--radius-pill-badge, 9999px)",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--color-ink)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  {cls.stream && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--color-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Stream: {cls.stream}
                    </div>
                  )}
                  {cls.academicYear && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Session: {cls.academicYear}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    backgroundColor: "var(--color-surface-subtle)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <div
                    className="avatar"
                    style={{
                      width: "32px",
                      height: "32px",
                      fontSize: "11px",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.2,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontWeight: 600,
                      }}
                    >
                      Class Teacher
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: cls.teacher ? "var(--color-ink)" : "var(--color-text-secondary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {teacherName}
                    </div>
                  </div>
                </div>

                {/* Subject Teachers Teaching This Class */}
                {cls.classSubjects && cls.classSubjects.some((cs) => cs.teacher) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.2,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontWeight: 600,
                      }}
                    >
                      Subject Teachers ({cls.classSubjects.filter((cs) => cs.teacher).length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {cls.classSubjects
                        .filter((cs) => cs.teacher)
                        .map((cs) => (
                          <span
                            key={cs.id}
                            className="pill-neutral"
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-pill-badge, 9999px)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span style={{ fontWeight: 700, color: "var(--color-brand-teal)" }}>
                              {cs.subject.code || cs.subject.name}:
                            </span>
                            <span>{cs.teacher?.firstName} {cs.teacher?.lastName}</span>
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "12px",
                    borderTop: "var(--border-width) solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--color-text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    {studentLabel}
                  </span>
                  {cls.capacity && (
                    <span
                      style={{
                        fontSize: "12px",
                        color:
                          studentCount >= cls.capacity
                            ? "var(--color-danger-text)"
                            : "var(--color-text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      Capacity: {studentCount}/{cls.capacity}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create a Class */}
      {isModalOpen && isAdmin && (
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
              maxHeight: "90vh",
              overflowY: "auto",
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

                {/* Multi-Teacher: Subject Teacher Assignments */}
                {schoolSubjects.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label className="label" style={{ margin: 0, fontWeight: 700 }}>
                        Subject Teachers (Multi-Teacher Assignment)
                      </label>
                      <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                        Optional
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "0 0 10px 0" }}>
                      Assign teachers to specific subjects for this class. Teachers can teach across multiple classes.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "170px", overflowY: "auto", paddingRight: "4px" }}>
                      {schoolSubjects.map((sub) => (
                        <div key={sub.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "8px", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sub.name}
                          </span>
                          <select
                            className="input"
                            style={{ padding: "4px 8px", fontSize: "12px", height: "32px" }}
                            value={createSubjectTeachers[sub.id] || ""}
                            onChange={(e) =>
                              setCreateSubjectTeachers((prev) => ({
                                ...prev,
                                [sub.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Unassigned</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.firstName} {t.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

      {/* Modal: Edit a Class */}
      {isEditModalOpen && isAdmin && (
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
              handleCloseEditModal();
            }
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "480px",
              maxHeight: "90vh",
              overflowY: "auto",
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
                  Edit Class Section
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                  }}
                >
                  Amend class details, stream, capacity, or assigned teacher.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                disabled={editSubmitting}
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

            {editError && (
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
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateClass}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label className="label" htmlFor="edit-class-name">
                    Class Name *
                  </label>
                  <input
                    id="edit-class-name"
                    className="input"
                    type="text"
                    placeholder="e.g. JSS 1A or Grade 10B"
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="label" htmlFor="edit-class-level">
                      Level *
                    </label>
                    <input
                      id="edit-class-level"
                      className="input"
                      type="text"
                      placeholder="e.g. JSS 1 or Grade 10"
                      value={editLevel}
                      onChange={(e) => setEditLevel(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="edit-academic-year">
                      Academic Year *
                    </label>
                    <input
                      id="edit-academic-year"
                      className="input"
                      type="text"
                      placeholder="2025/2026"
                      value={editAcademicYear}
                      onChange={(e) => setEditAcademicYear(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="label" htmlFor="edit-class-stream">
                      Stream (Optional)
                    </label>
                    <input
                      id="edit-class-stream"
                      className="input"
                      type="text"
                      placeholder="e.g. Science, Arts"
                      value={editStream}
                      onChange={(e) => setEditStream(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="edit-class-capacity">
                      Capacity (Optional)
                    </label>
                    <input
                      id="edit-class-capacity"
                      className="input"
                      type="number"
                      min="1"
                      max="200"
                      placeholder="e.g. 40"
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="edit-class-teacher">
                    Class Teacher (Optional)
                  </label>
                  <select
                    id="edit-class-teacher"
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

                {/* Multi-Teacher: Subject Teacher Assignments */}
                {schoolSubjects.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label className="label" style={{ margin: 0, fontWeight: 700 }}>
                        Subject Teachers (Multi-Teacher Assignment)
                      </label>
                      <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                        Optional
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "0 0 10px 0" }}>
                      Assign teachers to specific subjects for this class. Teachers can teach across multiple classes.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "170px", overflowY: "auto", paddingRight: "4px" }}>
                      {schoolSubjects.map((sub) => (
                        <div key={sub.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "8px", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sub.name}
                          </span>
                          <select
                            className="input"
                            style={{ padding: "4px 8px", fontSize: "12px", height: "32px" }}
                            value={editSubjectTeachers[sub.id] || ""}
                            onChange={(e) =>
                              setEditSubjectTeachers((prev) => ({
                                ...prev,
                                [sub.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Unassigned</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.firstName} {t.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                    onClick={handleCloseEditModal}
                    disabled={editSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? "Saving changes…" : "Save changes"}
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
