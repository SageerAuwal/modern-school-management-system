"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import DivisionSwitcher, { SchoolDivision, getDivisionForLevel } from "../components/DivisionSwitcher";
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

interface EnrolledStudentItem {
  id: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    gender: string;
  };
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
  enrollments?: EnrolledStudentItem[];
  _count: {
    enrollments: number;
  };
}

interface SchoolSubject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

interface UserTeacher {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getDivisionInfo(level: string): { label: string; isPrimary: boolean } {
  const l = (level || "").toUpperCase().trim();
  if (l.startsWith("NUR") || l.startsWith("CRE") || l.startsWith("PRI") || l.startsWith("KG") || l.startsWith("BASIC 1") || l.startsWith("BASIC 2") || l.startsWith("BASIC 3") || l.startsWith("BASIC 4") || l.startsWith("BASIC 5") || l.startsWith("BASIC 6")) {
    return { label: "Primary", isPrimary: true };
  }
  if (l.startsWith("JSS") || l.startsWith("SSS") || l.startsWith("SS") || l.startsWith("BASIC 7") || l.startsWith("BASIC 8") || l.startsWith("BASIC 9")) {
    return { label: "Secondary", isPrimary: false };
  }
  return { label: "All School", isPrimary: true };
}

function getSubjectSection(sub: SchoolSubject): { label: "Primary" | "Secondary" | "All Sections"; badgeBg: string; badgeColor: string; badgeBorder: string } {
  const desc = (sub.description || "").toLowerCase();
  const name = (sub.name || "").toLowerCase();

  if (
    desc.includes("[primary]") ||
    desc.includes("primary") ||
    desc.includes("nursery") ||
    name.includes("nursery") ||
    name.includes("basic science") ||
    name.includes("handwriting") ||
    name.includes("phonics")
  ) {
    return {
      label: "Primary",
      badgeBg: "#E6F4F2",
      badgeColor: "#0E7D75",
      badgeBorder: "#BCE5DF",
    };
  }
  if (
    desc.includes("[secondary]") ||
    desc.includes("secondary") ||
    desc.includes("jss") ||
    desc.includes("sss") ||
    desc.includes("waec") ||
    desc.includes("neco") ||
    name.includes("further mathematics") ||
    name.includes("physics") ||
    name.includes("chemistry") ||
    name.includes("biology") ||
    name.includes("government") ||
    name.includes("economics") ||
    name.includes("commerce")
  ) {
    return {
      label: "Secondary",
      badgeBg: "#E8EEF5",
      badgeColor: "#0B2545",
      badgeBorder: "#C4D3E6",
    };
  }
  return {
    label: "All Sections",
    badgeBg: "#F1F5F9",
    badgeColor: "#475569",
    badgeBorder: "#CBD5E1",
  };
}

export default function ClassesPage() {
  const { isAdmin } = useCurrentUser();
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // School subjects & teacher assignments
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [createSubjectTeachers, setCreateSubjectTeachers] = useState<Record<string, string>>({});
  const [editSubjectTeachers, setEditSubjectTeachers] = useState<Record<string, string>>({});

  // Modal & form state: Create Class
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

  // Modal & form state: Edit Class
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

  // Modal & state: Subjects Catalog
  const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectDesc, setNewSubjectDesc] = useState("");
  const [newSubjectSection, setNewSubjectSection] = useState<"ALL" | "PRIMARY" | "SECONDARY">("ALL");
  const [subjectSectionFilter, setSubjectSectionFilter] = useState<"ALL" | "PRIMARY" | "SECONDARY">("ALL");
  const [submittingSubject, setSubmittingSubject] = useState(false);
  const [subjectError, setSubjectError] = useState("");
  const [subjectSuccess, setSubjectSuccess] = useState("");

