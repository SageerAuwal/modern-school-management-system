"use client";

import { useEffect, useRef } from "react";

export interface GraduationTestimonialProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    otherNames?: string | null;
    admissionNumber?: string | null;
    enrolledAt?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    stateOfOrigin?: string | null;
    lga?: string | null;
    enrollmentStatus: string;
    enrollments?: Array<{
      id: string;
      academicYear: string;
      classSection: { name: string; level: string };
    }>;
    school?: {
      name: string;
      address?: string | null;
      state?: string | null;
      lga?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
  };
  graduationData?: {
    graduationYear?: string;
    honors?: string;
    conductAppraisal?: string;
    extraCurriculars?: string;
    principalRemarks?: string;
  };
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function OfficialGraduationTestimonialModal({
  isOpen,
  onClose,
  student,
  graduationData,
}: GraduationTestimonialProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine terminal level (Primary vs Secondary)
  const currentOrTerminalEnrollment = student.enrollments?.[0];
  const levelUpper = (currentOrTerminalEnrollment?.classSection?.level || "").toUpperCase();
  const isPrimary =
    levelUpper.includes("PRI") ||
    levelUpper.includes("BASIC") ||
    levelUpper.includes("PRIMARY") ||
    levelUpper.includes("CLASS 6");

  const certificateType = isPrimary
    ? "PRIMARY SCHOOL LEAVING TESTIMONIAL & ATTESTATION OF CHARACTER"
    : "OFFICIAL SENIOR SECONDARY SCHOOL TESTIMONIAL & ATTESTATION OF CITIZENSHIP";

  const curriculumDescription = isPrimary
    ? "the Universal Basic Primary Education Curriculum as prescribed by the National Policy on Education"
    : "the Senior Secondary School Curriculum leading to the Senior School Certificate Examinations (SSCE / WAEC / NECO)";

  const admissionYear = student.enrolledAt ? new Date(student.enrolledAt).getFullYear() : 2020;
  const graduationYear = graduationData?.graduationYear || "2026";
  const serialNo = `BFA/TEST/${graduationYear}/${(student.admissionNumber || "0000").replace(/[^a-zA-Z0-9]/g, "")}`;

  const characterText =
    graduationData?.conductAppraisal ||
    "During their period of study at Bright Future Academy, their conduct was found to be exemplary, obedient, and of high moral integrity. They showed commendable civic diligence and strict adherence to school regulations.";

  const honorsText = graduationData?.honors || "Graduated with Distinction and Good Academic Standing";
  const extraCurricularText =
    graduationData?.extraCurriculars ||
    "Active participant in the Literary & Debating Society, STEM Club, and Inter-House Athletics.";

  const principalRemarksText =
    graduationData?.principalRemarks ||
    "A diligent, upright, and dedicated scholar. Highly recommended for admission to any advanced institution of learning.";

  const schoolName = student.school?.name || "Bright Future Academy";
  const schoolAddress =
    student.school?.address || "Gombe Road, Kashere, Gombe State, Nigeria";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="testimonial-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "color-mix(in srgb, var(--color-ink, #0B2545) 65%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        padding: "20px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="card"
        style={{
          width: "100%",
          maxWidth: 900,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(11, 37, 69, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div
          className="no-print"
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--color-border, #E2E8F0)",
            backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-brand-navy, #0B2545)",
              }}
            >
              Institutional Certification Office
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary, #64748B)" }}>
              &middot; Official School Testimonial
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-primary"
              style={{
                fontSize: 12.5,
                padding: "6px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Testimonial (A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: 12.5, padding: "6px 12px" }}
              aria-label="Close testimonial modal"
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable Printable Certificate */}
        <div
          id="printable-testimonial-area"
          style={{
            padding: "40px",
            overflowY: "auto",
            backgroundColor: "#FCFDFD",
            color: "#0F172A",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {/* Certificate Double Border */}
          <div
            style={{
              border: "4px double var(--color-brand-navy, #0B2545)",
              padding: "36px 32px",
              backgroundColor: "#FFFFFF",
              position: "relative",
            }}
          >
            {/* Header / Coat of Arms */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--color-brand-teal, #0E7D75)",
                  fontFamily: "system-ui, sans-serif",
                  marginBottom: 6,
                }}
              >
                FEDERAL REPUBLIC OF NIGERIA &middot; GOMBE STATE
              </div>

              <h1
                id="testimonial-title"
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  margin: "0 0 4px 0",
                  color: "var(--color-brand-navy, #0B2545)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {schoolName}
              </h1>

              <div
                style={{
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "#334155",
                  marginBottom: 4,
                }}
              >
                Motto: &ldquo;Excellence and Integrity&rdquo;
              </div>

              <div
                style={{
                  fontSize: 11.5,
                  color: "#64748B",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {schoolAddress} &middot; Government Approved Examination Center
              </div>

              {/* Certificate Title Banner */}
              <div
                style={{
                  marginTop: 20,
                  padding: "8px 16px",
                  borderTop: "2px solid var(--color-brand-navy, #0B2545)",
                  borderBottom: "2px solid var(--color-brand-navy, #0B2545)",
                  backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
                }}
              >
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-brand-navy, #0B2545)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {certificateType}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "#64748B",
                    fontFamily: "monospace",
                    marginTop: 2,
                  }}
                >
                  Serial Reference: {serialNo}
                </div>
              </div>
            </div>

            {/* Candidate Formal Declaration */}
            <div
              style={{
                fontSize: 14.5,
                lineHeight: 1.8,
                color: "#1E293B",
                textAlign: "justify",
                marginBottom: 24,
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontStyle: "italic",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#64748B",
                    display: "block",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  This is to officially certify that
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--color-brand-navy, #0B2545)",
                    borderBottom: "1px solid #CBD5E1",
                    padding: "2px 20px",
                    display: "inline-block",
                    margin: "6px 0",
                    textTransform: "uppercase",
                  }}
                >
                  {student.firstName} {student.otherNames || ""} {student.lastName}
                </span>
              </div>

              <p style={{ margin: "0 0 14px 0", textIndent: "2em" }}>
                whose admission number is <strong style={{ fontFamily: "monospace" }}>{student.admissionNumber || "PENDING"}</strong>,
                was admitted into Bright Future Academy in the year <strong>{admissionYear}</strong> and completed their studies in the year <strong>{graduationYear}</strong>.
                The candidate has satisfactorily fulfilled all requirements prescribed by {curriculumDescription}.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  padding: "12px 18px",
                  backgroundColor: "var(--color-surface-subtle, #F8FAFC)",
                  borderRadius: 4,
                  border: "1px solid var(--color-border, #E2E8F0)",
                  fontSize: 12.5,
                  fontFamily: "system-ui, sans-serif",
                  margin: "16px 0",
                }}
              >
                <div>
                  <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                    Date of Birth &amp; Gender
                  </span>
                  <span>{formatDate(student.dateOfBirth)} &middot; {student.gender || "—"}</span>
                </div>
                <div>
                  <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                    State of Origin &amp; LGA
                  </span>
                  <span>{student.stateOfOrigin || "—"} {student.lga ? `(${student.lga})` : ""}</span>
                </div>
                <div>
                  <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                    Academic Division Standing
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--color-brand-teal, #0E7D75)" }}>{honorsText}</span>
                </div>
                <div>
                  <span style={{ color: "#64748B", display: "block", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                    Financial &amp; Bursary Standing
                  </span>
                  <span style={{ fontWeight: 700, color: "#16A34A" }}>Officially Cleared &amp; Certified</span>
                </div>
              </div>

              {/* Appraisal Section */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-brand-navy, #0B2545)", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>
                  Conduct &amp; Character Appraisal:
                </div>
                <p style={{ margin: "4px 0 12px 0", fontStyle: "italic", fontSize: 13.5 }}>
                  &ldquo;{characterText}&rdquo;
                </p>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-brand-navy, #0B2545)", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>
                  Co-Curricular &amp; Leadership Activities:
                </div>
                <p style={{ margin: "4px 0 12px 0", fontSize: 13.5 }}>
                  {extraCurricularText}
                </p>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-brand-navy, #0B2545)", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>
                  Principal&apos;s Recommendation &amp; Attestation:
                </div>
                <p style={{ margin: "4px 0 0 0", fontStyle: "italic", fontSize: 13.5 }}>
                  &ldquo;{principalRemarksText}&rdquo;
                </p>
              </div>
            </div>

            {/* Endorsements & Seal */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 1fr",
                gap: 20,
                marginTop: 36,
                paddingTop: 16,
                alignItems: "end",
                textAlign: "center",
                fontFamily: "system-ui, sans-serif",
                pageBreakInside: "avoid",
              }}
            >
              <div>
                <div style={{ height: 44, borderBottom: "1px solid #000000", marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>Principal / Head of School</div>
                <div style={{ fontSize: 10.5, color: "#64748B" }}>Signature &amp; Date</div>
              </div>

              <div>
                <div
                  style={{
                    width: 100,
                    height: 100,
                    margin: "0 auto",
                    border: "3px double #94A3B8",
                    borderRadius: "50%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: "var(--color-brand-navy, #0B2545)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    lineHeight: 1.2,
                  }}
                >
                  <span>Official</span>
                  <span>Institutional</span>
                  <span>Seal</span>
                </div>
              </div>

              <div>
                <div style={{ height: 44, borderBottom: "1px solid #000000", marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>Chairman, Governing Board</div>
                <div style={{ fontSize: 10.5, color: "#64748B" }}>Signature &amp; Date</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-testimonial-area,
          #printable-testimonial-area * {
            visibility: visible;
          }
          #printable-testimonial-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm 15mm !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
