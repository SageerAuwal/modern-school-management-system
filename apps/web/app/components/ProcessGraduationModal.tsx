"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface GraduationDataPayload {
  graduationYear: string;
  honors: string;
  conductAppraisal: string;
  extraCurriculars: string;
  principalRemarks: string;
}

export interface ProcessGraduationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string | null;
    currentClass: string;
    level: string;
  };
  onSuccess: (data: GraduationDataPayload) => void;
}

export default function ProcessGraduationModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: ProcessGraduationModalProps) {
  const [graduationYear, setGraduationYear] = useState("2025/2026");
  const [honors, setHonors] = useState("Distinction / First Class Standing");
  const [conductAppraisal, setConductAppraisal] = useState(
    "During their period of study at Bright Future Academy, their conduct was found to be exemplary, obedient, and of high moral integrity. They showed commendable civic diligence and strict adherence to school regulations."
  );
  const [extraCurriculars, setExtraCurriculars] = useState(
    "Active participant in the Literary & Debating Society, STEM Club, and Inter-House Athletics."
  );
  const [principalRemarks, setPrincipalRemarks] = useState(
    "A diligent, upright, and dedicated scholar. Highly recommended for admission to any advanced institution of learning."
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const isPrimary =
    student.level.toUpperCase().includes("PRI") ||
    student.level.toUpperCase().includes("BASIC") ||
    student.level.toUpperCase().includes("CLASS 6");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/api/v1/students/${student.id}/graduate`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remarks: principalRemarks,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to process student graduation.");
      }

      const payload: GraduationDataPayload = {
        graduationYear,
        honors,
        conductAppraisal,
        extraCurriculars,
        principalRemarks,
      };

      onSuccess(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error processing graduation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="process-graduation-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "color-mix(in srgb, var(--color-ink, #0B2545) 60%, transparent)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        padding: "32px 16px 64px 16px",
        overflowY: "auto",
      }}
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="card"
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 24,
          backgroundColor: "#FFFFFF",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 id="process-graduation-title" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
              Process Student Graduation &amp; Certification
            </h2>
            <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Terminal Class Exit for {student.firstName} {student.lastName} ({student.currentClass})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              border: "none",
              background: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--color-text-secondary)",
            }}
            aria-label="Close graduation dialog"
          >
            &times;
          </button>
        </div>

        {/* Warning / Audit Notice */}
        <div
          style={{
            padding: "12px 14px",
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: "var(--radius-control)",
            fontSize: 12.5,
            color: "#1E40AF",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          <strong>Institutional Milestone:</strong> Transitioning this student to <strong>GRADUATED</strong> will close active classroom enrollments, record their exit in the institutional audit log, and generate their official {isPrimary ? "Primary School Leaving Certificate" : "Senior Secondary School Testimonial (SSCE)"}.
        </div>

        {error && (
          <div className="pill-danger" style={{ marginBottom: 14, padding: "8px 12px", fontSize: 12.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label" htmlFor="graduation-year-input">
                Academic Session of Completion *
              </label>
              <input
                id="graduation-year-input"
                type="text"
                className="input"
                required
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="e.g. 2025/2026"
              />
            </div>

            <div>
              <label className="label" htmlFor="honors-select">
                Honors / Academic Standing *
              </label>
              <select
                id="honors-select"
                className="input"
                value={honors}
                onChange={(e) => setHonors(e.target.value)}
              >
                <option value="Distinction / First Class Standing">Distinction / First Class Standing</option>
                <option value="Merit / Upper Credit Standing">Merit / Upper Credit Standing</option>
                <option value="Credit Standing">Credit Standing</option>
                <option value="Pass Standing">Pass Standing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="conduct-appraisal-input">
              Conduct &amp; Character Appraisal *
            </label>
            <textarea
              id="conduct-appraisal-input"
              className="input"
              rows={3}
              required
              value={conductAppraisal}
              onChange={(e) => setConductAppraisal(e.target.value)}
              style={{ fontSize: 12.5, resize: "vertical" }}
            />
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Printed directly on the official institutional testimonial.
            </div>
          </div>

          <div>
            <label className="label" htmlFor="extracurricular-input">
              Co-Curricular Activities &amp; Offices Held *
            </label>
            <input
              id="extracurricular-input"
              type="text"
              className="input"
              required
              value={extraCurriculars}
              onChange={(e) => setExtraCurriculars(e.target.value)}
              placeholder="e.g. Literary & Debating Society, Head Boy/Girl, Athletics"
            />
          </div>

          <div>
            <label className="label" htmlFor="principal-remarks-input">
              Principal&apos;s Attestation &amp; Final Recommendation *
            </label>
            <textarea
              id="principal-remarks-input"
              className="input"
              rows={2}
              required
              value={principalRemarks}
              onChange={(e) => setPrincipalRemarks(e.target.value)}
              style={{ fontSize: 12.5, resize: "vertical" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 10,
              paddingTop: 12,
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                backgroundColor: "var(--color-brand-navy, #0B2545)",
                borderColor: "var(--color-brand-navy, #0B2545)",
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {submitting ? "Processing..." : "Process Graduation & Issue Testimonial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
