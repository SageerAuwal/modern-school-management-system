"use client";

import { useState, useEffect } from "react";
import ActionConfirmationModal from "./ActionConfirmationModal";

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
  payments?: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    reference: string;
    notes?: string | null;
    createdAt?: string;
  }>;
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
  // Exactly 2 payment options as requested: Manual/Offline and Paystack
  const [method, setMethod] = useState<"MANUAL_OFFLINE" | "PAYSTACK">("MANUAL_OFFLINE");
  const [amount, setAmount] = useState<string>("");
  const [transferRef, setTransferRef] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [sendingBank, setSendingBank] = useState("GTBank");
  const [depositorPhone, setDepositorPhone] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<any | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const balance = invoice ? Math.max(0, invoice.totalAmount - invoice.paidAmount) : 0;

  useEffect(() => {
    if (invoice) {
      const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      setAmount(remaining.toString());
      setTransferRef(`TRF-${Date.now().toString().slice(-6)}`);
      setDepositorName("");
      setSendingBank("GTBank");
      setDepositorPhone("");
      setAdditionalNotes("");
      setError("");
      setReceipt(null);
      setIsConfirmModalOpen(false);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setError("Please enter a valid payment amount greater than zero.");
      return;
    }
    if (payAmount > balance) {
      setError(`Amount cannot exceed the outstanding balance of ₦${balance.toLocaleString("en-NG")}.`);
      return;
    }
    if (!transferRef.trim()) {
      setError("Please provide your bank transfer or teller reference number.");
      return;
    }
    if (!depositorName.trim()) {
      setError("Please enter the depositor's full name as shown on the transfer receipt.");
      return;
    }

    // Open 2-step confirmation modal before mutating database
    setIsConfirmModalOpen(true);
  };

  const executePaymentSubmission = async () => {
    const payAmount = Number(amount);
    setLoading(true);
    setError("");

    try {
      const formattedNotes = `Offline Bank Transfer | Ref: ${transferRef.trim()} | Depositor: ${depositorName.trim()} | Sending Bank: ${sendingBank}${
        depositorPhone.trim() ? ` | Phone: ${depositorPhone.trim()}` : ""
      }${additionalNotes.trim() ? ` | Note: ${additionalNotes.trim()}` : ""}`;

      const res = await fetch(`${API}/api/v1/fees/invoices/${invoice.id}/pay/online`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: payAmount,
          method: "BANK_DEPOSIT",
          notes: formattedNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Payment submission failed. Please verify your details.");
      }

      setIsConfirmModalOpen(false);

      setReceipt({
        reference: data.payment?.reference || transferRef.trim(),
        amount: payAmount,
        date: new Date().toLocaleString("en-NG"),
        method: `Manual Bank Deposit (${sendingBank})`,
        transferRef: transferRef.trim(),
        depositorName: depositorName.trim(),
        newBalance: balance, // remains pending until bursar confirms
        status: "PENDING_BURSARY_VERIFICATION",
        studentName: invoice.student ? `${invoice.student.firstName} ${invoice.student.lastName}` : "Student",
        admissionNumber: invoice.student?.admissionNumber || "—",
        termName: invoice.term?.name || "First Term",
        isPending: true,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setIsConfirmModalOpen(false);
      setError(err.message || "Network error while submitting payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
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
            maxWidth: 580,
            maxHeight: "92vh",
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
            border: "1px solid var(--color-border, #E2E8F0)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-border, #E2E8F0)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "var(--color-page, #F8FAFC)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary, #64748B)", textTransform: "uppercase" }}>
                Bright Future Academy &bull; Bursary Portal
              </div>
              <h3 style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--color-brand-navy, #0B2545)" }}>
                {receipt ? "Payment Submission Slip" : "School Fee Payment"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                padding: 4,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: "20px 24px", overflowY: "auto" }}>
            {receipt ? (
              /* Official Payment Submission Acknowledgement Slip (Standard A4 Format) */
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Official Letterhead */}
                <div style={{ textAlign: "center", borderBottom: "2px solid #0B2545", paddingBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                    <img
                      src="/school-logo.png"
                      alt="Bright Future Academy"
                      style={{ width: 44, height: 44, objectFit: "contain" }}
                    />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#0B2545", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                    BRIGHT FUTURE ACADEMY
                  </div>
                  <div style={{ fontSize: 10, fontStyle: "italic", color: "#C5A059", margin: "2px 0", fontWeight: 700 }}>
                    &quot;Guided By Principles, Driven By Purpose&quot;
                  </div>
                  <div style={{ fontSize: 9.5, color: "#475569" }}>
                    Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State
                  </div>
                  <div style={{ fontSize: 9.5, color: "#475569" }}>
                    Treasury &amp; Bursary Office &bull; Tel: 08029839848
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      padding: "3px 12px",
                      backgroundColor: "#0B2545",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 800,
                      borderRadius: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Payment Submission Acknowledgement Slip (Standard A4 Format)
                  </div>
                </div>

                {/* Status Box */}
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    backgroundColor: "#FEF3C7",
                    border: "1px solid #FCD34D",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#92400E", fontWeight: 800, fontSize: 13.5 }}>
                    Submission Received &bull; Queued for Bursary Verification
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#B45309", marginTop: 4 }}>
                    ₦{receipt.amount.toLocaleString("en-NG")}
                  </div>
                  <div style={{ fontSize: 11, color: "#92400E", marginTop: 4, fontFamily: "monospace" }}>
                    System Reference: {receipt.reference}
                  </div>
                </div>

                {/* Important Reassurance & Consequence Notice */}
                <div
                  style={{
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 12,
                    color: "#991B1B",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>
                    Important: Do Not Submit Another Payment for This Invoice
                  </div>
                  <div>
                    Your submission has been sent to the School Bursar for bank reconciliation.
                    Once the payment is confirmed, the invoice will officially clear to <strong>PAID</strong>, and your certified official receipt will be available to print directly from your portal.
                  </div>
                </div>

                {/* Itemized Slip Details */}
                <div
                  style={{
                    backgroundColor: "var(--color-page, #F8FAFC)",
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    border: "1px solid var(--color-border, #E2E8F0)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Student Name:</span>
                    <strong>{receipt.studentName}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Admission Number:</span>
                    <strong style={{ fontFamily: "monospace" }}>{receipt.admissionNumber}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Academic Term:</span>
                    <strong>{receipt.termName}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Transfer / Teller Ref:</span>
                    <strong style={{ fontFamily: "monospace" }}>{receipt.transferRef}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Depositor:</span>
                    <strong>{receipt.depositorName}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Submission Timestamp:</span>
                    <span>{receipt.date}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "10px 14px", fontWeight: 700 }}
                    onClick={() => window.print()}
                  >
                    Print Submission Slip (Standard A4 Format)
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "10px 14px", fontWeight: 700, backgroundColor: "#0B2545" }}
                    onClick={onClose}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            ) : invoice.payments?.some((p) => p.status === "PENDING") ? (
              /* Pending Payment Lock View */
              (() => {
                const pending = invoice.payments.find((p) => p.status === "PENDING")!;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "10px 0" }}>
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        backgroundColor: "#FEF3C7",
                        border: "1px solid #FCD34D",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ color: "#92400E", fontWeight: 800, fontSize: 15 }}>
                        Payment Already Submitted &bull; Awaiting Bursary Verification
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#B45309", marginTop: 8 }}>
                        ₦{Number(pending.amount).toLocaleString("en-NG")}
                      </div>
                      <div style={{ fontSize: 12, color: "#92400E", marginTop: 4, fontFamily: "monospace" }}>
                        Reference: {pending.reference}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#FFFBEB",
                        border: "1px solid #FDE68A",
                        borderRadius: 10,
                        padding: "12px 14px",
                        fontSize: 12.5,
                        color: "#92400E",
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>
                        Duplicate Submission Prevention
                      </div>
                      <div>
                        A payment submission is already queued for verification by the School Bursar.
                        To prevent duplicate bank deductions, additional submissions for this invoice are locked until the Bursary completes verification.
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "var(--color-page, #F8FAFC)",
                        borderRadius: 10,
                        padding: 14,
                        fontSize: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        border: "1px solid var(--color-border, #E2E8F0)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--color-text-secondary)" }}>Channel:</span>
                        <strong style={{ textTransform: "capitalize" }}>{pending.method?.replace(/_/g, " ").toLowerCase() || "Bank Transfer"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--color-text-secondary)" }}>Submitted At:</span>
                        <span>{pending.createdAt ? new Date(pending.createdAt).toLocaleString("en-NG") : "Recently"}</span>
                      </div>
                      {pending.notes && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--color-text-secondary)" }}>Details:</span>
                          <span style={{ fontStyle: "italic", fontSize: 11 }}>{pending.notes}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "10px 14px", fontWeight: 700 }}
                      onClick={onClose}
                    >
                      Close Window
                    </button>
                  </div>
                );
              })()
            ) : (
              /* Two-Action Payment Form */
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Balance Summary Card */}
                <div
                  style={{
                    backgroundColor: "var(--color-page, #F8FAFC)",
                    padding: 14,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "1px solid var(--color-border, #E2E8F0)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                      Outstanding Fee Balance
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--color-danger, #B91C1C)" }}>
                      ₦{balance.toLocaleString("en-NG")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 11, color: "var(--color-text-secondary)" }}>
                    <div>Total Billed: ₦{invoice.totalAmount.toLocaleString("en-NG")}</div>
                    <div>Already Paid: ₦{invoice.paidAmount.toLocaleString("en-NG")}</div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div
                    style={{
                      backgroundColor: "#FEF2F2",
                      color: "#991B1B",
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Two Payment Actions Selector */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: "var(--color-ink)", marginBottom: 8, display: "block" }}>
                    Select Payment Method (2 Available Actions)
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {/* Action 1: Offline / Manual Bank Transfer */}
                    <button
                      type="button"
                      onClick={() => setMethod("MANUAL_OFFLINE")}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        textAlign: "left",
                        border: method === "MANUAL_OFFLINE" ? "2px solid #0E7D75" : "1px solid var(--color-border, #E2E8F0)",
                        backgroundColor: method === "MANUAL_OFFLINE" ? "#ECFDF5" : "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 13, color: method === "MANUAL_OFFLINE" ? "#065F46" : "#0B2545" }}>
                        Offline / Manual Payment
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                        Direct Bank Transfer &bull; Teller Deposit
                      </div>
                    </button>

                    {/* Action 2: Paystack Gateway (Under Process) */}
                    <button
                      type="button"
                      onClick={() => setMethod("PAYSTACK")}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        textAlign: "left",
                        border: method === "PAYSTACK" ? "2px solid #D97706" : "1px solid var(--color-border, #E2E8F0)",
                        backgroundColor: method === "PAYSTACK" ? "#FFFBEB" : "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 13, color: method === "PAYSTACK" ? "#92400E" : "#0B2545" }}>
                        Paystack Gateway
                      </div>
                      <div style={{ fontSize: 11, color: "#92400E", marginTop: 2, fontWeight: 600 }}>
                        Integration Under Process
                      </div>
                    </button>
                  </div>
                </div>

                {/* View for Option 1: Manual / Offline Payment */}
                {method === "MANUAL_OFFLINE" && (
                  <form onSubmit={handleInitiateSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Official Bank Account Information */}
                    <div
                      style={{
                        backgroundColor: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                        borderRadius: 10,
                        padding: 14,
                        fontSize: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "#166534", marginBottom: 2 }}>
                        School Official Bank Account Details
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4B5563" }}>Bank Name:</span>
                        <strong>Guaranty Trust Bank (GTBank Plc)</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4B5563" }}>Account Name:</span>
                        <strong>Bright Future Academy, Kashere</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4B5563" }}>Account Number:</span>
                        <strong style={{ fontSize: 13, letterSpacing: "0.06em", color: "#15803D" }}>0123456789</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4B5563" }}>Branch Location:</span>
                        <span>Kashere, Akko LGA, Gombe State</span>
                      </div>
                    </div>

                    {/* Amount to Submit */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Amount Paid (₦) *</label>
                        <button
                          type="button"
                          onClick={() => setAmount(balance.toString())}
                          style={{ background: "none", border: "none", color: "#0E7D75", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          Fill Full Balance
                        </button>
                      </div>
                      <input
                        type="number"
                        className="input"
                        min="100"
                        max={balance}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{ width: "100%", fontWeight: 800, fontSize: 14 }}
                        required
                      />
                    </div>

                    {/* Transfer Reference & Depositor Name Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Transfer / Teller Ref *
                        </label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. TRF-928341"
                          value={transferRef}
                          onChange={(e) => setTransferRef(e.target.value)}
                          style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Depositor Name *
                        </label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Mallam Ibrahim Musa"
                          value={depositorName}
                          onChange={(e) => setDepositorName(e.target.value)}
                          style={{ width: "100%", fontSize: 12 }}
                          required
                        />
                      </div>
                    </div>

                    {/* Sending Bank & Depositor Phone */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Sending Bank *
                        </label>
                        <select
                          className="input"
                          value={sendingBank}
                          onChange={(e) => setSendingBank(e.target.value)}
                          style={{ width: "100%", fontSize: 12 }}
                        >
                          <option value="GTBank">GTBank</option>
                          <option value="Access Bank">Access Bank</option>
                          <option value="First Bank">First Bank</option>
                          <option value="Zenith Bank">Zenith Bank</option>
                          <option value="United Bank for Africa (UBA)">UBA</option>
                          <option value="Stanbic IBTC">Stanbic IBTC</option>
                          <option value="Fidelity Bank">Fidelity Bank</option>
                          <option value="OPay">OPay</option>
                          <option value="Palmpay">Palmpay</option>
                          <option value="Kuda Bank">Kuda Bank</option>
                          <option value="Direct Cash Deposit">Bank Branch Cash Teller</option>
                          <option value="Other Bank">Other Bank</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Phone Number (Optional)
                        </label>
                        <input
                          type="text"
                          className="input"
                          placeholder="080XXXXXXXX"
                          value={depositorPhone}
                          onChange={(e) => setDepositorPhone(e.target.value)}
                          style={{ width: "100%", fontSize: 12 }}
                        />
                      </div>
                    </div>

                    {/* Form Submit Button */}
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
                          backgroundColor: "#0B2545",
                          fontWeight: 700,
                        }}
                      >
                        Submit Payment for Bursary Verification
                      </button>
                    </div>
                  </form>
                )}

                {/* View for Option 2: Paystack Gateway (Under Process Notice) */}
                {method === "PAYSTACK" && (
                  <div
                    style={{
                      backgroundColor: "#FFFBEB",
                      border: "1px solid #FCD34D",
                      borderRadius: 12,
                      padding: 20,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        backgroundColor: "#FDE68A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                        color: "#92400E",
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>

                    <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "#92400E" }}>
                      Paystack Online Gateway Under Process
                    </h4>
                    <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#78350F", lineHeight: 1.5 }}>
                      Direct debit card and automated online gateway payments via Paystack are currently undergoing final system verification with the payment network.
                      Please use the <strong>Offline / Manual Payment</strong> option to submit your bank transfer details, or pay directly at the School Bursary cash desk.
                    </p>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setMethod("MANUAL_OFFLINE")}
                      style={{
                        backgroundColor: "#0B2545",
                        fontSize: 12.5,
                        fontWeight: 700,
                        padding: "8px 18px",
                      }}
                    >
                      Switch to Offline / Manual Bank Transfer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2-Step Action Confirmation Modal before submitting payment */}
      <ActionConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Confirm Payment Submission to School Bursar"
        message={`Confirm submission of ₦${Number(amount || 0).toLocaleString("en-NG")} for student ${invoice.student?.firstName} ${invoice.student?.lastName}.`}
        warningNote="Your payment submission will be forwarded to the School Bursary for bank verification. Once verified, the invoice will be marked as PAID and your official school receipt will be available for printing."
        confirmVariant="success"
        confirmText="Confirm &amp; Dispatch to Bursar"
        cancelText="Review Details"
        isProcessing={loading}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={executePaymentSubmission}
        details={[
          {
            label: "Student",
            value: invoice.student ? `${invoice.student.firstName} ${invoice.student.lastName}` : "Student",
          },
          {
            label: "Admission No",
            value: invoice.student?.admissionNumber || "—",
          },
          {
            label: "Amount Paid",
            value: `₦${Number(amount || 0).toLocaleString("en-NG")}`,
            highlight: true,
          },
          {
            label: "School Account",
            value: "GTBank - 0123456789",
          },
          {
            label: "Transfer Reference",
            value: transferRef,
          },
          {
            label: "Depositor Name",
            value: depositorName,
          },
          {
            label: "Sending Bank",
            value: sendingBank,
          },
        ]}
      />
    </>
  );
}
