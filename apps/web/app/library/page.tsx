"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  shelfLocation?: string | null;
  totalCopies: number;
  availableCopies: number;
  isActive: boolean;
}

interface BorrowReceipt {
  bookTitle: string;
  borrowerName: string;
  dueDate: string;
  issuedAt: string;
}

interface BuyReceipt {
  receiptNumber: string;
  bookTitle: string;
  author: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  buyerName: string;
  paymentMethod: string;
  purchasedAt: string;
  shelfLocation?: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const CATEGORIES = [
  "All",
  "Science",
  "Mathematics",
  "Languages",
  "Commercial",
  "Humanities",
  "Reference",
];

function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function LibraryPage() {
  const { user, isAdmin } = useCurrentUser();
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Borrow Modal State
  const [borrowModalBook, setBorrowModalBook] = useState<Book | null>(null);
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowDueDate, setBorrowDueDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [borrowNotes, setBorrowNotes] = useState("");
  const [borrowSubmitting, setBorrowSubmitting] = useState(false);
  const [borrowError, setBorrowError] = useState("");
  const [borrowReceipt, setBorrowReceipt] = useState<BorrowReceipt | null>(null);

  // Buy Modal State
  const [buyModalBook, setBuyModalBook] = useState<Book | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyPaymentMethod, setBuyPaymentMethod] = useState("CARD");
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buyReceipt, setBuyReceipt] = useState<BuyReceipt | null>(null);

  const loadBooks = useCallback(() => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (selectedCategory && selectedCategory !== "All") {
      params.set("category", selectedCategory);
    }
    if (availableOnly) {
      params.set("availableOnly", "true");
    }

    fetch(`${API}/api/v1/library/books?${params.toString()}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load library catalog");
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setBooks(data);
        } else {
          setError(data.message ?? "Failed to load books");
        }
      })
      .catch((err) => {
        setError(err.message ?? "Network error connecting to library server");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [search, selectedCategory, availableOnly]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Open Borrow Modal
  const handleOpenBorrow = (book: Book) => {
    setBorrowModalBook(book);
    setBorrowerName(user ? `${user.firstName} ${user.lastName}`.trim() : "");
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    setBorrowDueDate(d.toISOString().split("T")[0]);
    setBorrowNotes("");
    setBorrowError("");
    setBorrowReceipt(null);
  };

  // Submit Borrow
  const handleSubmitBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowModalBook) return;

    if (!borrowerName.trim()) {
      setBorrowError("Please enter the borrower's name.");
      return;
    }
    if (!borrowDueDate) {
      setBorrowError("Please specify a return due date.");
      return;
    }

    setBorrowSubmitting(true);
    setBorrowError("");

    try {
      const res = await fetch(`${API}/api/v1/library/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookId: borrowModalBook.id,
          borrowerName: borrowerName.trim(),
          dueDate: borrowDueDate,
          notes: borrowNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not process book loan");
      }

      setBorrowReceipt({
        bookTitle: borrowModalBook.title,
        borrowerName: borrowerName.trim(),
        dueDate: borrowDueDate,
        issuedAt: new Date().toLocaleDateString("en-NG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      });

      loadBooks();
    } catch (err: any) {
      setBorrowError(err.message || "Network error while borrowing book");
    } finally {
      setBorrowSubmitting(false);
    }
  };

  // Open Buy Modal
  const handleOpenBuy = (book: Book) => {
    setBuyModalBook(book);
    setBuyQuantity(1);
    setBuyerName(user ? `${user.firstName} ${user.lastName}`.trim() : "");
    setBuyPaymentMethod("CARD");
    setBuyError("");
    setBuyReceipt(null);
  };

  // Submit Buy
  const handleSubmitBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyModalBook) return;

    if (buyQuantity < 1) {
      setBuyError("Please select at least 1 copy.");
      return;
    }
    if (buyQuantity > buyModalBook.availableCopies) {
      setBuyError(`Only ${buyModalBook.availableCopies} copy(ies) are currently available.`);
      return;
    }

    setBuySubmitting(true);
    setBuyError("");

    try {
      const res = await fetch(`${API}/api/v1/library/books/${buyModalBook.id}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          quantity: Number(buyQuantity),
          buyerName: buyerName.trim() || undefined,
          paymentMethod: buyPaymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not complete textbook purchase");
      }

      setBuyReceipt({
        receiptNumber: data.receiptNumber || `BK-BUY-${Date.now()}`,
        bookTitle: data.book?.title || buyModalBook.title,
        author: data.book?.author || buyModalBook.author,
        quantity: data.quantity || buyQuantity,
        unitPrice: data.unitPrice || 3500,
        totalAmount: data.totalAmount || 3500 * buyQuantity,
        buyerName: data.buyerName || buyerName.trim() || "Student",
        paymentMethod: data.paymentMethod || buyPaymentMethod,
        purchasedAt: new Date().toLocaleString("en-NG"),
        shelfLocation: data.book?.shelfLocation || buyModalBook.shelfLocation,
      });

      loadBooks();
    } catch (err: any) {
      setBuyError(err.message || "Network error while purchasing book");
    } finally {
      setBuySubmitting(false);
    }
  };

  return (
    <div className="page">
      <style>{`
        @media (max-width: 960px) {
          .library-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 640px) {
          .library-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Library &amp; Textbook Center</h1>
          <p className="page-subtitle">
            Borrow reference materials for 14-day loan or purchase required school textbooks with instant digital receipt.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/library/loans" className="btn btn-secondary" style={{ fontWeight: 700 }}>
            Active Loans &amp; Returns
          </Link>
          {isAdmin && (
            <Link href="/library/new" className="btn btn-primary" style={{ fontWeight: 700 }}>
              Add Book to Catalog
            </Link>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: 260, maxWidth: 440 }}>
            <input
              type="search"
              className="input"
              placeholder="Search by title, author, or ISBN"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Available Only Toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "var(--color-ink)", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              style={{ accentColor: "var(--color-brand-teal, #0E7D75)", width: 16, height: 16 }}
            />
            Available Copies Only
          </label>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", marginRight: 4 }}>
            Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                border: "none",
                borderRadius: 9999,
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: selectedCategory === cat ? 700 : 500,
                backgroundColor: selectedCategory === cat ? "var(--color-brand-teal, #0E7D75)" : "var(--color-surface-subtle, #F4F7F5)",
                color: selectedCategory === cat ? "#FFFFFF" : "var(--color-ink, #182220)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
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
            gap: 18,
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="card"
              style={{
                height: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div className="skeleton" style={{ height: 20, width: "65%" }} />
                  <div className="skeleton" style={{ height: 20, width: 70, borderRadius: 9999 }} />
                </div>
                <div className="skeleton" style={{ height: 14, width: "45%" }} />
              </div>
              <div style={{ paddingTop: 12, borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between" }}>
                <div className="skeleton" style={{ height: 24, width: 100, borderRadius: 9999 }} />
                <div className="skeleton" style={{ height: 28, width: 120, borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        /* Empty State */
        <div className="card empty-state" style={{ padding: 48, textAlign: "center" }}>
          <h2 className="empty-state-title" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
            No books found
          </h2>
          <p className="empty-state-text" style={{ color: "var(--color-text-secondary)", maxWidth: 460, margin: "0 auto 16px" }}>
            {search.trim() || selectedCategory !== "All"
              ? "No catalog items matched your filter criteria. Clear filters to view all volumes."
              : "The school library catalog is currently empty."}
          </p>
          {(search.trim() || selectedCategory !== "All") && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch("");
                setSelectedCategory("All");
                setAvailableOnly(false);
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Grid of books */
        <div
          className="library-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 18,
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
                  borderRadius: 20,
                  padding: "18px 20px",
                  border: "1px solid var(--color-border, #E8ECE9)",
                }}
              >
                <div>
                  {/* Top: Category & Availability Pill */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "3px 10px",
                        borderRadius: 9999,
                        backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                        color: "var(--color-ink, #182220)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {book.category || "General"}
                    </span>
                    <span className={isAvailable ? "pill-success" : "pill-danger"} style={{ fontSize: 11, padding: "2px 8px" }}>
                      {book.availableCopies} of {book.totalCopies} available
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      color: "var(--color-ink, #182220)",
                      lineHeight: 1.35,
                      margin: "0 0 4px",
                    }}
                  >
                    {book.title}
                  </h2>

                  {/* Author */}
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary, #70817B)", margin: "0 0 10px", fontWeight: 500 }}>
                    By {book.author}
                  </p>

                  {/* Shelf Location */}
                  <div style={{ fontSize: 11.5, color: "var(--color-brand-teal, #0E7D75)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Shelf:</span>
                    <span>{book.shelfLocation || "Main Library Stacks"}</span>
                  </div>
                </div>

                {/* Card Bottom: ISBN & Action Buttons */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: "1px solid var(--color-border, #E8ECE9)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--color-text-secondary)" }}>
                    <span>ISBN: {book.isbn || "Standard Edition"}</span>
                    <span style={{ fontWeight: 700, color: "var(--color-ink)" }}>Price: ₦3,500</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {/* Borrow / Loan Button */}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={!isAvailable}
                      onClick={() => handleOpenBorrow(book)}
                      style={{
                        padding: "7px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: "#FFFFFF",
                      }}
                      title={isAvailable ? "Borrow this book for 14 days" : "No copies currently available to borrow"}
                    >
                      Borrow (Loan)
                    </button>

                    {/* Buy Book Button */}
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!isAvailable}
                      onClick={() => handleOpenBuy(book)}
                      style={{
                        padding: "7px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: "var(--color-brand-teal, #0E7D75)",
                      }}
                      title={isAvailable ? "Purchase a copy of this book (₦3,500)" : "Out of stock for purchase"}
                    >
                      Buy Book
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          BORROW / LOAN MODAL
      ══════════════════════════════════════════════════════════════════════════ */}
      {borrowModalBook && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(16, 20, 26, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !borrowSubmitting) setBorrowModalBook(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--color-border, #E8ECE9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)" }}>
                  {borrowReceipt ? "Loan Issued Successfully" : "Borrow Library Book"}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Standard 14-day borrowing loan
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBorrowModalBook(null)}
                disabled={borrowSubmitting}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px" }}>
              {borrowReceipt ? (
                /* Loan Confirmation View */
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      backgroundColor: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: "#065F46", fontWeight: 800, fontSize: 15 }}>
                      Book Loan Active
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--color-ink)", marginTop: 6 }}>
                      {borrowReceipt.bookTitle}
                    </div>
                    <div style={{ fontSize: 12, color: "#047857", marginTop: 4 }}>
                      Return Due Date: <strong>{new Date(borrowReceipt.dueDate).toLocaleDateString()}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                      borderRadius: 14,
                      padding: 14,
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Borrower Name:</span>
                      <strong>{borrowReceipt.borrowerName}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Issued Date:</span>
                      <span>{borrowReceipt.issuedAt}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Loan Period:</span>
                      <span>14 Days (Standard Academic Loan)</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: "10px 14px", fontWeight: 700 }}
                      onClick={() => window.print()}
                    >
                      Print Loan Slip
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, padding: "10px 14px", fontWeight: 700 }}
                      onClick={() => setBorrowModalBook(null)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Borrow Form */
                <form onSubmit={handleSubmitBorrow} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Book Info Summary */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>
                        {borrowModalBook.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        By {borrowModalBook.author} · Shelf: {borrowModalBook.shelfLocation || "Main Stacks"}
                      </div>
                    </div>
                    <span className="pill-success" style={{ fontSize: 11 }}>
                      {borrowModalBook.availableCopies} available
                    </span>
                  </div>

                  {borrowError && (
                    <div style={{ backgroundColor: "#FEF2F2", color: "#991B1B", padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {borrowError}
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4, display: "block" }}>
                      Borrower Full Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Amina Bello"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4, display: "block" }}>
                      Return Due Date (14-Day Standard)
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={borrowDueDate}
                      onChange={(e) => setBorrowDueDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4, display: "block" }}>
                      Notes / Purpose (Optional)
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Term Research Project"
                      value={borrowNotes}
                      onChange={(e) => setBorrowNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setBorrowModalBook(null)}
                      disabled={borrowSubmitting}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={borrowSubmitting}
                      style={{ flex: 2, backgroundColor: "var(--color-brand-teal, #0E7D75)", fontWeight: 700 }}
                    >
                      {borrowSubmitting ? "Processing..." : "Confirm 14-Day Loan"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          BUY BOOK (TEXTBOOK) MODAL
      ══════════════════════════════════════════════════════════════════════════ */}
      {buyModalBook && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(16, 20, 26, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !buySubmitting) setBuyModalBook(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--color-border, #E8ECE9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)" }}>
                  {buyReceipt ? "Book Purchase Receipt" : "Purchase School Textbook"}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Official School Bookstore &amp; Library Counter
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBuyModalBook(null)}
                disabled={buySubmitting}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px" }}>
              {buyReceipt ? (
                /* Digital Purchase Receipt */
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      backgroundColor: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: "#065F46", fontWeight: 800, fontSize: 15 }}>
                      Purchase Verified
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#065F46", marginTop: 4 }}>
                      {formatNaira(buyReceipt.totalAmount)}
                    </div>
                    <div style={{ fontSize: 11, color: "#047857", marginTop: 4 }}>
                      Receipt: <strong>{buyReceipt.receiptNumber}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                      borderRadius: 14,
                      padding: 14,
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Title:</span>
                      <strong>{buyReceipt.bookTitle}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Author:</span>
                      <span>{buyReceipt.author}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Quantity:</span>
                      <span>{buyReceipt.quantity} copy(ies) @ ₦3,500</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Purchased By:</span>
                      <strong>{buyReceipt.buyerName}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Channel:</span>
                      <span>{buyReceipt.paymentMethod}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>Pickup Counter:</span>
                      <span>{buyReceipt.shelfLocation || "Library Reception Desk"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: "10px 14px", fontWeight: 700 }}
                      onClick={() => window.print()}
                    >
                      Print Receipt
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, padding: "10px 14px", fontWeight: 700 }}
                      onClick={() => setBuyModalBook(null)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Purchase Form */
                <form onSubmit={handleSubmitBuy} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Book Info Summary */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>
                        {buyModalBook.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        By {buyModalBook.author} · Shelf: {buyModalBook.shelfLocation || "Main Stacks"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-brand-teal, #0E7D75)" }}>
                        ₦3,500
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>per copy</div>
                    </div>
                  </div>

                  {buyError && (
                    <div style={{ backgroundColor: "#FEF2F2", color: "#991B1B", padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {buyError}
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4, display: "block" }}>
                      Quantity (Copies)
                    </label>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      max={buyModalBook.availableCopies}
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(Math.max(1, Number(e.target.value)))}
                      required
                    />
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      Maximum available for immediate checkout: {buyModalBook.availableCopies} copies
                    </div>
                  </div>

                  {/* Buyer Name */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4, display: "block" }}>
                      Buyer / Student Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Sageer Auwal"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Payment Channel */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4, display: "block" }}>
                      Payment Method
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setBuyPaymentMethod("CARD")}
                        style={{
                          border: buyPaymentMethod === "CARD" ? "2px solid var(--color-brand-teal, #0E7D75)" : "1px solid var(--color-border, #E8ECE9)",
                          backgroundColor: buyPaymentMethod === "CARD" ? "#ECFDF5" : "#FFFFFF",
                          color: buyPaymentMethod === "CARD" ? "#065F46" : "var(--color-ink)",
                          padding: "8px 6px",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Debit Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setBuyPaymentMethod("CASH")}
                        style={{
                          border: buyPaymentMethod === "CASH" ? "2px solid var(--color-brand-teal, #0E7D75)" : "1px solid var(--color-border, #E8ECE9)",
                          backgroundColor: buyPaymentMethod === "CASH" ? "#ECFDF5" : "#FFFFFF",
                          color: buyPaymentMethod === "CASH" ? "#065F46" : "var(--color-ink)",
                          padding: "8px 6px",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Cash / Transfer
                      </button>
                    </div>
                  </div>

                  {/* Order Total Summary */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Total Checkout Amount:</span>
                    <strong style={{ fontSize: 18, fontWeight: 900, color: "var(--color-brand-teal, #0E7D75)" }}>
                      {formatNaira(3500 * buyQuantity)}
                    </strong>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setBuyModalBook(null)}
                      disabled={buySubmitting}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={buySubmitting}
                      style={{ flex: 2, backgroundColor: "var(--color-brand-teal, #0E7D75)", fontWeight: 700 }}
                    >
                      {buySubmitting ? "Processing..." : `Pay ${formatNaira(3500 * buyQuantity)} & Complete`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
