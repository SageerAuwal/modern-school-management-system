"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Enrollment {
  classSection: {
    id: string;
    name: string;
    level: string;
  };
  academicYear: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  gender: string | null;
  enrollmentStatus: string;
  enrollments: Enrollment[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.trim().charAt(0) ?? "";
  const last = lastName?.trim().charAt(0) ?? "";
  return (first + last).toUpperCase() || "—";
}

function getStatusPillClass(status: string): string {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "pill-success";
    case "WITHDRAWN":
      return "pill-danger";
    case "TRANSFERRED":
      return "pill-warning";
    case "GRADUATED":
      return "pill-neutral";
    default:
      return "pill-neutral";
  }
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }

    const query = params.toString() ? `?${params.toString()}` : "";

    fetch(`${API}/api/v1/students${query}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load students");
        }
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          if (Array.isArray(data)) {
            setStudents(data);
            setError("");
          } else {
            setError(data.message ?? "Failed to load students");
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message ?? "Failed to load students");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [search]);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">
            {students.length} {students.length === 1 ? "student" : "students"}
          </p>
        </div>
        <Link href="/students/new" className="btn btn-primary">
          Add a student
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, maxWidth: 380 }}>
        <input
          type="search"
          className="input"
          placeholder="Search by name or admission number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="pill-danger"
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginBottom: 16,
            padding: "8px 14px",
            borderRadius: "var(--radius-control)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>Avatar</th>
                <th>Name</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td style={{ width: 48 }}>
                    <div
                      className="skeleton"
                      style={{ width: 34, height: 34, borderRadius: "50%" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 16, width: "65%" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 16, width: "45%" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 16, width: "50%" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{
                        height: 20,
                        width: 72,
                        borderRadius: "var(--radius-pill-badge)",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : students.length === 0 ? (
        /* Empty State */
        <div className="card empty-state">
          <div
            className="empty-state-icon"
            style={{ display: "inline-flex", justifyContent: "center" }}
          >
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 className="empty-state-title">No students yet</h3>
          <p className="empty-state-text">
            Add your first student to start tracking enrollment.
          </p>
          <Link href="/students/new" className="btn btn-primary">
            Add a student
          </Link>
        </div>
      ) : (
        /* Students Table */
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>Avatar</th>
                <th>Name</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const currentClass = student.enrollments?.[0]?.classSection?.name;
                return (
                  <tr
                    key={student.id}
                    onClick={() => router.push(`/students/${student.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ width: 48 }}>
                      <div className="avatar">
                        {getInitials(student.firstName, student.lastName)}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                      <Link
                        href={`/students/${student.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {student.firstName} {student.lastName}
                      </Link>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {student.admissionNumber ?? "—"}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {currentClass ?? "—"}
                    </td>
                    <td>
                      <span
                        className={getStatusPillClass(student.enrollmentStatus)}
                      >
                        {student.enrollmentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
