"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface Loan {
  id: string;
  book: {
    id?: string;
    title: string;
    author: string;
  };
  student?: {
    id?: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string | null;
  } | null;
  borrowerName: string;
  issueDate?: string;
  createdAt?: string;
  dueDate: string;
  status: "ACTIVE" | "OVERDUE" | "RETURNED" | string;
  fineAmount?: number;
  estimatedFine?: number;
  fine?: number;
}

interface AvailableBook {
  id: string;
  title: string;
  author: string;
  availableCopies: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const clean = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;
    const d = new Date(clean);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getBorrowerName(loan: Loan): string {
  if (loan.student && (loan.student.firstName || loan.student.lastName)) {
    return `${loan.student.firstName ?? ""} ${loan.student.lastName ?? ""}`.trim();
  }
  return loan.borrowerName || "—";
}

export default function LibraryLoansPage() {
  const { isAdmin } = useCurrentUser();
  const [tab, setTab] = useState<"active" | "overdue">("active");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Issue modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<AvailableBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [issueBookId, setIssueBookId] = useState("");
  const [issueBorrowerName, setIssueBorrowerName] = useState("");
  const [issueDueDate, setIssueDueDate] = useState(() => {
    const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return nextTwoWeeks.toISOString().split("T")[0];
  });
  const [issueNotes, setIssueNotes] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [issueError, setIssueError] = useState("");

  const loadLoans = useCallback((currentTab: "active" | "overdue") => {
    setLoading(true);
    setError("");
    const endpoint = currentTab === "overdue" ? "overdue" : "active";

    fetch(`${API}/api/v1/library/loans/${endpoint}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load loans");
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setLoans(data);
        } else {
          setError(data.message ?? "Failed to load loans");
        }
      })
      .catch((err) => {
        setError(err.message ?? "Network error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadLoans(tab);
  }, [tab, loadLoans]);

  useEffect(() => {
    if (showIssueModal) {
      setLoadingBooks(true);
      setIssueError("");
      fetch(`${API}/api/v1/library/books?availableOnly=true`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailableBooks(data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingBooks(false));
    }
  }, [showIssueModal]);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!issueBookId || !issueBorrowerName || !issueDueDate) return;

    setSubmittingIssue(true);
    setIssueError("");

    try {
      const res = await fetch(`${API}/api/v1/library/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookId: issueBookId,
          borrowerName: issueBorrowerName.trim(),
          dueDate: issueDueDate,
          notes: issueNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIssueError(data.message ?? "Failed to issue book");
        return;
      }

      setShowIssueModal(false);
      setIssueBookId("");
      setIssueBorrowerName("");
      setIssueNotes("");
      setSuccessMsg("Book issued successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);

      if (tab === "active") {
        loadLoans("active");
      } else {
        setTab("active");
      }
    } catch {
      setIssueError("Network error while issuing book");
    } finally {
      setSubmittingIssue(false);
    }
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ marginBottom: 6 }}>
            <Link
              href="/library"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "var(--color-text-secondary)",
                textDecoration: "none",
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
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to library
            </Link>
          </div>
          <h1 className="page-title">Book Loans</h1>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowIssueModal(true)}
          >
            Issue a book
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          className="pill-success"
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginBottom: 16,
            padding: "8px 14px",
            borderRadius: "var(--radius-control)",
            fontSize: 13,
          }}
        >
          {successMsg}
        </div>
      )}

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

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`btn ${tab === "active" ? "btn-primary" : "btn-secondary"}`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setTab("overdue")}
          className={`btn ${tab === "overdue" ? "btn-primary" : "btn-secondary"}`}
        >
          Overdue
        </button>
      </div>

      {/* Table or Empty State */}
      {loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Borrower</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Status</th>
                {tab === "overdue" && <th>Fine</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, index) => (
                <tr key={index}>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 16, width: "65%", marginBottom: 6 }}
                    />
                    <div
                      className="skeleton"
                      style={{ height: 12, width: "40%" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 16, width: "55%" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 14, width: "45%" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{ height: 14, width: "45%" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton"
                      style={{
                        height: 20,
                        width: 64,
                        borderRadius: "var(--radius-pill-badge)",
                      }}
                    />
                  </td>
                  {tab === "overdue" && (
                    <td>
                      <div
                        className="skeleton"
                        style={{ height: 14, width: 48 }}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : loans.length === 0 ? (
        tab === "active" ? (
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h3 className="empty-state-title">No active loans</h3>
            <p className="empty-state-text">
              All borrowed books have been returned. Issue a book to record a new loan.
            </p>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowIssueModal(true)}
              >
                Issue a book
              </button>
            )}
          </div>
        ) : (
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="empty-state-title">No overdue books</h3>
            <p className="empty-state-text">
              All borrowed books are within their lending period. No overdue fines to collect.
            </p>
          </div>
        )
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Borrower</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Status</th>
                {tab === "overdue" && <th>Fine</th>}
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => {
                const isOverdue = loan.status === "OVERDUE" || tab === "overdue";
                const fine = loan.fineAmount ?? loan.estimatedFine ?? loan.fine ?? 0;

                return (
                  <tr key={loan.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                        {loan.book?.title ?? "Untitled Book"}
                      </div>
                      {loan.book?.author && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            marginTop: 2,
                          }}
                        >
                          {loan.book.author}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--color-ink)" }}>
                        {getBorrowerName(loan)}
                      </div>
                      {loan.student?.admissionNumber && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-secondary)",
                            fontFamily: "monospace",
                            marginTop: 2,
                          }}
                        >
                          {loan.student.admissionNumber}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        color: "var(--color-text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(loan.issueDate ?? loan.createdAt)}
                    </td>
                    <td
                      style={{
                        color: isOverdue
                          ? "var(--color-danger-text)"
                          : "var(--color-text-secondary)",
                        fontWeight: isOverdue ? 600 : 400,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(loan.dueDate)}
                    </td>
                    <td>
                      {isOverdue ? (
                        <span className="pill-danger">Overdue</span>
                      ) : (
                        <span className="pill-info">Active</span>
                      )}
                    </td>
                    {tab === "overdue" && (
                      <td
                        style={{
                          fontWeight: 600,
                          color: "var(--color-danger-text)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ₦{fine.toLocaleString("en-NG")}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && isAdmin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "color-mix(in srgb, var(--color-ink) 45%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => setShowIssueModal(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              backgroundColor: "var(--color-surface)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  margin: 0,
                }}
              >
                Issue a book
              </h2>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 4,
                }}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {issueError && (
              <div
                className="pill-danger"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginBottom: 16,
                  padding: "8px 14px",
                  borderRadius: "var(--radius-control)",
                  fontSize: 13,
                  width: "100%",
                }}
              >
                {issueError}
              </div>
            )}

            <form onSubmit={handleIssueSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Book</label>
                {loadingBooks ? (
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                    Loading available books…
                  </p>
                ) : availableBooks.length > 0 ? (
                  <select
                    className="input"
                    value={issueBookId}
                    onChange={(e) => setIssueBookId(e.target.value)}
                    required
                  >
                    <option value="">Select a book…</option>
                    {availableBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} {b.author ? `— ${b.author}` : ""} ({b.availableCopies} available)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter book ID"
                    value={issueBookId}
                    onChange={(e) => setIssueBookId(e.target.value)}
                    required
                  />
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label">Borrower Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Amina Bello"
                  value={issueBorrowerName}
                  onChange={(e) => setIssueBorrowerName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  className="input"
                  value={issueDueDate}
                  onChange={(e) => setIssueDueDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label">Notes (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Additional notes"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowIssueModal(false)}
                  disabled={submittingIssue}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingIssue}
                >
                  {submittingIssue ? "Issuing…" : "Issue book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
