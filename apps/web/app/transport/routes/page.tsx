"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stop {
  id: string;
  stopName: string;
  stopOrder: number;
  landmark: string | null;
  pickupTime: string | null;
}

interface Bus {
  id: string;
  name: string;
  plateNumber: string;
  driverName: string;
}

interface Route {
  id: string;
  name: string;
  description: string | null;
  bus: Bus | null;
  stops: Stop[];
  _count: {
    studentAssignments: number;
  };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function TransportRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    fetch(`${API}/api/v1/transport/routes`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load routes");
        }
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          if (Array.isArray(data)) {
            setRoutes(data);
            setError("");
          } else {
            setError(data.message ?? "Failed to load routes");
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message ?? "Network error");
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

  const toggleExpand = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <Link
            href="/transport"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              marginBottom: 8,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Transport
          </Link>
          <h1 className="page-title">Routes</h1>
          <p className="page-subtitle">
            Organize pickup and drop-off schedules for school transport
          </p>
        </div>
        <Link href="/transport/routes/new" className="btn btn-primary">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add a route
        </Link>
      </div>

      {/* Error Message */}
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

      {/* Loading Skeleton State */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card" style={{ padding: "18px 20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <div
                    className="skeleton"
                    style={{ height: 18, width: "35%" }}
                  />
                  <div
                    className="skeleton"
                    style={{ height: 13, width: "55%" }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    className="skeleton"
                    style={{
                      height: 22,
                      width: 90,
                      borderRadius: "var(--radius-pill-badge)",
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{ height: 14, width: 70 }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && routes.length === 0 && (
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
              <circle cx="6" cy="19" r="3" />
              <path d="M9 19h8.5a4.5 4.5 0 0 0 4.5-4.5v0a4.5 4.5 0 0 0-4.5-4.5H8.5A4.5 4.5 0 0 1 4 5.5v0A4.5 4.5 0 0 1 8.5 1H15" />
              <circle cx="18" cy="5" r="3" />
            </svg>
          </div>
          <h3 className="empty-state-title">No routes yet</h3>
          <p className="empty-state-text">
            Create a route to organize pickup and drop-off stops.
          </p>
          <Link href="/transport/routes/new" className="btn btn-primary">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add a route
          </Link>
        </div>
      )}

      {/* Routes List */}
      {!loading && !error && routes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {routes.map((route) => {
            const isOpen = expandedId === route.id;
            const studentCount = route._count?.studentAssignments ?? 0;
            const sortedStops = [...route.stops].sort(
              (a, b) => a.stopOrder - b.stopOrder
            );

            return (
              <div
                key={route.id}
                className="card"
                style={{ padding: 0, overflow: "hidden" }}
              >
                {/* Route Header Row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(route.id)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        lineHeight: 1.3,
                      }}
                    >
                      {route.name}
                    </span>
                    {route.description && (
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-secondary)",
                          lineHeight: 1.4,
                        }}
                      >
                        {route.description}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexShrink: 0,
                      flexWrap: "wrap",
                    }}
                  >
                    {route.bus ? (
                      <span className="pill-info">
                        {route.bus.name} · {route.bus.plateNumber}
                      </span>
                    ) : (
                      <span className="pill-neutral">No bus assigned</span>
                    )}

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {studentCount}{" "}
                      {studentCount === 1 ? "student" : "students"}
                    </span>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-control)",
                        color: "var(--color-text-secondary)",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded Details: Stop Timeline & Driver Info */}
                {isOpen && (
                  <div
                    style={{
                      borderTop:
                        "var(--border-width) solid var(--color-border)",
                      padding: "20px",
                    }}
                  >
                    {/* Stops Header */}
                    <div style={{ marginBottom: 14 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Route Stops ({sortedStops.length})
                      </span>
                    </div>

                    {/* Timeline List */}
                    {sortedStops.length === 0 ? (
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-secondary)",
                          margin: 0,
                        }}
                      >
                        No stops configured for this route.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {sortedStops.map((stop, index) => {
                          const isFirst = index === 0;
                          const isLast = index === sortedStops.length - 1;

                          return (
                            <div
                              key={stop.id}
                              style={{ display: "flex", gap: 14 }}
                            >
                              {/* Connector Column: Dot & Line */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  width: 14,
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    backgroundColor: isFirst
                                      ? "var(--color-success-text)"
                                      : isLast
                                      ? "var(--color-danger-text)"
                                      : "var(--color-ink)",
                                    marginTop: 4,
                                    flexShrink: 0,
                                  }}
                                />
                                {!isLast && (
                                  <div
                                    style={{
                                      width: 2,
                                      flex: 1,
                                      minHeight: 28,
                                      backgroundColor:
                                        "var(--color-border)",
                                      marginTop: 4,
                                      marginBottom: 4,
                                    }}
                                  />
                                )}
                              </div>

                              {/* Stop Details */}
                              <div
                                style={{
                                  paddingBottom: isLast ? 0 : 16,
                                  flex: 1,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "var(--color-ink)",
                                    }}
                                  >
                                    {stop.stopOrder}. {stop.stopName}
                                  </span>
                                  {stop.pickupTime && (
                                    <span
                                      className="pill-neutral"
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        fontSize: 11,
                                      }}
                                    >
                                      <svg
                                        width="11"
                                        height="11"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                      </svg>
                                      {stop.pickupTime}
                                    </span>
                                  )}
                                </div>
                                {stop.landmark && (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                      marginTop: 4,
                                      fontSize: 12,
                                      color: "var(--color-text-secondary)",
                                    }}
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                      <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    <span>{stop.landmark}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Driver & Bus Info Section */}
                    {route.bus ? (
                      <div
                        style={{
                          marginTop: 20,
                          paddingTop: 16,
                          borderTop:
                            "var(--border-width) solid var(--color-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            className="avatar"
                            style={{
                              width: 32,
                              height: 32,
                              fontSize: 11,
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div>
                            <span
                              style={{
                                display: "block",
                                fontSize: 11,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              Driver
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--color-ink)",
                              }}
                            >
                              {route.bus.driverName}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            Assigned Vehicle:
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--color-ink)",
                            }}
                          >
                            {route.bus.name} ({route.bus.plateNumber})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 20,
                          paddingTop: 16,
                          borderTop:
                            "var(--border-width) solid var(--color-border)",
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        No vehicle or driver assigned to this route.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
