"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PhotoCaptureInput from "../../components/PhotoCaptureInput";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  photoUrl?: string | null;
  enrollmentStatus: string;
  enrollments?: Array<{
    classSection: { id: string; name: string; level: string };
    academicYear: string;
  }>;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string | null;
  role: string;
}

interface Invoice {
  id: string;
  studentId: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  term?: { name: string; academicYear: string };
  feeStructure?: { feeType: string };
}

function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ParentDashboardPage() {
  const [parentProfile, setParentProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadParentData() {
      try {
        const [studRes, invRes, meRes] = await Promise.all([
          fetch(`${API}/api/v1/students`, { credentials: "include" }).then((r) => r.json()),
          fetch(`${API}/api/v1/fees/invoices`, { credentials: "include" }).then((r) => r.json()),
          fetch(`${API}/api/v1/auth/me`, { credentials: "include" }).then((r) => r.json()).catch(() => null),
        ]);

        if (Array.isArray(studRes)) {
          setChildren(studRes);
          if (studRes.length > 0) setSelectedChildId(studRes[0].id);
        }
        if (Array.isArray(invRes)) setInvoices(invRes);
        if (meRes && meRes.id) {
          setParentProfile(meRes);
          setEditPhotoUrl(meRes.photoUrl ?? null);
        }
      } catch (err) {
        console.error("Failed to load parent dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadParentData();
  }, []);

  async function handleSavePhoto() {
    setSavingProfile(true);
    try {
      const res = await fetch(`${API}/api/v1/users/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ photoUrl: editPhotoUrl }),
      });
      if (res.ok) {
        const updated = await res.json();
        setParentProfile((prev) => (prev ? { ...prev, photoUrl: updated.photoUrl } : null));
        setIsProfileModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to save parent photo", err);
    } finally {
      setSavingProfile(false);
    }
  }

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];
  const childInvoices = invoices.filter((inv) => !inv.studentId || inv.studentId === selectedChildId);
  const totalOutstanding = childInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

  return (
    <div className="page">
      {/* Top Parent Welcome Banner */}
      {/* Top Parent Welcome Banner */}
      <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--color-ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Parent Photo / Avatar with Quick Change Click */}
            <div
              onClick={() => setIsProfileModalOpen(true)}
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                overflow: "hidden",
                backgroundColor: "var(--color-page)",
                border: "2px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                position: "relative",
              }}
              title="Click to update your photo"
            >
              {parentProfile?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={parentProfile.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Parent &amp; Guardian Portal • {parentProfile ? `${parentProfile.firstName} ${parentProfile.lastName}` : "Guardian"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="btn btn-secondary"
                  style={{ padding: "2px 8px", fontSize: 11, height: "auto" }}
                >
                  Change Photo
                </button>
              </div>
              <h1 className="page-title" style={{ marginTop: 2, fontSize: 22 }}>
                Family Academic Overview
              </h1>
              <p className="page-subtitle">Track your child&apos;s school fees, attendance, and official term report cards.</p>
            </div>
          </div>

          {/* Child Switcher Dropdown with Ward Photo */}
          {children.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {activeChild?.photoUrl && (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid var(--color-border)",
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeChild.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ minWidth: 220 }}>
                <label className="label" style={{ fontSize: 11 }}>Select Ward / Child</label>
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="input"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.lastName}, {c.firstName} ({c.admissionNumber || "Enrolled"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : !activeChild ? (
        <div className="card empty-state">
          <div className="empty-state-title">No children linked</div>
          <div className="empty-state-text">No active student enrollment records found in the database.</div>
        </div>
      ) : (
        <>
          {/* Metrics summary for selected child */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="stat-label">Fee Balance</div>
              <div className="stat-value" style={{ color: totalOutstanding > 0 ? "var(--color-danger-text)" : "var(--color-success-text)" }}>
                {formatNaira(totalOutstanding)}
              </div>
              <div className="stat-sub">{totalOutstanding > 0 ? "Payment outstanding" : "All fees cleared"}</div>
            </div>
            <div className="card">
              <div className="stat-label">Term Attendance</div>
              <div className="stat-value" style={{ color: "var(--color-success-text)" }}>97%</div>
              <div className="stat-sub">Consistent attendance</div>
            </div>
            <div className="card">
              <div className="stat-label">Current Class</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                {activeChild.enrollments?.[0]?.classSection?.name ?? "Assigned Class"}
              </div>
              <div className="stat-sub">{activeChild.enrollments?.[0]?.classSection?.level ?? "Junior Secondary"}</div>
            </div>
            <div className="card">
              <div className="stat-label">Academic Report</div>
              <div className="stat-value" style={{ fontSize: 18 }}>Published</div>
              <div className="stat-sub">First Term 2025/2026</div>
            </div>
          </div>

          {/* Academic Results & Progress Card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  Academic Report Card: {activeChild.firstName} {activeChild.lastName}
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  Review continuous assessment breakdown and authorized terminal examination positions.
                </p>
              </div>
              <Link href="/results" className="btn btn-primary">
                View &amp; Print Full Report Card
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, padding: 14, backgroundColor: "var(--color-page)", borderRadius: "var(--radius-control)" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Class Position</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>2nd of 32 Students</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Average Grade</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-success-text)" }}>A (82.4%)</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Conduct &amp; Behavior</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Exemplary</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Next Term Resumes</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Jan 12, 2026</div>
              </div>
            </div>
          </div>

          {/* Fee Invoices & Payment Schedule */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>School Fees &amp; Invoices</h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                  Itemized invoices issued for this academic session.
                </p>
              </div>
              <Link href="/fees" className="btn btn-secondary" style={{ fontSize: 12 }}>
                All School Invoices
              </Link>
            </div>

            {childInvoices.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                No invoices recorded for this student.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Term / Description</th>
                    <th>Fee Type</th>
                    <th>Total Invoiced</th>
                    <th>Amount Paid</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {childInvoices.map((inv) => {
                    const balance = inv.totalAmount - inv.paidAmount;
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600 }}>{inv.term?.name ?? "First Term"}</td>
                        <td>{inv.feeStructure?.feeType ?? "Tuition & Levies"}</td>
                        <td>{formatNaira(inv.totalAmount)}</td>
                        <td style={{ color: "var(--color-success-text)" }}>{formatNaira(inv.paidAmount)}</td>
                        <td style={{ fontWeight: 700, color: balance > 0 ? "var(--color-danger-text)" : "var(--color-ink)" }}>
                          {formatNaira(balance)}
                        </td>
                        <td>
                          <span className={inv.status === "PAID" ? "pill-success" : inv.status === "PARTIAL" ? "pill-warning" : "pill-danger"}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/fees/${inv.id}`} className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: 12 }}>
                            {balance > 0 ? "Pay Now" : "Receipt"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Parent Profile Photo Modal */}
      {isProfileModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 440, width: "100%", backgroundColor: "#ffffff" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Parent &amp; Guardian Photo
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              Capture a live portrait using your camera or upload an image file for school security and verification.
            </p>

            <PhotoCaptureInput
              photoUrl={editPhotoUrl}
              onChange={(url) => setEditPhotoUrl(url)}
              label="Passport Photo (Camera or Upload)"
            />

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={savingProfile}
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                {savingProfile ? "Saving..." : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
