"use client";

import React, { useState } from "react";

export interface RejectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isProcessing?: boolean;
  paymentDetails?: {
    studentName?: string;
    admissionNumber?: string;
    amount?: number;
    reference?: string;
    method?: string;
  } | null;
}

const PRESET_REASONS = [
  "Transfer not reflected on school bank statement",
  "Incorrect amount transferred",
  "Invalid or unreadable transaction reference",
  "Duplicate submission by parent",
  "Payment credited to wrong account",
];

export default function RejectPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  paymentDetails,
}: RejectPaymentModalProps) {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customNote, setCustomNote] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalReason = customNote.trim()
      ? `${selectedReason}: ${customNote.trim()}`
      : selectedReason;
    onConfirm(finalReason);
  };

  return (
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
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          padding: 24,
          boxShadow: "0 20px 35px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid var(--color-border, #E2E8F0)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              backgroundColor: "#FEE2E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#B91C1C",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--color-ink, #182220)" }}>
              Reject Payment Submission
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary, #64748B)" }}>
              The payment record will be marked as unverified and failed.
            </p>
          </div>
        </div>

        {/* Transaction Summary Card */}
        {paymentDetails && (
          <div
            style={{
              backgroundColor: "var(--color-page, #F8FAFC)",
              border: "1px solid var(--color-border, #E2E8F0)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 12.5,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--color-text-secondary, #64748B)" }}>Student:</span>
              <span style={{ fontWeight: 600 }}>{paymentDetails.studentName || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--color-text-secondary, #64748B)" }}>Amount:</span>
              <span style={{ fontWeight: 700, color: "var(--color-danger, #B91C1C)" }}>
                ₦{Number(paymentDetails.amount || 0).toLocaleString("en-NG")}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--color-text-secondary, #64748B)" }}>Reference:</span>
              <span style={{ fontFamily: "monospace", fontSize: 11 }}>{paymentDetails.reference || "—"}</span>
            </div>
          </div>
        )}

        {/* Reason Selection */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-ink, #182220)" }}>
            Select Rejection Reason
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="input"
            style={{ width: "100%", fontSize: 13 }}
            disabled={isProcessing}
          >
            {PRESET_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Additional Note */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-ink, #182220)" }}>
            Additional Explanation for Parent / Auditor (Optional)
          </label>
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. Bank statement for 24-Sep shows no deposit matching this reference."
            className="input"
            rows={3}
            style={{ width: "100%", fontSize: 12.5, resize: "vertical" }}
            disabled={isProcessing}
          />
        </div>

        {/* Consequence Notice */}
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 11.5,
            color: "#991B1B",
            marginBottom: 20,
            lineHeight: 1.4,
          }}
        >
          Warning: Rejecting this payment leaves the student balance outstanding. The parent portal will indicate that the submission was rejected and show this explanation.
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isProcessing}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            Keep Pending
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleConfirm}
            disabled={isProcessing}
            style={{
              fontSize: 13,
              padding: "8px 16px",
              backgroundColor: "var(--color-danger, #B91C1C)",
              color: "#FFFFFF",
              border: "none",
              cursor: isProcessing ? "not-allowed" : "pointer",
            }}
          >
            {isProcessing ? "Rejecting..." : "Reject Submission"}
          </button>
        </div>
      </div>
    </div>
  );
}
