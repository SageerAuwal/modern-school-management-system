"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Bus {
  id: string;
  name: string;
  plateNumber: string;
  capacity: number;
  driverName: string;
  driverPhone: string | null;
  assignedStudents: number;
  occupancyPercent: number;
  routes: Array<{ id: string; name: string }>;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function TransportPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/v1/transport/buses`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBuses(data); else setError(data.message ?? "Failed"); })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  const totalCapacity = buses.reduce((s, b) => s + b.capacity, 0);
  const totalAssigned = buses.reduce((s, b) => s + b.assignedStudents, 0);

  function occupancyColor(pct: number) {
    if (pct >= 90) return "#991b1b";
    if (pct >= 70) return "#854d0e";
    return "#166534";
  }

  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>Transport</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{buses.length} buses · {totalAssigned} of {totalCapacity} seats filled</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/transport/routes"
            style={{ padding: "9px 16px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 13, textDecoration: "none", color: "var(--color-ink)", backgroundColor: "var(--color-surface)" }}>
            Routes
          </Link>
          <Link href="/transport/new"
            style={{ padding: "9px 16px", backgroundColor: "var(--color-ink)", color: "#fff", borderRadius: "var(--radius-control)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
            + Add Bus
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Buses", value: buses.length, bg: "#f0f9ff" },
          { label: "Total Capacity", value: totalCapacity, bg: "#f8fafc" },
          { label: "Assigned", value: totalAssigned, bg: "#f0fdf4" },
          { label: "Available Seats", value: totalCapacity - totalAssigned, bg: "#fef9c3" },
        ].map((c) => (
          <div key={c.label} className="card" style={{ backgroundColor: c.bg }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 4 }}>{c.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {error && <div className="pill-danger" style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {loading && <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}

      {/* Bus list */}
      {!loading && !error && (
        buses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--color-text-secondary)", fontSize: 14 }}>
            No buses registered. <Link href="/transport/new" style={{ color: "var(--color-ink)", fontWeight: 500 }}>Add the first bus.</Link>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                  {["Bus", "Plate No.", "Driver", "Capacity", "Occupancy", "Routes", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buses.map((bus) => (
                  <tr key={bus.id} style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 14 }}>{bus.name}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "monospace" }}>{bus.plateNumber}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <p style={{ fontSize: 13, margin: 0 }}>{bus.driverName}</p>
                      {bus.driverPhone && <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>{bus.driverPhone}</p>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13 }}>{bus.assignedStudents} / {bus.capacity}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden", minWidth: 60 }}>
                          <div style={{ width: `${bus.occupancyPercent}%`, height: "100%", backgroundColor: occupancyColor(bus.occupancyPercent), borderRadius: 999, transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: occupancyColor(bus.occupancyPercent), minWidth: 32 }}>{bus.occupancyPercent}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {bus.routes.length > 0 ? bus.routes.map((r) => r.name).join(", ") : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Link href={`/transport/${bus.id}`} style={{ fontSize: 13, color: "var(--color-ink)", textDecoration: "none", fontWeight: 500 }}>View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  );
}
