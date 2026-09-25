"use client";

import React from "react";

export interface ActionDetail {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface ActionConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  warningNote?: string;
  details?: ActionDetail[];
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger" | "success";
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ActionConfirmationModal({
  isOpen,
  title,
  message,
  warningNote,
  details = [],
  confirmText = "Confirm & Proceed",
  cancelText = "Cancel",
  confirmVariant = "primary",
  isProcessing = false,
  onConfirm,
  onCancel,
}: ActionConfirmationModalProps) {
  if (!isOpen) return null;

  const btnBg =
    confirmVariant === "danger"
      ? "var(--color-danger, #B91C1C)"
      : confirmVariant === "success"
      ? "var(--color-success-text, #166E4E)"
      : "var(--color-brand-navy, #0B2545)";

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
        if (e.target === e.currentTarget && !isProcessing) onCancel();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 460,
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          padding: 24,
          boxShadow: "0 20px 35px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid var(--color-border, #E2E8F0)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: confirmVariant === "danger" ? "#FEE2E2" : "#EFF6FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: confirmVariant === "danger" ? "#B91C1C" : "#1D4ED8",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "var(--color-ink, #182220)" }}>
            {title}
          </h3>
        </div>

        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--color-text-secondary, #64748B)", lineHeight: 1.45 }}>
          {message}
        </p>

        {/* Structured Details Box */}
        {details.length > 0 && (
          <div
            style={{
              backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
              borderRadius: 8,
              border: "1px solid var(--color-border, #E2E8F0)",
              padding: "10px 14px",
              marginBottom: 14,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 12,
            }}
          >
            {details.map((d, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--color-text-secondary, #64748B)" }}>{d.label}:</span>
                <span
                  style={{
                    fontWeight: d.highlight ? 900 : 700,
                    color: d.highlight ? "var(--color-brand-navy, #0B2545)" : "var(--color-ink, #182220)",
                    fontSize: d.highlight ? 13 : 12,
                  }}
                >
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Warning Note */}
        {warningNote && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              backgroundColor: "#FFFBEB",
              border: "1px solid #FDE68A",
              fontSize: 11,
              color: "#92400E",
              marginBottom: 16,
              lineHeight: 1.4,
            }}
          >
            <strong>Caution:</strong> {warningNote}
          </div>
        )}

        {/* Modal Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isProcessing}
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            disabled={isProcessing}
            style={{
              backgroundColor: btnBg,
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 800,
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              cursor: isProcessing ? "not-allowed" : "pointer",
            }}
          >
            {isProcessing ? "Processing, Please Wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
