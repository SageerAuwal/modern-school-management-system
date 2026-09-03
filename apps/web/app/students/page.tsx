"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  gender: string | null;
  enrollmentStatus: string;
  enrollments: Array<{
    classSection: { id: string; name: string; level: string };
    academicYear: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "pill-success",
  WITHDRAWN: "pill-danger",
  TRANSFERRED: "pill-warning",
  GRADUATED: "pill-neutral",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/v1/students?${params}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStudents(data);
        else setError(data.message ?? "Failed to load students");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>
            Students
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            {students.length} student{students.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/students/new"
          style={{
            padding: "9px 18px",
            backgroundColor: "var(--color-ink)",
            color: "#fff",
            borderRadius: "var(--radius-control)",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          + Add Student
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="search"
          placeholder="Search by name or admission number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "9px 12px",
            border: "var(--border-width) solid var(--color-border)",
            borderRadius: "var(--radius-control)",
            fontSize: 14,
            backgroundColor: "var(--color-surface)",
            color: "var(--color-ink)",
            outline: "none",
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="pill-danger" style={{ display: "inline-block", marginBottom: 16, padding: "8px 14px", borderRadius: "var(--radius-control)" }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading…</p>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {students.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
              No students found. <Link href="/students/new" style={{ color: "var(--color-ink)", fontWeight: 500 }}>Add the first one.</Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                  {["Name", "Admission No.", "Class", "Gender", "Status"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const currentClass = s.enrollments?.[0]?.classSection;
                  return (
                    <tr
                      key={s.id}
                      className="list-row"
                      style={{ borderBottom: "var(--border-width) solid var(--color-border)", cursor: "pointer" }}
                      onClick={() => { window.location.href = `/students/${s.id}`; }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "var(--color-ink)" }}>
                        {s.firstName} {s.lastName}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                        {s.admissionNumber ?? "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                        {currentClass ? `${currentClass.name}` : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                        {s.gender ?? "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className={STATUS_COLORS[s.enrollmentStatus] ?? "pill-neutral"} style={{ fontSize: 11 }}>
                          {s.enrollmentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}
