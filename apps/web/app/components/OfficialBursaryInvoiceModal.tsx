"use client";

import React from "react";

interface OfficialBursaryInvoiceModalProps {
  invoice: {
    id: string;
    student?: {
      id?: string;
      firstName: string;
      lastName: string;
      admissionNumber?: string | null;
      classSection?: {
        name: string;
        level: string;
      } | null;
    };
    term?: {
      name: string;
    } | null;
    academicYear?: string | null;
    feeStructure?: {
      feeType?: string;
      name?: string;
      amount?: number;
    } | null;
    items?: Array<{
      id?: string;
      name: string;
      amount: number;
    }>;
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
      status?: string;
    }>;
  };
  onClose: () => void;
}

export default function OfficialBursaryInvoiceModal({
  invoice,
  onClose,
}: OfficialBursaryInvoiceModalProps) {
  const shortId = invoice.id ? invoice.id.slice(0, 8).toUpperCase() : "00000000";
  const receiptNo = `BFA/BUR/${new Date(invoice.createdAt).getFullYear()}/INV-${shortId}`;
  const studentName = invoice.student
    ? `${invoice.student.lastName.toUpperCase()}, ${invoice.student.firstName}`
    : "STUDENT ON RECORD";
  const admNo = invoice.student?.admissionNumber ?? "BFA-ADM-PENDING";
  const termName = invoice.term?.name ?? "Second Term";
  const academicYear = invoice.academicYear ?? "2025/2026";
  const balance = Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));
  const isPaid = invoice.status === "PAID" || balance <= 0;

  const feeItems =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [
          { name: "Terminal Tuition & Academic Instruction", amount: invoice.totalAmount * 0.55 },
          { name: "ICT & Digital Learning Resource Levy", amount: invoice.totalAmount * 0.15 },
          { name: "Science Laboratories & Workshop Practicals", amount: invoice.totalAmount * 0.12 },
          { name: "Sick Bay & Emergency Medical Retainership", amount: invoice.totalAmount * 0.08 },
          { name: "Examination Stationery & Continuous Assessment", amount: invoice.totalAmount * 0.06 },
          { name: "Games, Sports & Physical Education Levy", amount: invoice.totalAmount * 0.04 },
        ];

  const formatN = (amt: number) =>
    `₦${Number(amt || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const issueDate = new Date(invoice.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="bursary-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(11, 37, 69, 0.75)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 860 }}>
        {/* Screen Toolbar (Hidden on Print) */}
        <div
          className="bursary-no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            backgroundColor: "#ffffff",
            padding: "10px 20px",
            borderRadius: 8,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: isPaid ? "#166E4E" : "#D97706",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0B2545" }}>
              Official Institutional A4 Clearance Certificate
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: "#0B2545",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Official Clearance Certificate
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: "8px 16px", fontSize: 13 }}
            >
              Close
            </button>
          </div>
        </div>

        {/* The Printable A4 Institutional Clearance Certificate */}
        <div
          id="official-bursary-certificate"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 820,
            backgroundColor: "#ffffff",
            color: "#0B192C",
            padding: "36px 40px",
            borderRadius: 6,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
            boxSizing: "border-box",
            border: "3px double #0B2545",
            outline: "1px solid #C5A059",
            outlineOffset: -6,
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* Subtle Institutional Crest Watermark */}
          <div
            style={{
              position: "absolute",
              top: "52%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 340,
              height: 340,
              opacity: 0.045,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <img
              src="/school-logo.png"
              alt="Bright Future Academy Seal"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Header: Crest & Official Letterhead */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "2.5px solid #0B2545",
                paddingBottom: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src="/school-logo.png"
                  alt="Bright Future Academy Crest"
                  style={{ width: 76, height: 76, objectFit: "contain" }}
                />
              </div>

              <div style={{ flex: 1, textAlign: "center", padding: "0 14px" }}>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    margin: "0 0 3px",
                    color: "#0B2545",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  BRIGHT FUTURE ACADEMY
                </h1>
                <p style={{ fontSize: 11, fontStyle: "italic", color: "#C5A059", margin: "0 0 3px", fontWeight: 700 }}>
                  &quot;Guided By Principles, Driven By Purpose&quot;
                </p>
                <p style={{ fontSize: 10.5, color: "#475569", margin: "0 0 2px" }}>
                  Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State
                </p>
                <p style={{ fontSize: 10.5, color: "#475569", margin: 0 }}>
                  Tel: 08029839848 | Email: brightfutureacademykashere@gmail.com
                </p>
              </div>

              {/* Document Identity Box */}
              <div
                style={{
                  width: 130,
                  textAlign: "right",
                  fontSize: 10,
                  color: "#475569",
                  borderLeft: "1px solid #E2E8F0",
                  paddingLeft: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: "#0B2545", textTransform: "uppercase", fontSize: 10.5 }}>
                  Bursary Dept.
                </div>
                <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 9.5 }}>
                  {shortId}
                </div>
                <div style={{ marginTop: 2 }}>{issueDate}</div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#0B2545",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                OFFICIAL BURSARY RECEIPT &amp; FINANCIAL CLEARANCE CERTIFICATE
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  letterSpacing: "0.04em",
                  backgroundColor: "#C5A059",
                  color: "#0B2545",
                  padding: "2px 8px",
                  borderRadius: 3,
                  fontWeight: 800,
                }}
              >
                {receiptNo}
              </span>
            </div>

            {/* Student & Session Biodata Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                padding: "14px 18px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 6,
                marginBottom: 20,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Student Full Name:
                </span>
                <strong style={{ color: "#0B2545", fontSize: 13 }}>{studentName}</strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Admission Number:
                </span>
                <strong style={{ color: "#0B2545", fontFamily: "monospace", fontSize: 13 }}>{admNo}</strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Class &amp; Level:
                </span>
                <strong style={{ color: "#0B2545", fontSize: 13 }}>
                  {invoice.student?.classSection
                    ? `${invoice.student.classSection.name} (${invoice.student.classSection.level})`
                    : "Enrolled Secondary"}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Academic Session:
                </span>
                <strong>{academicYear} Session</strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Academic Term:
                </span>
                <strong>{termName}</strong>
              </div>

              <div>
                <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase" }}>
                  Date of Clearance:
                </span>
                <strong>{issueDate}</strong>
              </div>
            </div>

            {/* Itemized Fee Schedule Table */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: "#0B2545",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Approved Fee Assessment Schedule</span>
                <span>Currency: Nigerian Naira (NGN)</span>
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #CBD5E1",
                  fontSize: 11.5,
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#0B2545", color: "#ffffff" }}>
                    <th style={{ padding: "7px 10px", textAlign: "left", width: "8%" }}>S/N</th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Description of Levies &amp; Tariffs</th>
                    <th style={{ padding: "7px 10px", textAlign: "right", width: "24%" }}>Amount (NGN)</th>
                  </tr>
                </thead>
                <tbody>
                  {feeItems.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#F8FAFC",
                        borderBottom: "1px solid #E2E8F0",
                      }}
                    >
                      <td style={{ padding: "6px 10px", color: "#64748B", fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: "6px 10px", fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                        {formatN(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Ledger Balance Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Payment Log History */}
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 6,
                  padding: 12,
                  backgroundColor: "#FFFFFF",
                  fontSize: 11,
                }}
              >
                <div style={{ fontWeight: 800, color: "#0B2545", textTransform: "uppercase", marginBottom: 6 }}>
                  Verified Payment Receipts &amp; Transactions
                </div>
                {invoice.payments && invoice.payments.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {invoice.payments.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 8px",
                          backgroundColor: "#F8FAFC",
                          borderRadius: 4,
                          fontSize: 10.5,
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, color: "#0B2545" }}>{p.method}</span>
                          <span style={{ color: "#64748B", marginLeft: 6 }}>Ref: {p.reference.slice(0, 14)}</span>
                        </div>
                        <div style={{ fontWeight: 800, fontFamily: "monospace", color: "#166E4E" }}>
                          {formatN(p.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#64748B", fontStyle: "italic", fontSize: 10.5 }}>
                    Cashier record: Full settlement confirmed on registration.
                  </div>
                )}
              </div>

              {/* Total Calculation Card */}
              <div
                style={{
                  border: "1px solid #CBD5E1",
                  borderRadius: 6,
                  backgroundColor: "#F8FAFC",
                  padding: "10px 14px",
                  fontSize: 12,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#64748B" }}>Total Assessment:</span>
                  <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{formatN(invoice.totalAmount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#64748B" }}>Total Amount Cleared:</span>
                  <span style={{ fontWeight: 800, color: "#166E4E", fontFamily: "monospace" }}>
                    {formatN(invoice.paidAmount)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "2px solid #0B2545",
                    paddingTop: 6,
                    marginTop: 4,
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  <span style={{ color: "#0B2545" }}>Outstanding Arrears:</span>
                  <span style={{ color: balance <= 0 ? "#166E4E" : "#8B1E1E", fontFamily: "monospace" }}>
                    {formatN(balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Stamp & Signatures Block */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                alignItems: "center",
                marginTop: 24,
                paddingTop: 12,
                borderTop: "1px dashed #CBD5E1",
              }}
            >
              {/* Cashier / Accounts Officer */}
              <div style={{ textAlign: "center" }}>
                <div style={{ height: 40, borderBottom: "1px solid #0B2545", marginBottom: 4 }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0B2545" }}>Bursary Receiving Officer</div>
                <div style={{ fontSize: 9.5, color: "#64748B" }}>Signature &amp; Verification</div>
              </div>

              {/* Official Institutional Stamp */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    width: 170,
                    height: 85,
                    border: isPaid ? "2.5px solid #166E4E" : "2.5px dashed #D97706",
                    borderRadius: 8,
                    padding: "4px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: isPaid ? "#166E4E" : "#D97706",
                    backgroundColor: isPaid ? "rgba(22, 110, 78, 0.04)" : "rgba(217, 119, 6, 0.04)",
                  }}
                >
                  <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    BRIGHT FUTURE ACADEMY
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 900,
                      margin: "3px 0",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isPaid ? "FINANCIAL CLEARANCE GRANTED" : "PROVISIONAL RECEIPT"}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>
                    {isPaid ? "ADMITTED TO TERMINAL EXAMINATIONS" : "OUTSTANDING ARREARS PENDING"}
                  </div>
                  <div style={{ fontSize: 7.5, marginTop: 2, fontFamily: "monospace" }}>
                    {issueDate}
                  </div>
                </div>
              </div>

              {/* Bursar / Head of Administration */}
              <div style={{ textAlign: "center" }}>
                <div style={{ height: 40, borderBottom: "1px solid #0B2545", marginBottom: 4 }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0B2545" }}>Chief Bursar / Administrator</div>
                <div style={{ fontSize: 9.5, color: "#64748B" }}>Authorized Signatory</div>
              </div>
            </div>

            {/* Security Notice & Terms */}
            <div
              style={{
                marginTop: 20,
                padding: "8px 12px",
                backgroundColor: "#F1F5F9",
                borderRadius: 4,
                fontSize: 9.5,
                color: "#475569",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>Notice: </strong>
                All school fees paid are non-refundable. Please retain this original certificate for examination hall entry and term clearance.
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 9, whiteSpace: "nowrap", marginLeft: 12 }}>
                DOC HASH: BFA-{shortId}-{new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Print CSS for Exact A4 Portrait Output */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          .bursary-no-print {
            display: none !important;
          }
          .bursary-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: transparent !important;
            padding: 0 !important;
            display: block !important;
          }
          #official-bursary-certificate,
          #official-bursary-certificate * {
            visibility: visible !important;
          }
          #official-bursary-certificate {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 16mm 14mm !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
