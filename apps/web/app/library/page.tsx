"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  totalCopies: number;
  availableCopies: number;
  isActive: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LibraryPage() {
  const { isAdmin } = useCurrentUser();
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }

    fetch(`${API}/api/v1/library/books?${params.toString()}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load books");
        }
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          if (Array.isArray(data)) {
            setBooks(data);
          } else {
            setError(data.message ?? "Failed to load books");
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
  }, [search]);

  return (
    <div className="page">
      <style>{`
        @media (max-width: 900px) {
          .library-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 600px) {
          .library-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Library</h1>
          <p className="page-subtitle">
            {books.length} {books.length === 1 ? "book" : "books"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/library/loans" className="btn btn-secondary">
            View loans
          </Link>
          {isAdmin && (
            <Link href="/library/new" className="btn btn-primary">
              Add a book
            </Link>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 24, maxWidth: 400 }}>
        <input
          type="search"
          className="input"
          placeholder="Search by title, author, or ISBN"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error Notice */}
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
        <div
          className="library-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="card"
              style={{
                height: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    className="skeleton"
                    style={{ height: 18, width: "60%" }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      height: 18,
                      width: 60,
                      borderRadius: "var(--radius-pill-badge)",
                    }}
                  />
                </div>
                <div
                  className="skeleton"
                  style={{ height: 14, width: "40%" }}
                />
              </div>
              <div
                style={{
                  paddingTop: 10,
                  borderTop: "var(--border-width) solid var(--color-border)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div
                  className="skeleton"
                  style={{
                    height: 18,
                    width: 110,
                    borderRadius: "var(--radius-pill-badge)",
                  }}
                />
                <div
                  className="skeleton"
                  style={{ height: 14, width: 80 }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
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
              aria-hidden="true"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h2 className="empty-state-title">Your library is empty</h2>
          <p className="empty-state-text">
            Add books to start managing your school library.
          </p>
          {isAdmin && (
            <div>
              <Link href="/library/new" className="btn btn-primary">
                Add your first book
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* Grid of cards (3 columns) */
        <div
          className="library-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {books.map((book) => {
            const isAvailable = book.availableCopies > 0;
            return (
              <div
                key={book.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <h2
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: "var(--color-ink)",
                        lineHeight: 1.3,
                        margin: 0,
                      }}
                    >
                      {book.title}
                    </h2>
                    <span className="pill-neutral" style={{ flexShrink: 0 }}>
                      {book.category || "General"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      margin: 0,
                    }}
                  >
                    {book.author}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 12,
                    borderTop: "var(--border-width) solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span className={isAvailable ? "pill-success" : "pill-danger"}>
                    {book.availableCopies} of {book.totalCopies} available
                  </span>
                  {book.isbn && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                        fontFamily: "monospace",
                      }}
                    >
                      {book.isbn}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
