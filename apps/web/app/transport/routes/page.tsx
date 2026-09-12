"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stop { id: string; stopName: string; stopOrder: number; landmark: string | null; pickupTime: string | null }
interface Route {
  id: string;
  name: string;
  description: string | null;
  bus: { id: string; name: string; plateNumber: string; driverName: string };
  stops: Stop[];
  _count: { studentAssignments: number };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/v1/transport/routes`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setRoutes(data); else setError(data.message ?? "Failed"); })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>Routes</h1>
          <Link href="/transport" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Back to Fleet</Link>
        </div>
        <Link href="/transport/routes/new"
          style={{ padding: "9px 16px", backgroundColor: "var(--color-ink)", color: "#fff", borderRadius: "var(--radius-control)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
          + Add Route
        </Link>
      </div>

      {error && <div className="pill-danger" style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {loading && <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}

      {!loading && !error && routes.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--color-text-secondary)", fontSize: 14 }}>
          No routes yet. <Link href="/transport/routes/new" style={{ color: "var(--color-ink)", fontWeight: 500 }}>Create the first route.</Link>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {routes.map((route) => {
          const open = expanded === route.id;
          return (
            <div key={route.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Route header */}
              <button onClick={() => setExpanded(open ? null : route.id)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>{route.name}</p>
                    {route.description && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{route.description}</p>}
                  </div>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, backgroundColor: "#f0f9ff", color: "#075985", fontWeight: 600 }}>
                    🚌 {route.bus.name} · {route.bus.plateNumber}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                    {route._count.studentAssignments} student{route._count.studentAssignments !== 1 ? "s" : ""}
                  </span>
                </div>
                <span style={{ fontSize: 18, color: "var(--color-text-secondary)", marginLeft: 12, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
              </button>

              {/* Stops — expand on click */}
              {open && (
                <div style={{ borderTop: "var(--border-width) solid var(--color-border)", padding: "0 18px 16px" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", margin: "14px 0 10px" }}>
                    Stops ({route.stops.length})
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {route.stops.map((stop, i) => (
                      <div key={stop.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: i < route.stops.length - 1 ? 10 : 0 }}>
                        {/* Timeline dot + line */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginTop: 3 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: i === 0 ? "#166534" : i === route.stops.length - 1 ? "#991b1b" : "var(--color-ink)", flexShrink: 0 }} />
                          {i < route.stops.length - 1 && <div style={{ width: 2, height: 24, backgroundColor: "var(--color-border)" }} />}
                        </div>
                        <div style={{ paddingBottom: i < route.stops.length - 1 ? 4 : 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: "var(--color-ink)" }}>
                            {stop.stopOrder}. {stop.stopName}
                            {stop.pickupTime && <span style={{ fontSize: 11, color: "#075985", fontWeight: 400, marginLeft: 8 }}>⏱ {stop.pickupTime}</span>}
                          </p>
                          {stop.landmark && <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>📍 {stop.landmark}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>Driver: <strong>{route.bus.driverName}</strong></p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
