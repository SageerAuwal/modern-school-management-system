"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  status: AttendanceStatus | null;
  recordId: string | null;
  note: string | null;
}

interface ClassRoster {
  classSection: { id: string; name: string; level: string };
  date: string;
  totalStudents: number;
  markedCount: number;
  roster: Student[];
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "P",
  ABSENT: "A",
  LATE: "L",
  EXCUSED: "E",
};

const STATUS_STYLES: Record<AttendanceStatus, { bg: string; color: string }> = {
  PRESENT:  { bg: "#dcfce7", color: "#166534" },
  ABSENT:   { bg: "#fee2e2", color: "#991b1b" },
  LATE:     { bg: "#fef9c3", color: "#854d0e" },
  EXCUSED:  { bg: "#e0f2fe", color: "#075985" },
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function MarkAttendanceInner() {
  const searchParams = useSearchParams();
  const classSectionId = searchParams.get("classId") ?? "";
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!classSectionId) return;
    setLoading(true);
    setError("");
    fetch(`${API}/api/v1/attendance/class/${classSectionId}?date=${date}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: ClassRoster) => {
        setRoster(data);
        // Pre-fill from existing records
        const pre: Record<string, AttendanceStatus> = {};
        data.roster.forEach((s) => { if (s.status) pre[s.id] = s.status as AttendanceStatus; });
        setAttendance(pre);
      })
      .catch(() => setError("Failed to load class roster"))
      .finally(() => setLoading(false));
  }, [classSectionId, date]);

  const markAll = (status: AttendanceStatus) => {
    if (!roster) return;
    const all: Record<string, AttendanceStatus> = {};
    roster.roster.forEach((s) => { all[s.id] = status; });
    setAttendance(all);
  };

  const toggle = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (!roster || !classSectionId) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const entries = Object.entries(attendance).map(([studentId, status]) => ({ studentId, status }));
      if (entries.length === 0) { setError("No attendance marked yet"); setSaving(false); return; }
      const res = await fetch(`${API}/api/v1/attendance/mark`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classSectionId, date, entries }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Failed to save"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  if (!classSectionId) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--color-text-secondary)" }}>
        No class selected. Please navigate here from the Classes page.
      </div>
    );
  }

  const markedCount = Object.keys(attendance).length;
  const totalStudents = roster?.totalStudents ?? 0;

  return (
    <div>
      {/* Date picker + class info */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        {roster && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{roster.classSection.name}</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{roster.totalStudents} students enrolled</p>
          </div>
        )}
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ marginLeft: "auto", padding: "8px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, backgroundColor: "var(--color-surface)", color: "var(--color-ink)", outline: "none" }} />
      </div>

      {/* Quick-mark all */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", alignSelf: "center" }}>Mark all:</span>
        {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((s) => (
          <button key={s} onClick={() => markAll(s)}
            style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", cursor: "pointer", backgroundColor: STATUS_STYLES[s].bg, color: STATUS_STYLES[s].color }}>
            {s}
          </button>
        ))}
      </div>

      {error && <div className="pill-danger" style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {saved && <div className="pill-success" style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>✓ Attendance saved!</div>}

      {loading ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading roster…</p>
      ) : roster && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                {["#", "Name", "Adm. No.", "P", "A", "L", "E"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.roster.map((s, i) => {
                const current = attendance[s.id];
                return (
                  <tr key={s.id} style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>{i + 1}</td>
                    <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 500 }}>{s.firstName} {s.lastName}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{s.admissionNumber ?? "—"}</td>
                    {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((status) => (
                      <td key={status} style={{ padding: "10px 14px" }}>
                        <button onClick={() => toggle(s.id, status)}
                          style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.1s",
                            backgroundColor: current === status ? STATUS_STYLES[status].bg : "transparent",
                            borderColor: current === status ? STATUS_STYLES[status].color : "var(--color-border)",
                            color: current === status ? STATUS_STYLES[status].color : "var(--color-text-secondary)" }}>
                          {STATUS_LABELS[status]}
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {roster && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            {markedCount} of {totalStudents} marked
          </p>
          <button onClick={handleSubmit} disabled={saving || markedCount === 0}
            style={{ padding: "10px 28px", backgroundColor: (saving || markedCount === 0) ? "#6b7280" : "var(--color-ink)", color: "#fff", border: "none", borderRadius: "var(--radius-control)", fontSize: 14, fontWeight: 500, cursor: (saving || markedCount === 0) ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>Mark Attendance</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Select a date and mark each student</p>
      </div>
      <Suspense fallback={<p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}>
        <MarkAttendanceInner />
      </Suspense>
    </main>
  );
}
