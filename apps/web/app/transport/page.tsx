"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RouteItem {
  id: string;
  name: string;
}

interface Bus {
  id: string;
  name: string;
  plateNumber: string;
  capacity: number;
  driverName: string;
  driverPhone: string | null;
  assignedStudents: number;
  occupancyPercent: number;
  routes: RouteItem[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getOccupancyColor(pct: number): string {
  if (pct >= 90) {
    return "var(--color-danger-text)";
  }
  if (pct >= 70) {
    return "var(--color-warning-text)";
  }
  return "var(--color-success-text)";
}

export default function TransportPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    fetch(`${API}/api/v1/transport/buses`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load transport fleet");
        }
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          if (Array.isArray(data)) {
            setBuses(data);
            setError("");
          } else {
            setError(data.message ?? "Failed to load transport fleet");
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message ?? "Failed to load transport fleet");
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
  }, []);

  const totalBuses = buses.length;
  const totalCapacity = buses.reduce((acc, b) => acc + (b.capacity || 0), 0);
  const totalAssigned = buses.reduce((acc, b) => acc + (b.assignedStudents || 0), 0);
  const availableSeats = Math.max(0, totalCapacity - totalAssigned);

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transport</h1>
          <p className="page-subtitle">
            {totalBuses} {totalBuses === 1 ? "bus" : "buses"}, {totalAssigned} of {totalCapacity} seats filled
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/transport/routes" className="btn btn-secondary">
            View routes
          </Link>
          <Link href="/transport/new" className="btn btn-primary">
            Add a bus
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="card">
          <div className="stat-label">Total Buses</div>
          <div className="stat-value">{loading ? "—" : totalBuses}</div>
        </div>
        <div className="card">
          <div className="stat-label">Total Capacity</div>
          <div className="stat-value">{loading ? "—" : totalCapacity}</div>
        </div>
        <div className="card">
          <div className="stat-label">Assigned Students</div>
          <div className="stat-value">{loading ? "—" : totalAssigned}</div>
        </div>
        <div className="card">
          <div className="stat-label">Available Seats</div>
          <div className="stat-value">{loading ? "—" : availableSeats}</div>
        </div>
      </div>

      {/* Error Notification */}
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

      {/* Table / Skeleton / Empty State */}
      {loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Bus Name</th>
                <th>Plate No</th>
                <th>Driver</th>
                <th>Capacity</th>
                <th>Occupancy</th>
                <th>Routes</th>
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, index) => (
                <tr key={index}>
                  <td>
                    <div className="skeleton" style={{ height: 16, width: "70%" }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 16, width: "60%" }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 16, width: "65%", marginBottom: 4 }} />
                    <div className="skeleton" style={{ height: 12, width: "45%" }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 16, width: "50%" }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 16, width: "80%" }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ height: 16, width: "75%" }} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="skeleton" style={{ height: 16, width: 40, marginLeft: "auto" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : buses.length === 0 ? (
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
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M3 10h18" />
              <circle cx="7" cy="15" r="1" />
              <circle cx="17" cy="15" r="1" />
              <path d="M5 18v3" />
              <path d="M19 18v3" />
            </svg>
          </div>
          <h3 className="empty-state-title">No buses registered</h3>
          <p className="empty-state-text">
            Add your first bus to manage school transport.
          </p>
          <div>
            <Link href="/transport/new" className="btn btn-primary">
              Add a bus
            </Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Bus Name</th>
                <th>Plate No</th>
                <th>Driver</th>
                <th>Capacity</th>
                <th>Occupancy</th>
                <th>Routes</th>
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus) => {
                const occupancy = bus.occupancyPercent ?? 0;
                return (
                  <tr key={bus.id}>
                    <td style={{ fontWeight: 600 }}>{bus.name}</td>
                    <td style={{ fontFamily: "monospace" }}>{bus.plateNumber}</td>
                    <td>
                      <div>{bus.driverName}</div>
                      {bus.driverPhone && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            marginTop: 2,
                          }}
                        >
                          {bus.driverPhone}
                        </div>
                      )}
                    </td>
                    <td>
                      {bus.assignedStudents} / {bus.capacity}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            backgroundColor: "var(--color-neutral-bg)",
                            borderRadius: "var(--radius-pill)",
                            overflow: "hidden",
                            minWidth: 60,
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, occupancy))}%`,
                              height: "100%",
                              backgroundColor: getOccupancyColor(occupancy),
                              borderRadius: "var(--radius-pill)",
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: getOccupancyColor(occupancy),
                            minWidth: 36,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {occupancy}%
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        color:
                          bus.routes && bus.routes.length > 0
                            ? "var(--color-ink)"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {bus.routes && bus.routes.length > 0
                        ? bus.routes.map((r) => r.name).join(", ")
                        : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/transport/${bus.id}`}
                        style={{
                          fontSize: 13,
                          color: "var(--color-ink)",
                          fontWeight: 500,
                        }}
                      >
                        View →
                      </Link>
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
