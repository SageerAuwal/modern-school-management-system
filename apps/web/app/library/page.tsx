"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string | null;
  _count: { loans: number };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availOnly, setAvailOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (availOnly) params.set("availableOnly", "true");

    fetch(`${API}/api/v1/library/books?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBooks(data);
        else setError(data.message ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [search, category, availOnly]);

  const categories = ["Science", "Mathematics", "English", "Social Studies", "Fiction", "Reference", "History", "Arts"];

  const totalBooks = books.reduce((s, b) => s + b.totalCopies, 0);
  const availableBooks = books.reduce((s, b) => s + b.availableCopies, 0);
  const onLoanBooks = totalBooks - availableBooks;

  return (
    <main style={{ padding: "32px 24px", backgroundColor: "var(--color-page)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>Library</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{books.length} titles in catalogue</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/library/loans"
            style={{ padding: "9px 16px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 13, textDecoration: "none", color: "var(--color-ink)", backgroundColor: "var(--color-surface)" }}>
            Active Loans
          </Link>
          <Link href="/library/new"
            style={{ padding: "9px 16px", backgroundColor: "var(--color-ink)", color: "#fff", borderRadius: "var(--radius-control)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
            + Add Book
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Copies", value: totalBooks, bg: "#f0f9ff" },
          { label: "Available", value: availableBooks, bg: "#f0fdf4" },
          { label: "On Loan", value: onLoanBooks, bg: "#fef9c3" },
          { label: "Titles", value: books.length, bg: "#f8fafc" },
        ].map((c) => (
          <div key={c.label} className="card" style={{ backgroundColor: c.bg }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 4 }}>{c.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input type="search" placeholder="Search title, author, ISBN…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 360, padding: "9px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, backgroundColor: "var(--color-surface)", color: "var(--color-ink)", outline: "none" }} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "9px 12px", border: "var(--border-width) solid var(--color-border)", borderRadius: "var(--radius-control)", fontSize: 14, backgroundColor: "var(--color-surface)", color: "var(--color-ink)", outline: "none" }}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={availOnly} onChange={(e) => setAvailOnly(e.target.checked)} />
          Available only
        </label>
      </div>

      {error && <div className="pill-danger" style={{ display: "block", padding: "10px 14px", borderRadius: "var(--radius-control)", marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {loading && <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Loading…</p>}

      {/* Books grid */}
      {!loading && !error && (
        books.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--color-text-secondary)", fontSize: 14 }}>
            No books found. <Link href="/library/new" style={{ color: "var(--color-ink)", fontWeight: 500 }}>Add the first book.</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {books.map((book) => {
              const available = book.availableCopies > 0;
              return (
                <Link key={book.id} href={`/library/${book.id}`} style={{ textDecoration: "none" }}>
                  <div className="card list-row" style={{ cursor: "pointer", height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: "var(--color-ink)", marginBottom: 2, lineHeight: 1.3 }}>{book.title}</p>
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{book.author}</p>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, marginLeft: 8, flexShrink: 0,
                        backgroundColor: available ? "#dcfce7" : "#fee2e2",
                        color: available ? "#166534" : "#991b1b",
                      }}>
                        {available ? `${book.availableCopies} avail.` : "All out"}
                      </span>
                    </div>
                    {book.category && <span style={{ fontSize: 11, color: "var(--color-text-secondary)", backgroundColor: "var(--color-page)", padding: "2px 8px", borderRadius: 999, display: "inline-block", width: "fit-content" }}>{book.category}</span>}
                    <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-secondary)" }}>
                      <span>{book.totalCopies} cop{book.totalCopies !== 1 ? "ies" : "y"}</span>
                      {book.shelfLocation && <span>📍 {book.shelfLocation}</span>}
                      {book.isbn && <span style={{ fontFamily: "monospace" }}>{book.isbn}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}
    </main>
  );
}
