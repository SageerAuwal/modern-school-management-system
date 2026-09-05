"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
}

interface ScoreRow {
  studentId: string;
  ca1: string; ca2: string; ca3: string; exam: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function parseNum(v: string): number | undefined {
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

function computeTotal(row: ScoreRow): number {
  return (parseNum(row.ca1) ?? 0) + (parseNum(row.ca2) ?? 0) +
         (parseNum(row.ca3) ?? 0) + (parseNum(row.exam) ?? 0);
}

function gradeLabel(total: number): { grade: string; color: string } {
  if (total >= 70) return { grade: 'A', color: '#166534' };
  if (total >= 60) return { grade: 'B', color: '#075985' };
  if (total >= 50) return { grade: 'C', color: '#854d0e' };
  if (total >= 45) return { grade: 'D', color: '#6b21a8' };
  if (total >= 40) return { grade: 'E', color: '#9a3412' };
  return { grade: 'F', color: '#991b1b' };
}

function ScoreEntryInner() {
  const searchParams = useSearchParams();
  const classSectionId = searchParams.get("classId") ?? "";
  const subjectId = searchParams.get("subjectId") ?? "";
  const termId = searchParams.get("termId") ?? "";
  const academicYear = searchParams.get("year") ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Record<string, ScoreRow>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!classSectionId || !subjectId || !termId) return;
    setLoading(true);
    fetch(`${API}/api/v1/scores/sheet/${classSectionId}/${subjectId}?termId=${termId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list: Student[] = data.sheet?.map((s: { student: Student }) => s.student) ?? [];
        setStudents(list);
        // Pre-fill existing scores
        const pre: Record<string, ScoreRow> = {};
        data.sheet?.forEach(({ student, score }: { student: Student; score: ScoreRow | null }) => {
          pre[student.id] = {
            studentId: student.id,
            ca1: score?.ca1?.toString() ?? "",
            ca2: score?.ca2?.toString() ?? "",
            ca3: score?.ca3?.toString() ?? "",
            exam: score?.exam?.toString() ?? "",
          };
        });
        setRows(pre);
      })
      .catch(() => setError("Failed to load score sheet"))
      .finally(() => setLoading(false));
  }, [classSectionId, subjectId, termId]);

  const setCell = (studentId: string, field: keyof ScoreRow, value: string) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], studentId, [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError("");
    const entries = Object.values(rows).map((r) => ({
      studentId: r.studentId,
      ca1: parseNum(r.ca1), ca2: parseNum(r.ca2), ca3: parseNum(r.ca3), exam: parseNum(r.exam),
    }));
    try {
      const res = await fetch(`${API}/api/v1/scores/bulk`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classSectionId, subjectId, termId, academicYear, entries }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Failed to save"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  if (!classSectionId || !subjectId || !termId) {
    return <p style={{ color: "var(--color-text-secondary)", padding: 24 }}>Missing parameters. Navigate here from the Classes view.</p>;
  }

  return (
    <div>
      {error && <div className="pill-danger" style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {saved && <div className="pill-success" style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>✓ Scores saved!</div>}

      {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p> : (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                {["#", "Student", "Adm. No.", "CA1", "CA2", "CA3", "Exam", "Total", "Grade"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const row = rows[s.id] ?? { studentId: s.id, ca1: "", ca2: "", ca3: "", exam: "" };
                const total = computeTotal(row);
                const hasScore = total > 0;
                const { grade, color } = hasScore ? gradeLabel(total) : { grade: "—", color: "var(--color-text-secondary)" };

                const inputStyle = {
                  width: 52, padding: "6px 8px", border: "var(--border-width) solid var(--color-border)",
                  borderRadius: "var(--radius-control)", fontSize: 13, textAlign: "center" as const,
                  backgroundColor: "var(--color-surface)", color: "var(--color-ink)", outline: "none",
                };
                return (
                  <tr key={s.id} style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-secondary)" }}>{i + 1}</td>
                    <td style={{ padding: "8px 12px", fontSize: 14, fontWeight: 500 }}>{s.firstName} {s.lastName}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{s.admissionNumber ?? "—"}</td>
                    {(["ca1", "ca2", "ca3", "exam"] as const).map((field) => (
                      <td key={field} style={{ padding: "8px 6px" }}>
                        <input type="number" min={0} max={100} value={row[field]}
                          onChange={(e) => setCell(s.id, field, e.target.value)}
                          style={inputStyle} />
                      </td>
                    ))}
                    <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 14 }}>{hasScore ? total : "—"}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: 14, color }}>{grade}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {students.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "10px 28px", backgroundColor: saving ? "#6b7280" : "var(--color-ink)", color: "#fff", border: "none", borderRadius: "var(--radius-control)", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save Scores"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function GradesPage() {
  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>Score Entry</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>CA1 + CA2 + CA3 + Exam — grades are computed automatically</p>
      </div>
      <Suspense fallback={<p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}>
        <ScoreEntryInner />
      </Suspense>
    </main>
  );
}