  // Modal & state: Class Overview Drawer
  const [overviewClassId, setOverviewClassId] = useState<string | null>(null);
  const [overviewClassData, setOverviewClassData] = useState<ClassSection | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewTab, setOverviewTab] = useState<"subjects" | "students" | "details">("subjects");

  // In-Overview Subject Assignment & Inline Creator
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assigningSubject, setAssigningSubject] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [showInlineCreateSubject, setShowInlineCreateSubject] = useState(false);
  const [inlineSubjectName, setInlineSubjectName] = useState("");
  const [inlineSubjectCode, setInlineSubjectCode] = useState("");
  const [inlineSubjectTeacherId, setInlineSubjectTeacherId] = useState("");
  const [inlineCreatingSubject, setInlineCreatingSubject] = useState(false);
  const [inlineSubjectError, setInlineSubjectError] = useState("");

  // Division filter: ALL | PRIMARY | SECONDARY (persisted in sessionStorage)
  const [divisionFilter, setDivisionFilter] = useState<"ALL" | "PRIMARY" | "SECONDARY">(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem("classesDiv") as "ALL" | "PRIMARY" | "SECONDARY") || "ALL";
    }
    return "ALL";
  });

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

  const fetchSubjects = () => {
    fetch(`${API}/api/v1/subjects`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setSchoolSubjects(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchClasses();
    fetchSubjects();

    // Load teachers for assignment dropdown
    fetch(`${API}/api/v1/users`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setTeachers(data.filter((u: UserTeacher) => u.role === "TEACHER"));
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

  const handleEditClass = async (e: FormEvent) => {
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

      if (editTeacherId) {
        payload.teacherId = editTeacherId;
      } else {
        payload.teacherId = null;
      }

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
      if (editingClassId && subjectAssignEntries.length > 0) {
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
      setSuccessMsg(`Class "${editClassName.trim()}" updated successfully.`);
      fetchClasses();
      if (overviewClassId === editingClassId) {
        refreshClassOverview(editingClassId);
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setEditError("Network error. Please check your connection.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Subjects Catalog Actions ───────────────────────────────────────────────
  const handleCreateSubject = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newSubjectName.trim()) return;
    setSubmittingSubject(true);
    setSubjectError("");
    setSubjectSuccess("");

    try {
      const sectionTag =
        newSubjectSection === "PRIMARY"
          ? "[Primary]"
          : newSubjectSection === "SECONDARY"
          ? "[Secondary]"
          : "[All Sections]";

      const combinedDesc = newSubjectDesc.trim()
        ? `${sectionTag} ${newSubjectDesc.trim()}`
        : sectionTag;

      const res = await fetch(`${API}/api/v1/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newSubjectName.trim(),
          code: newSubjectCode.trim() ? newSubjectCode.trim().toUpperCase() : undefined,
          description: combinedDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create subject");
      }

      setSubjectSuccess(`Subject "${newSubjectName.trim()}" created successfully for ${newSubjectSection === "PRIMARY" ? "Primary" : newSubjectSection === "SECONDARY" ? "Secondary" : "All Sections"}.`);
      setNewSubjectName("");
      setNewSubjectCode("");
      setNewSubjectDesc("");
      fetchSubjects();
      setTimeout(() => setSubjectSuccess(""), 4000);
    } catch (err: unknown) {
      setSubjectError(err instanceof Error ? err.message : "Failed to create subject");
    } finally {
      setSubmittingSubject(false);
    }
  };

  const handleInlineCreateAndAssignSubject = async (e: FormEvent) => {
    e.preventDefault();
    if (!overviewClassId || !overviewClassData || !inlineSubjectName.trim()) return;

    setInlineCreatingSubject(true);
    setInlineSubjectError("");

    try {
      const divInfo = getDivisionInfo(overviewClassData.level);
      const sectionTag = divInfo.isPrimary ? "[Primary]" : "[Secondary]";
      const desc = `${sectionTag} Created for ${overviewClassData.name}`;

      // 1. Create the subject
      const subRes = await fetch(`${API}/api/v1/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: inlineSubjectName.trim(),
          code: inlineSubjectCode.trim() ? inlineSubjectCode.trim().toUpperCase() : undefined,
          description: desc,
        }),
      });

      const subData = await subRes.json();
      if (!subRes.ok) {
        throw new Error(subData.message || "Failed to create subject");
      }

      const createdSubjectId = subData.id;

      // 2. Assign the subject to the class
      const assignRes = await fetch(`${API}/api/v1/subjects/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          classSectionId: overviewClassId,
          subjectId: createdSubjectId,
          teacherId: inlineSubjectTeacherId || undefined,
        }),
      });

      if (!assignRes.ok) {
        const assignData = await assignRes.json();
        throw new Error(assignData.message || "Subject created, but failed to assign to class");
      }

      setAssignSuccess(`Subject "${inlineSubjectName.trim()}" created and assigned to ${overviewClassData.name}!`);
      setInlineSubjectName("");
      setInlineSubjectCode("");
      setInlineSubjectTeacherId("");
      setShowInlineCreateSubject(false);
      fetchSubjects();
      await refreshClassOverview(overviewClassId);
      setTimeout(() => setAssignSuccess(""), 4000);
    } catch (err: unknown) {
      setInlineSubjectError(err instanceof Error ? err.message : "Failed to create and assign subject");
    } finally {
      setInlineCreatingSubject(false);
    }
  };

  // ── Class Overview Actions ─────────────────────────────────────────────────
  const handleOpenClassOverview = async (cls: ClassSection) => {
    setOverviewClassId(cls.id);
    setOverviewClassData(null);
    setOverviewTab("subjects");
    setAssignSubjectId("");
    setAssignTeacherId("");
    setAssignError("");
    setAssignSuccess("");
    setOverviewLoading(true);

    try {
      const res = await fetch(`${API}/api/v1/classes/${cls.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOverviewClassData(data);
      } else {
        setOverviewClassData(cls);
      }
    } catch {
      setOverviewClassData(cls);
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleCloseClassOverview = () => {
    setOverviewClassId(null);
    setOverviewClassData(null);
  };

  const refreshClassOverview = async (classId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/classes/${classId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOverviewClassData(data);
      }
    } catch {
      // ignore
    }
    fetchClasses();
  };

  const handleAssignSubjectInOverview = async (e: FormEvent) => {
    e.preventDefault();
    if (!overviewClassId || !assignSubjectId) return;
    setAssigningSubject(true);
    setAssignError("");
    setAssignSuccess("");

    try {
      const res = await fetch(`${API}/api/v1/subjects/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          classSectionId: overviewClassId,
          subjectId: assignSubjectId,
          teacherId: assignTeacherId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to assign subject");
      }

      setAssignSuccess("Subject assigned successfully.");
      setAssignSubjectId("");
      setAssignTeacherId("");
      await refreshClassOverview(overviewClassId);
      setTimeout(() => setAssignSuccess(""), 3000);
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign subject");
    } finally {
      setAssigningSubject(false);
    }
  };

  const handleUpdateTeacherInOverview = async (subjectId: string, teacherId: string) => {
    if (!overviewClassId) return;
    try {
      const res = await fetch(`${API}/api/v1/subjects/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          classSectionId: overviewClassId,
          subjectId,
          teacherId: teacherId || undefined,
        }),
      });
      if (res.ok) {
        await refreshClassOverview(overviewClassId);
      }
    } catch {
      // ignore
    }
  };

  const handleRemoveSubjectInOverview = async (subjectId: string) => {
    if (!overviewClassId) return;
    if (!confirm("Are you sure you want to remove this subject from this class?")) return;
    try {
      const res = await fetch(`${API}/api/v1/subjects/class/${overviewClassId}/subject/${subjectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await refreshClassOverview(overviewClassId);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="page">
      {/* 1. Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Classes</h1>
          <p className="page-subtitle">
            {loading ? "Loading classes..." : `${classes.length} active classes across Primary & Secondary sections`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsSubjectsModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Curriculum Subjects ({schoolSubjects.length})
          </button>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setNewSubjectSection("ALL");
                setIsSubjectsModalOpen(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderColor: "var(--color-brand-teal)",
                color: "var(--color-brand-teal)",
                fontWeight: 600,
              }}
            >
              + Create Subject
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenModal}
            >
              + Create a class
            </button>
          )}
        </div>
      </div>

      {/* 2. Global Error Display */}
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

      {/* 3. Global Success Message */}
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
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: "18px",
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                minHeight: "180px",
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
                    width: "25%",
                    height: "18px",
                    borderRadius: "var(--radius-pill-badge)",
                  }}
                />
              </div>
              <div className="skeleton" style={{ width: "40%", height: "14px" }} />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "6px",
                }}
              >
                <div
                  className="skeleton"
                  style={{ width: "32px", height: "32px", borderRadius: "50%" }}
                />
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div className="skeleton" style={{ width: "45%", height: "11px" }} />
                  <div className="skeleton" style={{ width: "70%", height: "13px" }} />
                </div>
              </div>
              <div
                style={{
                  marginTop: "auto",
                  paddingTop: "12px",
                  borderTop: "var(--border-width) solid var(--color-border)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div className="skeleton" style={{ width: "30%", height: "14px" }} />
                <div className="skeleton" style={{ width: "25%", height: "14px" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Empty State */}
      {!loading && !error && classes.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon" style={{ display: "inline-flex", justifyContent: "center" }}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h2 className="empty-state-title">No classes yet</h2>
          <p className="empty-state-text">
            Create your first class to organize students, assign class teachers, and set up subjects.
          </p>
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

      {/* 3.5 Division Switcher Bar */}
      {!loading && classes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <DivisionSwitcher
            value={divisionFilter}
            onChange={(div) => {
              setDivisionFilter(div);
              if (typeof window !== "undefined") sessionStorage.setItem("classesDiv", div);
            }}
            counts={{
              ALL: classes.length,
              PRIMARY: classes.filter((c) => getDivisionInfo(c.level).label === "Primary").length,
              SECONDARY: classes.filter((c) => getDivisionInfo(c.level).label === "Secondary").length,
            }}
            storageKey="classesDiv"
          />
        </div>
      )}

      {/* 6. Decluttered Scannable Class Cards Grid */}
      {!loading && !error && classes.length > 0 && (() => {
        const filteredClasses = divisionFilter === "ALL"
          ? classes
          : classes.filter((c) => {
              const div = getDivisionInfo(c.level);
              if (divisionFilter === "PRIMARY") return div.label === "Primary";
              if (divisionFilter === "SECONDARY") return div.label === "Secondary";
              return true;
            });
        return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: "18px",
          }}
        >
          {filteredClasses.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "32px 0", color: "var(--color-text-secondary)", fontSize: 14 }}>
              No classes in the {divisionFilter === "PRIMARY" ? "Nursery & Primary" : "Secondary"} section yet.
            </div>
          )}
          {filteredClasses.map((cls) => {
            const studentCount = cls._count?.enrollments ?? 0;
            const capacity = cls.capacity ?? null;
            const capacityPercent = capacity ? Math.min(Math.round((studentCount / capacity) * 100), 100) : null;
            const isFull = capacity ? studentCount >= capacity : false;
            const isNearFull = capacity ? studentCount >= capacity * 0.85 && !isFull : false;

            const teacherName = cls.teacher
              ? `${cls.teacher.firstName} ${cls.teacher.lastName}`
              : "No teacher assigned";
            const initials = cls.teacher
              ? `${cls.teacher.firstName[0]}${cls.teacher.lastName[0]}`
              : "—";

            const divInfo = getDivisionInfo(cls.level);
            const isPrimary = divInfo.isPrimary;
            const subjectCount = cls.classSubjects?.length ?? 0;

            const accentColor = isPrimary ? "var(--color-brand-teal, #0E7D75)" : "var(--color-brand-navy, #0B2545)";
            const badgeBg = isPrimary ? "#E6F4F2" : "#E8EEF5";
            const badgeColor = isPrimary ? "#0E7D75" : "#0B2545";
            const badgeBorder = isPrimary ? "#BCE5DF" : "#C4D3E6";

            return (
              <div
                key={cls.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  padding: "20px",
                  borderRadius: "14px",
                  borderTop: `4px solid ${accentColor}`,
                  boxShadow: "0 2px 8px -2px rgba(16, 24, 40, 0.06)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  backgroundColor: "var(--color-surface, #FFFFFF)",
                }}
              >
                <div>
                  {/* Card Top: Class Name, Level & Division Badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "17.5px",
                        fontWeight: 700,
                        color: "var(--color-ink)",
                        lineHeight: 1.3,
                      }}
                    >
                      {cls.name}
                    </h2>

                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                          padding: "3px 8px",
                          borderRadius: 6,
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          border: `1px solid ${badgeBorder}`,
                        }}
                      >
                        {divInfo.label}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 6,
                          backgroundColor: "#F1F5F9",
                          color: "#334155",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        {cls.level}
                      </span>
                    </div>
                  </div>

                  {/* Stream and Academic Session Meta Tags */}
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                      marginBottom: "14px",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: accentColor, display: "inline-block" }} />
                      Session: <strong style={{ color: "var(--color-ink)" }}>{cls.academicYear || "2025/2026"}</strong>
                    </span>
                    {cls.stream && (
                      <span style={{ backgroundColor: "#F8FAFC", padding: "2px 8px", borderRadius: 4, border: "1px solid #E2E8F0" }}>
                        Stream: <strong style={{ color: "var(--color-ink)" }}>{cls.stream}</strong>
                      </span>
                    )}
                  </div>

                  {/* Class Teacher Strip */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      backgroundColor: "var(--color-surface-subtle)",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "50%",
                        backgroundColor: cls.teacher ? badgeBg : "#F1F5F9",
                        color: cls.teacher ? badgeColor : "#64748B",
                        fontWeight: 700,
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        border: `1px solid ${cls.teacher ? badgeBorder : "#CBD5E1"}`,
                      }}
                      aria-hidden="true"
                    >
                      {initials}
                    </div>
                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: "10.5px",
                          color: "var(--color-text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          fontWeight: 700,
                        }}
                      >
                        Form Master / Class Teacher
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
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
                </div>

                {/* Metrics Summary Strip: Students, Subjects, & Capacity Bar */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "10px 12px",
                    backgroundColor: "var(--color-surface-subtle)",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>Students:</span>
                      <strong style={{ color: "var(--color-ink)", fontWeight: 700 }}>
                        {studentCount} {capacity ? `/ ${capacity}` : "enrolled"}
                      </strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>Curriculum:</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: badgeColor,
                          backgroundColor: badgeBg,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: "11px",
                          border: `1px solid ${badgeBorder}`,
                        }}
                      >
                        {subjectCount} {subjectCount === 1 ? "subject" : "subjects"}
                      </span>
                    </div>
                  </div>

                  {/* Visual Capacity Progress Bar */}
                  {capacity ? (
                    <div>
                      <div
                        style={{
                          width: "100%",
                          height: 6,
                          backgroundColor: "#E2E8F0",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${capacityPercent}%`,
                            height: "100%",
                            backgroundColor: isFull ? "#DC2626" : isNearFull ? "#D97706" : accentColor,
                            borderRadius: 999,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "10.5px",
                          color: isFull ? "#DC2626" : isNearFull ? "#D97706" : "var(--color-text-secondary)",
                          marginTop: 3,
                          fontWeight: isFull || isNearFull ? 600 : 400,
                        }}
                      >
                        <span>{capacityPercent}% filled</span>
                        <span>{isFull ? "Classroom Full" : `${Math.max(0, capacity - studentCount)} seats available`}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "10.5px", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                      Open capacity (no max limit set)
                    </div>
                  )}
                </div>

                {/* Card Actions: Primary Overview & Admin Edit */}
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--color-border)",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleOpenClassOverview(cls)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      textAlign: "center",
                      justifyContent: "center",
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                    }}
                  >
                    Class Overview
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenEditModal(cls)}
                      style={{
                        padding: "8px 14px",
                        fontSize: "12.5px",
                        fontWeight: 600,
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        );
      })()}

      {/* ── SCHOOL SUBJECTS CATALOG MODAL ── */}
      {isSubjectsModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingSubject) {
              setIsSubjectsModalOpen(false);
            }
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: 660,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                  School Subjects Catalog
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
                  Curriculum subjects taught across Bright Future Academy. Classes select from this catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubjectsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 22,
                  lineHeight: 1,
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                }}
              >
                &times;
              </button>
            </div>

            {subjectSuccess && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                  backgroundColor: "var(--color-success-bg, #DCFCE7)",
                  color: "var(--color-success-text, #166534)",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                {subjectSuccess}
              </div>
            )}

            {subjectError && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                  backgroundColor: "var(--color-danger-bg)",
                  color: "var(--color-danger-text)",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                {subjectError}
              </div>
            )}

            {/* If Admin: Form to add new subject */}
            {isAdmin && (
              <form
                onSubmit={handleCreateSubject}
                style={{
                  padding: 16,
                  backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)", marginBottom: 12 }}>
                  Add New Subject to Curriculum
                </div>

                {/* Section / Division Choice */}
                <div style={{ marginBottom: 12 }}>
                  <label className="label" style={{ fontSize: 12, marginBottom: 6 }}>
                    Applicable School Section / Division *
                  </label>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="subjectSection"
                        value="ALL"
                        checked={newSubjectSection === "ALL"}
                        onChange={() => setNewSubjectSection("ALL")}
                      />
                      <span>All School (Universal)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="subjectSection"
                        value="PRIMARY"
                        checked={newSubjectSection === "PRIMARY"}
                        onChange={() => setNewSubjectSection("PRIMARY")}
                      />
                      <span style={{ color: "var(--color-brand-teal)", fontWeight: 600 }}>Nursery &amp; Primary</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="subjectSection"
                        value="SECONDARY"
                        checked={newSubjectSection === "SECONDARY"}
                        onChange={() => setNewSubjectSection("SECONDARY")}
                      />
                      <span style={{ color: "var(--color-brand-navy)", fontWeight: 600 }}>Secondary Section</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label className="label" style={{ fontSize: 12 }}>Subject Name *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Technical Drawing, Basic Science"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: 12 }}>Short Code</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. TD, BST"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                      maxLength={10}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="label" style={{ fontSize: 12 }}>Description (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Core curriculum for basic science and technology"
                    value={newSubjectDesc}
                    onChange={(e) => setNewSubjectDesc(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingSubject || !newSubjectName.trim()}
                    style={{ fontSize: 13, padding: "7px 16px" }}
                  >
                    {submittingSubject ? "Adding Subject..." : "Add Subject"}
                  </button>
                </div>
              </form>
            )}

            {/* List of existing subjects with Section Filter */}
            <div>
              {(() => {
                const primaryCount = schoolSubjects.filter(
                  (s) => getSubjectSection(s).label === "Primary" || getSubjectSection(s).label === "All Sections"
                ).length;
                const secondaryCount = schoolSubjects.filter(
                  (s) => getSubjectSection(s).label === "Secondary" || getSubjectSection(s).label === "All Sections"
                ).length;

                const filteredCatalogSubjects = schoolSubjects.filter((s) => {
                  if (subjectSectionFilter === "ALL") return true;
                  const sec = getSubjectSection(s);
                  if (subjectSectionFilter === "PRIMARY") {
                    return sec.label === "Primary" || sec.label === "All Sections";
                  }
                  if (subjectSectionFilter === "SECONDARY") {
                    return sec.label === "Secondary" || sec.label === "All Sections";
                  }
                  return true;
                });

                return (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>
                        Current Subjects ({filteredCatalogSubjects.length})
                      </span>

                      {/* Section Filter Pills */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setSubjectSectionFilter("ALL")}
                          className="btn"
                          style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            backgroundColor: subjectSectionFilter === "ALL" ? "var(--color-ink)" : "#F1F5F9",
                            color: subjectSectionFilter === "ALL" ? "#FFFFFF" : "var(--color-ink)",
                            border: "none",
                            borderRadius: 999,
                            cursor: "pointer",
                          }}
                        >
                          All ({schoolSubjects.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectSectionFilter("PRIMARY")}
                          className="btn"
                          style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            backgroundColor: subjectSectionFilter === "PRIMARY" ? "var(--color-brand-teal)" : "#E6F4F2",
                            color: subjectSectionFilter === "PRIMARY" ? "#FFFFFF" : "var(--color-brand-teal)",
                            border: "none",
                            borderRadius: 999,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Primary ({primaryCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectSectionFilter("SECONDARY")}
                          className="btn"
                          style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            backgroundColor: subjectSectionFilter === "SECONDARY" ? "var(--color-brand-navy)" : "#E8EEF5",
                            color: subjectSectionFilter === "SECONDARY" ? "#FFFFFF" : "var(--color-brand-navy)",
                            border: "none",
                            borderRadius: 999,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Secondary ({secondaryCount})
                        </button>
                      </div>
                    </div>

                    {filteredCatalogSubjects.length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                        No subjects found in this section. Add one above.
                      </div>
                    ) : (
                      <div className="table-responsive" style={{ overflowX: "auto" }}>
                        <table className="table" style={{ width: "100%", fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>Subject Name</th>
                              <th style={{ width: 90 }}>Code</th>
                              <th style={{ width: 130 }}>Section</th>
                              <th style={{ textAlign: "right", width: 100 }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredCatalogSubjects.map((sub) => {
                              const sec = getSubjectSection(sub);
                              return (
                                <tr key={sub.id}>
                                  <td>
                                    <strong style={{ color: "var(--color-ink)" }}>{sub.name}</strong>
                                    {sub.description && !sub.description.startsWith("[") && (
                                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                                        {sub.description}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <span className="pill-neutral" style={{ fontFamily: "monospace", fontSize: 11 }}>
                                      {sub.code || "—"}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        backgroundColor: sec.badgeBg,
                                        color: sec.badgeColor,
                                        border: `1px solid ${sec.badgeBorder}`,
                                      }}
                                    >
                                      {sec.label}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <span className="pill-success" style={{ fontSize: 11 }}>
                                      Active
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSubjectsModalOpen(false)}
              >
                Close Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLASS OVERVIEW & DETAILS MODAL ── */}
      {overviewClassId && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseClassOverview();
            }
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: 760,
              padding: 24,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                    {overviewClassData?.name || "Class Overview"}
                  </h2>
                  {overviewClassData?.level && (
                    <span className="pill-neutral" style={{ fontWeight: 700 }}>
                      {overviewClassData.level}
                    </span>
                  )}
                  {overviewClassData?.stream && (
                    <span className="pill-neutral">
                      {overviewClassData.stream}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
                  Academic Session: {overviewClassData?.academicYear || "2025/2026"} ·{" "}
                  Class Teacher:{" "}
                  <strong>
                    {overviewClassData?.teacher
                      ? `${overviewClassData.teacher.firstName} ${overviewClassData.teacher.lastName}`
                      : "Unassigned"}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseClassOverview}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 22,
                  lineHeight: 1,
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                }}
              >
                &times;
              </button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 8,
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: 10,
                marginBottom: 16,
              }}
            >
              <button
                type="button"
                className={overviewTab === "subjects" ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setOverviewTab("subjects")}
                style={{ fontSize: 12.5, padding: "6px 14px" }}
              >
                Assigned Subjects ({overviewClassData?.classSubjects?.length || 0})
              </button>
              <button
                type="button"
                className={overviewTab === "students" ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setOverviewTab("students")}
                style={{ fontSize: 12.5, padding: "6px 14px" }}
              >
                Enrolled Students ({overviewClassData?.enrollments?.length ?? overviewClassData?._count?.enrollments ?? 0})
              </button>
              <button
                type="button"
                className={overviewTab === "details" ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setOverviewTab("details")}
                style={{ fontSize: 12.5, padding: "6px 14px" }}
              >
                Class Details
              </button>
            </div>

            {/* TAB 1: Assigned Subjects & Teachers */}
            {overviewTab === "subjects" && (
              <div>
                {assignSuccess && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-control)",
                      backgroundColor: "var(--color-success-bg, #DCFCE7)",
                      color: "var(--color-success-text, #166534)",
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 14,
                    }}
                  >
                    {assignSuccess}
                  </div>
                )}
                {assignError && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-control)",
                      backgroundColor: "var(--color-danger-bg)",
                      color: "var(--color-danger-text)",
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 14,
                    }}
                  >
                    {assignError}
                  </div>
                )}

                {/* If Admin: Quick Assign or Create Form */}
                {isAdmin && (
                  <div
                    style={{
                      padding: 14,
                      backgroundColor: showInlineCreateSubject ? "#F0FDFA" : "var(--color-surface-subtle, #F8FAFC)",
                      borderRadius: 8,
                      border: `1px solid ${showInlineCreateSubject ? "#99F6E4" : "var(--color-border)"}`,
                      marginBottom: 16,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>
                        {showInlineCreateSubject
                          ? `Create New Subject for ${overviewClassData ? getDivisionInfo(overviewClassData.level).label : ""} Section`
                          : "Assign a Subject to this Class"}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowInlineCreateSubject((prev) => !prev);
                          setInlineSubjectError("");
                        }}
                        className="btn btn-secondary"
                        style={{
                          fontSize: "11.5px",
                          padding: "4px 10px",
                          borderColor: "var(--color-brand-teal)",
                          color: "var(--color-brand-teal)",
                          fontWeight: 600,
                        }}
                      >
                        {showInlineCreateSubject ? "Cancel New Subject" : "+ Create New Subject for this Section"}
                      </button>
                    </div>

                    {showInlineCreateSubject ? (
                      /* Inline Create & Assign Form */
                      <form onSubmit={handleInlineCreateAndAssignSubject}>
                        <p style={{ fontSize: 11.5, color: "#115E59", margin: "0 0 10px" }}>
                          This creates the subject in the curriculum tagged for the {overviewClassData ? getDivisionInfo(overviewClassData.level).label : ""} section, and immediately assigns it to {overviewClassData?.name}.
                        </p>

                        {inlineSubjectError && (
                          <div className="pill-danger" style={{ display: "block", marginBottom: 10, padding: "6px 10px", fontSize: 12 }}>
                            {inlineSubjectError}
                          </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1.2fr auto", gap: 10, alignItems: "flex-end" }}>
                          <div>
                            <label className="label" style={{ fontSize: 11.5 }}>Subject Name *</label>
                            <input
                              type="text"
                              className="input"
                              placeholder="e.g. Cultural & Creative Arts"
                              value={inlineSubjectName}
                              onChange={(e) => setInlineSubjectName(e.target.value)}
                              required
                              style={{ fontSize: 12.5 }}
                            />
                          </div>

                          <div>
                            <label className="label" style={{ fontSize: 11.5 }}>Code (Optional)</label>
                            <input
                              type="text"
                              className="input"
                              placeholder="e.g. CCA"
                              value={inlineSubjectCode}
                              onChange={(e) => setInlineSubjectCode(e.target.value)}
                              maxLength={10}
                              style={{ fontSize: 12.5 }}
                            />
                          </div>

                          <div>
                            <label className="label" style={{ fontSize: 11.5 }}>Assign Teacher</label>
                            <select
                              className="input"
                              style={{ fontSize: 12.5 }}
                              value={inlineSubjectTeacherId}
                              onChange={(e) => setInlineSubjectTeacherId(e.target.value)}
                            >
                              <option value="">-- Unassigned --</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.firstName} {t.lastName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={inlineCreatingSubject || !inlineSubjectName.trim()}
                            style={{ fontSize: 12.5, padding: "8px 14px", whiteSpace: "nowrap" }}
                          >
                            {inlineCreatingSubject ? "Creating..." : "Create & Assign"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Standard Assign Existing Subject Form */
                      <form onSubmit={handleAssignSubjectInOverview}>
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr auto", gap: 10, alignItems: "flex-end" }}>
                          <div>
                            <label className="label" style={{ fontSize: 11.5 }}>Select Subject *</label>
                            <select
                              className="input"
                              style={{ fontSize: 12.5 }}
                              value={assignSubjectId}
                              onChange={(e) => setAssignSubjectId(e.target.value)}
                              required
                            >
                              <option value="">-- Choose Subject --</option>
                              {schoolSubjects
                                .filter(
                                  (s) =>
                                    !overviewClassData?.classSubjects?.some(
                                      (cs) => cs.subjectId === s.id || cs.subject?.id === s.id
                                    )
                                )
                                .map((s) => {
                                  const sec = getSubjectSection(s);
                                  return (
                                    <option key={s.id} value={s.id}>
                                      {s.name} {s.code ? `(${s.code})` : ""} · [{sec.label}]
                                    </option>
                                  );
                                })}
                            </select>
                          </div>

                          <div>
                            <label className="label" style={{ fontSize: 11.5 }}>Assign Subject Teacher</label>
                            <select
                              className="input"
                              style={{ fontSize: 12.5 }}
                              value={assignTeacherId}
                              onChange={(e) => setAssignTeacherId(e.target.value)}
                            >
                              <option value="">-- Unassigned (Set Later) --</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.firstName} {t.lastName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={assigningSubject || !assignSubjectId}
                            style={{ fontSize: 12.5, padding: "8px 16px", whiteSpace: "nowrap" }}
                          >
                            {assigningSubject ? "Assigning..." : "Assign Subject"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Table of Assigned Subjects */}
                {overviewClassData?.classSubjects && overviewClassData.classSubjects.length > 0 ? (
                  <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table" style={{ width: "100%", fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th style={{ width: 80 }}>Code</th>
                          <th>Assigned Teacher</th>
                          {isAdmin && <th style={{ textAlign: "right", width: 100 }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {overviewClassData.classSubjects.map((cs) => (
                          <tr key={cs.id}>
                            <td>
                              <strong style={{ color: "var(--color-ink)" }}>
                                {cs.subject.name}
                              </strong>
                            </td>
                            <td>
                              <span className="pill-neutral" style={{ fontFamily: "monospace", fontSize: 11 }}>
                                {cs.subject.code || "—"}
                              </span>
                            </td>
                            <td>
                              {isAdmin ? (
                                <select
                                  value={cs.teacherId || cs.teacher?.id || ""}
                                  onChange={(e) =>
                                    handleUpdateTeacherInOverview(cs.subjectId, e.target.value)
                                  }
                                  className="input"
                                  style={{ padding: "4px 8px", fontSize: 12, height: "auto" }}
                                >
                                  <option value="">-- Unassigned --</option>
                                  {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.firstName} {t.lastName}
                                    </option>
                                  ))}
                                </select>
                              ) : cs.teacher ? (
                                <span>{cs.teacher.firstName} {cs.teacher.lastName}</span>
                              ) : (
                                <span style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                                  Unassigned
                                </span>
                              )}
                            </td>
                            {isAdmin && (
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubjectInOverview(cs.subjectId)}
                                  style={{
                                    border: "1px solid var(--color-danger-border, #FECACA)",
                                    backgroundColor: "var(--color-danger-bg, #FEF2F2)",
                                    color: "var(--color-danger-text, #991B1B)",
                                    padding: "3px 8px",
                                    borderRadius: 4,
                                    fontSize: 11,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                >
                                  Remove
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                    No subjects assigned to this class yet. Use the form above to assign subjects.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Enrolled Students Roster */}
            {overviewTab === "students" && (
              <div>
                {overviewLoading ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>
                    Loading student roster...
                  </div>
                ) : overviewClassData?.enrollments && overviewClassData.enrollments.length > 0 ? (
                  <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table" style={{ width: "100%", fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 44 }}>#</th>
                          <th>Student Name</th>
                          <th>Admission No</th>
                          <th>Gender</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overviewClassData.enrollments.map((enr, idx) => (
                          <tr key={enr.id}>
                            <td style={{ color: "var(--color-text-secondary)" }}>{idx + 1}</td>
                            <td>
                              <strong style={{ color: "var(--color-ink)" }}>
                                {enr.student.firstName} {enr.student.lastName}
                              </strong>
                            </td>
                            <td>
                              <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                                {enr.student.admissionNumber || "—"}
                              </span>
                            </td>
                            <td>
                              <span className="pill-neutral" style={{ fontSize: 11 }}>
                                {enr.student.gender}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <Link
                                href={`/students/${enr.student.id}`}
                                style={{
                                  fontSize: 12,
                                  color: "var(--color-brand-teal, #0E7D75)",
                                  fontWeight: 600,
                                  textDecoration: "underline",
                                }}
                              >
                                View Profile
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                    No active students enrolled in this class for the active session.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Class Details & Timetable Shortcut */}
            {overviewTab === "details" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ padding: 12, backgroundColor: "var(--color-surface-subtle)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
                      Class Section Name
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", marginTop: 4 }}>
                      {overviewClassData?.name}
                    </div>
                  </div>

                  <div style={{ padding: 12, backgroundColor: "var(--color-surface-subtle)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
                      Academic Level / Stream
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", marginTop: 4 }}>
                      {overviewClassData?.level} {overviewClassData?.stream ? `(${overviewClassData.stream})` : ""}
                    </div>
                  </div>

                  <div style={{ padding: 12, backgroundColor: "var(--color-surface-subtle)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
                      Classroom Capacity
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", marginTop: 4 }}>
                      {overviewClassData?.capacity ? `${overviewClassData.capacity} students max` : "Unspecified"}
                    </div>
                  </div>

                  <div style={{ padding: 12, backgroundColor: "var(--color-surface-subtle)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
                      Assigned Class Teacher
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", marginTop: 4 }}>
                      {overviewClassData?.teacher ? `${overviewClassData.teacher.firstName} ${overviewClassData.teacher.lastName}` : "No teacher assigned"}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 8, padding: 14, border: "1px solid var(--color-border)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>
                      Class Timetable Routine
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      View or edit scheduled weekly periods for {overviewClassData?.name}.
                    </div>
                  </div>
                  <Link href="/timetable" className="btn btn-secondary" style={{ fontSize: 12 }}>
                    Open Timetable
                  </Link>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseClassOverview}
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE A CLASS ── */}
      {isModalOpen && isAdmin && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: "560px",
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
                  Create a class
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                  }}
                >
                  Add a new class section to organize students.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                  padding: "4px",
                  fontSize: "18px",
                  lineHeight: 1,
                }}
                aria-label="Close modal"
              >
                &times;
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
                }}
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateClass}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <label className="label" htmlFor="class-name">
                    Class Name *
                  </label>
                  <input
                    id="class-name"
                    className="input"
                    type="text"
                    placeholder="e.g. Primary 4A, JSS 1 Gold"
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    required
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label className="label" htmlFor="class-level">
                      Level *
                    </label>
                    <input
                      id="class-level"
                      className="input"
                      type="text"
                      placeholder="e.g. Primary 4, JSS 1"
                      value={levelInput}
                      onChange={(e) => setLevelInput(e.target.value)}
                      required
                    />
                    {/* Quick Presets */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {["Nursery 1", "Nursery 2", "Primary 1", "Primary 4", "JSS 1", "JSS 3", "SSS 1", "SSS 3"].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setLevelInput(lvl)}
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            border: "1px solid var(--color-border, #E8ECE9)",
                            backgroundColor: levelInput === lvl ? "var(--color-brand-navy, #0B2545)" : "var(--color-surface-subtle)",
                            color: levelInput === lvl ? "#FFFFFF" : "var(--color-text-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="academic-year">
                      Academic Year *
                    </label>
                    <input
                      id="academic-year"
                      className="input"
                      type="text"
                      placeholder="e.g. 2025/2026"
                      value={academicYearInput}
                      onChange={(e) => setAcademicYearInput(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label className="label" htmlFor="class-stream">
                      Stream (optional)
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
                      Capacity (optional)
                    </label>
                    <input
                      id="class-capacity"
                      className="input"
                      type="number"
                      min="1"
                      placeholder="e.g. 35"
                      value={capacityInput}
                      onChange={(e) => setCapacityInput(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="class-teacher">
                    Class Teacher (optional)
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

                {/* Per-Subject Teacher Assignments (Optional during creation) */}
                {schoolSubjects.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid var(--color-border)",
                      paddingTop: "12px",
                      marginTop: "4px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: 6 }}>
                      <label className="label" style={{ margin: 0, fontWeight: 700, color: "var(--color-ink)" }}>
                        Assign Subject Teachers (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsSubjectsModalOpen(true)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-brand-teal)",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        + Add New Subject to Catalog
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        maxHeight: "180px",
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}
                    >
                      {schoolSubjects.map((sub) => {
                        const sec = getSubjectSection(sub);
                        return (
                        <div
                          key={sub.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            fontSize: "12px",
                            padding: "4px 8px",
                            backgroundColor: "var(--color-surface-subtle)",
                            borderRadius: "var(--radius-control)",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", minWidth: "130px" }}>
                            <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                              {sub.name} {sub.code ? `(${sub.code})` : ""}
                            </span>
                            <span style={{ fontSize: "10px", color: sec.badgeColor }}>
                              {sec.label}
                            </span>
                          </div>
                          <select
                            className="input"
                            style={{ padding: "4px 8px", fontSize: "12px", flex: 1, height: "auto" }}
                            value={createSubjectTeachers[sub.id] || ""}
                            onChange={(e) =>
                              setCreateSubjectTeachers((prev) => ({
                                ...prev,
                                [sub.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">-- No Teacher Assigned --</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.firstName} {t.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                        );
                      })}
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
                    {submitting ? "Creating class..." : "Create class"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT A CLASS ── */}
      {isEditModalOpen && isAdmin && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseEditModal();
            }
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: "560px",
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
                  Edit / Amend Class
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                  }}
                >
                  Update class information and assigned teachers.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                  padding: "4px",
                  fontSize: "18px",
                  lineHeight: 1,
                }}
                aria-label="Close modal"
              >
                &times;
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
                }}
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleEditClass}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <label className="label" htmlFor="edit-class-name">
                    Class Name *
                  </label>
                  <input
                    id="edit-class-name"
                    className="input"
                    type="text"
                    placeholder="e.g. Primary 4A, JSS 1 Gold"
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    required
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label className="label" htmlFor="edit-class-level">
                      Level *
                    </label>
                    <input
                      id="edit-class-level"
                      className="input"
                      type="text"
                      placeholder="e.g. Primary 4, JSS 1"
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
                      placeholder="e.g. 2025/2026"
                      value={editAcademicYear}
                      onChange={(e) => setEditAcademicYear(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label className="label" htmlFor="edit-class-stream">
                      Stream (optional)
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
                      Capacity (optional)
                    </label>
                    <input
                      id="edit-class-capacity"
                      className="input"
                      type="number"
                      min="1"
                      placeholder="e.g. 35"
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="edit-class-teacher">
                    Class Teacher (optional)
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

                {/* Per-Subject Teacher Assignments */}
                {schoolSubjects.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid var(--color-border)",
                      paddingTop: "12px",
                      marginTop: "4px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label className="label" style={{ margin: 0, fontWeight: 700, color: "var(--color-ink)" }}>
                        Subject Teachers Assignment
                      </label>
                      <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                        Assign teachers to specific subjects
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        maxHeight: "180px",
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}
                    >
                      {schoolSubjects.map((sub) => {
                        const sec = getSubjectSection(sub);
                        return (
                          <div
                            key={sub.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                              fontSize: "12px",
                              padding: "4px 8px",
                              backgroundColor: "var(--color-surface-subtle)",
                              borderRadius: "var(--radius-control)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "160px" }}>
                              <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                                {sub.name} {sub.code ? `(${sub.code})` : ""}
                              </span>
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  backgroundColor: sec.badgeBg,
                                  color: sec.badgeColor,
                                  border: `1px solid ${sec.badgeBorder}`,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {sec.label}
                              </span>
                            </div>
                            <select
                              className="input"
                              style={{ padding: "4px 8px", fontSize: "12px", flex: 1, height: "auto" }}
                              value={editSubjectTeachers[sub.id] || ""}
                              onChange={(e) =>
                                setEditSubjectTeachers((prev) => ({
                                  ...prev,
                                  [sub.id]: e.target.value,
                                }))
                              }
                            >
                              <option value="">-- No Teacher Assigned --</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.firstName} {t.lastName}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
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
                    {editSubmitting ? "Saving..." : "Save changes"}
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
