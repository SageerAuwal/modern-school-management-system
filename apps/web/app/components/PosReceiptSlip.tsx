"use client";

import React from "react";

interface PosReceiptSlipProps {
  invoice: {
    id: string;
    student?: {
      firstName: string;
      lastName: string;
      admissionNumber?: string | null;
    };
    term?: {
      name: string;
    } | null;
    academicYear?: string | null;
    items?: Array<{
      id?: string;
      name: string;
      amount: number;
    }>;
    feeStructure?: {
      feeType?: string;
      name?: string;
    } | null;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate?: string | null;
    createdAt: string;
    payments?: Array<{
      id: string;
      amount: number;
      method: string;
      reference: string;
      createdAt: string;
    }>;
  };
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  onClose?: () => void;
}

export default function PosReceiptSlip({
  invoice,
  schoolName = "MODERN ACADEMY",
  schoolAddress = "12 Ahmadu Bello Way, Kano State",
  schoolPhone = "+234 800 123 4567",
  onClose,
}: PosReceiptSlipProps) {
  const shortId = invoice.id ? invoice.id.slice(0, 8).toUpperCase() : "";
  const studentName = invoice.student
    ? `${invoice.student.firstName} ${invoice.student.lastName}`.trim()
    : "—";
  const admNo = invoice.student?.admissionNumber ?? "—";
  const termName = invoice.term?.name ?? "Term";
  const academicYear = invoice.academicYear ?? "2025/2026";
  const balance = Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));

  const items =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : invoice.feeStructure
      ? [{ name: invoice.feeStructure.feeType || invoice.feeStructure.name || "School Fee", amount: invoice.totalAmount }]
      : [{ name: "Tuition & School Levies", amount: invoice.totalAmount }];

  const formatN = (amt: number) =>
    `₦${Number(amt || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const issueDate = new Date(invoice.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="pos-receipt-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
    >
      {/* Container for Print Styles & Preview Box */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* Action Buttons Toolbar (Hidden on Print) */}
        <div
          className="pos-no-print"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            backgroundColor: "var(--color-surface, #ffffff)",
            padding: "8px 16px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink, #111)" }}>
            POS / ATM Slip Preview (80mm)
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ padding: "6px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print Receipt</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              Close
            </button>
          )}
        </div>

        {/* The Physical POS / ATM Receipt Slip */}
        <div
          id="pos-receipt-slip"
          style={{
            width: "320px", // 80mm preview width on screen
            maxWidth: "100%",
            backgroundColor: "#ffffff",
            color: "#000000",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "12px",
            lineHeight: 1.35,
            padding: "20px 16px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
            borderRadius: "4px",
            boxSizing: "border-box",
            borderTop: "3px dashed #bbb",
            borderBottom: "3px dashed #bbb",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <div style={{ fontSize: "15px", fontWeight: "900", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {schoolName}
            </div>
            <div style={{ fontSize: "10px", marginTop: 2 }}>{schoolAddress}</div>
            <div style={{ fontSize: "10px" }}>Tel: {schoolPhone}</div>
            <div style={{ margin: "6px 0", fontWeight: "700", fontSize: "11px", letterSpacing: "0.04em" }}>
              ================================
            </div>
            <div style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase" }}>
              OFFICIAL PAYMENT SLIP
            </div>
            <div style={{ fontSize: "10px", textTransform: "uppercase" }}>
              STUDENT FEE RECEIPT
            </div>
            <div style={{ margin: "6px 0", fontWeight: "700", fontSize: "11px" }}>
              ================================
            </div>
          </div>

          {/* Metadata */}
          <div style={{ fontSize: "11px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>INVOICE:</span>
              <span style={{ fontWeight: "700" }}>INV-{shortId}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>DATE:</span>
              <span>{issueDate}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>ADM NO:</span>
              <span style={{ fontWeight: "700" }}>{admNo}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>STUDENT:</span>
              <span style={{ fontWeight: "700", textAlign: "right" }}>{studentName}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>TERM / YEAR:</span>
              <span>{termName} {academicYear}</span>
            </div>
          </div>

          {/* Separator */}
          <div style={{ margin: "6px 0", textAlign: "center", fontSize: "11px" }}>
            --------------------------------
          </div>

          {/* Itemized Table */}
          <div style={{ fontSize: "11px", marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", marginBottom: 4 }}>
              <span>DESCRIPTION</span>
              <span>AMOUNT</span>
            </div>
            <div style={{ margin: "2px 0 6px", fontSize: "11px" }}>
              --------------------------------
            </div>
            {items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span style={{ wordBreak: "break-word", paddingRight: 4 }}>
                  {it.name}
                </span>
                <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {formatN(it.amount)}
                </span>
              </div>
            ))}
          </div>

          {/* Separator */}
          <div style={{ margin: "6px 0", textAlign: "center", fontSize: "11px" }}>
            --------------------------------
          </div>

          {/* Totals Section */}
          <div style={{ fontSize: "12px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}>
              <span>TOTAL INVOICED:</span>
              <span>{formatN(invoice.totalAmount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}>
              <span>AMOUNT PAID:</span>
              <span>{formatN(invoice.paidAmount)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "900",
                fontSize: "13px",
                marginTop: 3,
                paddingTop: 3,
                borderTop: "1px dashed #000",
              }}
            >
              <span>BALANCE DUE:</span>
              <span>{formatN(balance)}</span>
            </div>
          </div>

          {/* Status Badge */}
          <div
            style={{
              textAlign: "center",
              margin: "10px 0",
              padding: "4px 8px",
              border: "1px solid #000",
              fontWeight: "900",
              fontSize: "12px",
              letterSpacing: "0.08em",
            }}
          >
            {invoice.status === "PAID"
              ? "*** PAID IN FULL ***"
              : invoice.status === "PARTIAL"
              ? "*** PARTIAL PAYMENT ***"
              : invoice.status === "UNPAID"
              ? "*** UNPAID INVOICE ***"
              : `*** ${invoice.status.toUpperCase()} ***`}
          </div>

          {/* Payment Details if available */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div style={{ fontSize: "10px", marginTop: 8 }}>
              <div style={{ fontWeight: "700", textDecoration: "underline", marginBottom: 2 }}>
                PAYMENT LOG:
              </div>
              {invoice.payments.map((p, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>{new Date(p.createdAt).toLocaleDateString("en-GB")}: {p.method}</span>
                  <span style={{ fontWeight: "700" }}>{formatN(p.amount)}</span>
                </div>
              ))}
              <div style={{ margin: "4px 0", fontSize: "11px" }}>
                --------------------------------
              </div>
            </div>
          )}

          {/* Footer & Barcode Simulation */}
          <div style={{ textAlign: "center", marginTop: 12, fontSize: "9px" }}>
            <div style={{ letterSpacing: "2px", fontWeight: "800", fontSize: "14px", margin: "4px 0" }}>
              ||| | |||| ||| || ||||| |||
            </div>
            <div style={{ fontSize: "10px", fontWeight: "700" }}>* {shortId} *</div>
            <div style={{ marginTop: 8, fontStyle: "italic" }}>
              Keep this thermal slip for official clearance.
            </div>
            <div style={{ fontSize: "9px", marginTop: 2 }}>
              Valid only with authorized school bursar stamp.
            </div>
            <div style={{ marginTop: 8, fontSize: "10px" }}>
              - - - - - - - - - - - - - - - -
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for 80mm & 58mm Thermal Printers */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          .pos-no-print {
            display: none !important;
          }
          .pos-receipt-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: transparent !important;
            padding: 0 !important;
            display: block !important;
          }
          #pos-receipt-slip,
          #pos-receipt-slip * {
            visibility: visible !important;
          }
          #pos-receipt-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 76mm !important;
            margin: 0 auto !important;
            padding: 6px 4px !important;
            box-shadow: none !important;
            border-top: none !important;
            border-bottom: none !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
        }
      `}</style>
    </div>
  );
}
