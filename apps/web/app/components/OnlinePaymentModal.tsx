"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface InvoiceTarget {
  id: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  term?: { name: string } | null;
  student?: {
    firstName: string;
    lastName: string;
    admissionNumber?: string | null;
  } | null;
}

interface OnlinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceTarget | null;
  onSuccess?: () => void;
}

export default function OnlinePaymentModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: OnlinePaymentModalProps) {
  const [method, setMethod] = useState<"CARD" | "TRANSFER" | "USSD">("CARD");
  const [amount, setAmount] = useState<string>("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardPin, setCardPin] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<any | null>(null);

  const balance = invoice ? Math.max(0, invoice.totalAmount - invoice.paidAmount) : 0;

  useEffect(() => {
    if (invoice) {
      const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      setAmount(remaining.toString());
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setCardPin("");
      setTransferRef(`TRF-${Date.now().toString().slice(-6)}`);
      setError("");
      setReceipt(null);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleFillDemoCard = () => {
    setCardNumber("5399 4100 2849 8831");
    setCardExpiry("12/28");
    setCardCvv("742");
    setCardPin("2468");
    setError("");
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setError("Please enter a valid payment amount greater than zero.");
      return;
    }
    if (payAmount > balance) {
      setError(`Amount cannot exceed the outstanding balance of ₦${balance.toLocaleString()}.`);
      return;
    }

    if (method === "CARD") {
      if (cardNumber.replace(/\s/g, "").length < 16) {
        setError("Please enter a valid 16-digit debit card number.");
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        setError("Please enter card expiry date (MM/YY).");
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        setError("Please enter 3-digit CVV.");
        return;
      }
    }

    setLoading(true);

    try {
      const cardLast4 = method === "CARD" ? cardNumber.replace(/\s/g, "").slice(-4) : undefined;
      const res = await fetch(`${API}/api/v1/fees/invoices/${invoice.id}/pay/online`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: payAmount,
          method: method === "TRANSFER" ? "BANK_DEPOSIT" : "ONLINE_CARD",
          notes: method === "TRANSFER" ? `Bank Transfer Ref: ${transferRef}` : `Card payment ending in ${cardLast4}`,
          cardLast4,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Payment authorization failed");
      }

      const isPending = Boolean(data.pendingVerification);
      setReceipt({
        reference: data.payment?.reference || `TXN-ONL-${Date.now()}`,
        amount: payAmount,
        date: new Date().toLocaleString("en-NG"),
        method: method === "CARD" ? `Mastercard / Visa (ending in ${cardLast4 || "8831"})` : "Instant Bank Transfer",
        newBalance: isPending ? balance : Math.max(0, balance - payAmount),
        status: isPending ? "PENDING_BURSARY_VERIFICATION" : "SUCCESSFUL",
        studentName: invoice.student ? `${invoice.student.firstName} ${invoice.student.lastName}` : "Student",
        termName: invoice.term?.name || "First Term",
        isPending,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Network error while processing payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 500,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Top Header */}
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
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink, #182220)" }}>
              {receipt ? "Official Payment Receipt" : "Online School Fee Settlement"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary, #70817B)", marginTop: 2 }}>
              {invoice.term?.name || "Academic Term"} · Invoice #{invoice.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              padding: 4,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto" }}>
          {receipt ? (
            /* Digital Receipt View */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Official Receipt Letterhead */}
              <div style={{ textAlign: "center", borderBottom: "1px solid var(--color-border, #E8ECE9)", paddingBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                  <img
                    src="/school-logo.png"
                    alt="Bright Future Academy"
                    style={{ width: 44, height: 44, objectFit: "contain" }}
                  />
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "var(--color-ink)", letterSpacing: "0.02em", textTransform: "uppercase" }}>
                  BRIGHT FUTURE ACADEMY
                </div>
                <div style={{ fontSize: 10, fontStyle: "italic", color: "var(--color-text-secondary)", margin: "2px 0" }}>
                  &quot;Guided By Principles, Driven By Purpose&quot;
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                  Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                  Tel: 08029839848 | Email: brightfutureacademykashere@gmail.com
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: receipt.isPending ? "#FEF3C7" : "#ECFDF5",
                  border: `1px solid ${receipt.isPending ? "#FCD34D" : "#A7F3D0"}`,
                  textAlign: "center",
                }}
              >
                <div style={{ color: receipt.isPending ? "#92400E" : "#065F46", fontWeight: 800, fontSize: 14 }}>
                  {receipt.isPending ? "Payment Submitted - Awaiting Bursary Verification" : "Payment Confirmed"}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: receipt.isPending ? "#B45309" : "#065F46", marginTop: 6 }}>
                  ₦{receipt.amount.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: receipt.isPending ? "#92400E" : "#047857", marginTop: 4 }}>
                  Transaction Reference: {receipt.reference}
                </div>
                {receipt.isPending && (
                  <div style={{ fontSize: 11, color: "#92400E", marginTop: 6, lineHeight: 1.4 }}>
                    Your payment submission is queued for Bursary confirmation. Once verified by the School Bursar, your invoice balance will officially clear.
                  </div>
                )}
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
                  <span style={{ color: "var(--color-text-secondary)" }}>Student:</span>
                  <strong>{receipt.studentName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Term:</span>
                  <strong>{receipt.termName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Payment Channel:</span>
                  <span>{receipt.method}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Date &amp; Time:</span>
                  <span>{receipt.date}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Status:</span>
                  <span style={{ fontWeight: 700, color: receipt.isPending ? "#B45309" : "#047857" }}>
                    {receipt.isPending ? "Pending Verification" : "Cleared & Confirmed"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTop: "1px solid var(--color-border, #E8ECE9)",
                    fontWeight: 700,
                  }}
                >
                  <span>{receipt.isPending ? "Outstanding Balance (Unchanged):" : "Remaining Balance:"}</span>
                  <span style={{ color: receipt.newBalance > 0 ? "var(--color-danger-text)" : "var(--color-success-text)" }}>
                    ₦{receipt.newBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: "10px 14px", fontWeight: 700 }}
                  onClick={() => window.print()}
                >
                  Print Slip
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "10px 14px", fontWeight: 700 }}
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form View */
            <form onSubmit={handleSubmitPayment} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Balance Summary Card */}
              <div
                style={{
                  backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                  padding: 14,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                    Outstanding Balance
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-danger-text, #B91C1C)" }}>
                    ₦{balance.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "var(--color-text-secondary)" }}>
                  <div>Total: ₦{invoice.totalAmount.toLocaleString()}</div>
                  <div>Paid: ₦{invoice.paidAmount.toLocaleString()}</div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    backgroundColor: "#FEF2F2",
                    color: "#991B1B",
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Payment Method Switcher */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6, display: "block" }}>
                  Select Payment Channel
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMethod("CARD")}
                    style={{
                      border: method === "CARD" ? "2px solid var(--color-brand-teal, #0E7D75)" : "1px solid var(--color-border, #E8ECE9)",
                      backgroundColor: method === "CARD" ? "#ECFDF5" : "#FFFFFF",
                      color: method === "CARD" ? "#065F46" : "var(--color-ink)",
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
                    onClick={() => setMethod("TRANSFER")}
                    style={{
                      border: method === "TRANSFER" ? "2px solid var(--color-brand-teal, #0E7D75)" : "1px solid var(--color-border, #E8ECE9)",
                      backgroundColor: method === "TRANSFER" ? "#ECFDF5" : "#FFFFFF",
                      color: method === "TRANSFER" ? "#065F46" : "var(--color-ink)",
                      padding: "8px 6px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Bank Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("USSD")}
                    style={{
                      border: method === "USSD" ? "2px solid var(--color-brand-teal, #0E7D75)" : "1px solid var(--color-border, #E8ECE9)",
                      backgroundColor: method === "USSD" ? "#ECFDF5" : "#FFFFFF",
                      color: method === "USSD" ? "#065F46" : "var(--color-ink)",
                      padding: "8px 6px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    USSD Code
                  </button>
                </div>
              </div>

              {/* Amount to Pay */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>
                    Amount to Pay (₦)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAmount(balance.toString())}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 11,
                      color: "var(--color-brand-teal, #0E7D75)",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  className="input"
                  min="100"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ fontWeight: 700, fontSize: 15 }}
                  required
                />
              </div>

              {/* Card Form */}
              {method === "CARD" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>
                      Card Details
                    </label>
                    <button
                      type="button"
                      onClick={handleFillDemoCard}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 11,
                        color: "var(--color-brand-teal, #0E7D75)",
                        fontWeight: 700,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Fill Test Card
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      className="input"
                      placeholder="Card Number (0000 0000 0000 0000)"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={19}
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      maxLength={5}
                      required
                    />
                    <input
                      type="password"
                      className="input"
                      placeholder="CVV"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      maxLength={4}
                      required
                    />
                    <input
                      type="password"
                      className="input"
                      placeholder="PIN"
                      value={cardPin}
                      onChange={(e) => setCardPin(e.target.value)}
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Bank Transfer Details */}
              {method === "TRANSFER" && (
                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#1E293B" }}>School Bank Account Details</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Bank:</span>
                    <strong>GTBank Plc</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Account Name:</span>
                    <strong>Bright Future Academy</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Account Number:</span>
                    <strong style={{ fontSize: 13, letterSpacing: "0.05em" }}>0123456789</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Payment Ref:</span>
                    <strong style={{ color: "var(--color-brand-teal, #0E7D75)" }}>{transferRef}</strong>
                  </div>
                </div>
              )}

              {/* USSD Details */}
              {method === "USSD" && (
                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>Direct USSD Quick Pay</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "var(--color-brand-teal, #0E7D75)", letterSpacing: "0.05em" }}>
                    *737*2*₦{amount || balance}*0123456789#
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                    Dial on your registered phone number to authorize instant payment
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || balance <= 0}
                  style={{
                    flex: 2,
                    backgroundColor: "var(--color-brand-teal, #0E7D75)",
                    fontWeight: 700,
                  }}
                >
                  {loading ? "Processing..." : `Pay ₦${Number(amount || balance).toLocaleString()} Now`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
