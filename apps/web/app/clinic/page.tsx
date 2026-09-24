"use client";

import { useState, useEffect, FormEvent } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface StudentHealthInfo {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalNotes: string | null;
  enrollments?: Array<{
    classSection: {
      id: string;
      name: string;
      level: string;
    };
  }>;
  clinicVisits?: Array<{
    visitDate: string;
    complaint: string;
    disposition: string;
  }>;
}

interface ClinicVisit {
  id: string;
  visitDate: string;
  complaint: string;
  symptoms: string | null;
  temperature: number | null;
  bloodPressure: string | null;
  pulseRate: number | null;
  weight: number | null;
  diagnosis: string | null;
  treatmentGiven: string | null;
  disposition: "RESTING_IN_BAY" | "RETURNED_TO_CLASS" | "SENT_HOME" | "REFERRED_TO_HOSPITAL";
  parentNotified: boolean;
  parentNotificationTime: string | null;
  referralHospital: string | null;
  referralReason: string | null;
  doctorNotes: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    bloodGroup: string | null;
    genotype: string | null;
    allergies: string | null;
    chronicConditions: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
  };
  nurse: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  dispenses?: Array<{
    id: string;
    quantity: number;
    dosage: string | null;
    inventory: {
      name: string;
      itemCode: string;
      unit: string;
    };
  }>;
}

interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  dosageForm: string | null;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  expiryDate: string | null;
  batchNumber: string | null;
  locationRack: string | null;
  notes: string | null;
  isLowStock?: boolean;
}

interface Immunization {
  id: string;
  vaccineName: string;
  doseNumber: number;
  administeredAt: string;
  nextDueDate: string | null;
  provider: string | null;
  batchNumber: string | null;
  notes: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
}

interface ClinicStats {
  todayVisits: number;
  activeResting: number;
  totalVisits: number;
  lowStockCount: number;
  expiredCount: number;
  totalInventoryItems: number;
}

export default function ClinicPage() {
  const [activeTab, setActiveTab] = useState<"triage" | "registry" | "inventory" | "immunization">("triage");
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [students, setStudents] = useState<StudentHealthInfo[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedStudentForHealth, setSelectedStudentForHealth] = useState<StudentHealthInfo | null>(null);
  const [referralLetterVisit, setReferralLetterVisit] = useState<ClinicVisit | null>(null);

  // Form states - Visit
  const [visitStudentId, setVisitStudentId] = useState("");
  const [visitComplaint, setVisitComplaint] = useState("");
  const [visitSymptoms, setVisitSymptoms] = useState("");
  const [visitTemp, setVisitTemp] = useState("");
  const [visitBP, setVisitBP] = useState("");
  const [visitPulse, setVisitPulse] = useState("");
  const [visitWeight, setVisitWeight] = useState("");
  const [visitDiagnosis, setVisitDiagnosis] = useState("");
  const [visitTreatment, setVisitTreatment] = useState("");
  const [visitDisposition, setVisitDisposition] = useState<"RESTING_IN_BAY" | "RETURNED_TO_CLASS" | "SENT_HOME" | "REFERRED_TO_HOSPITAL">("RETURNED_TO_CLASS");
  const [visitParentNotified, setVisitParentNotified] = useState(false);
  const [visitHospital, setVisitHospital] = useState("");
  const [visitReferralReason, setVisitReferralReason] = useState("");
  const [visitDispenseItem, setVisitDispenseItem] = useState("");
  const [visitDispenseQty, setVisitDispenseQty] = useState("1");
  const [submittingVisit, setSubmittingVisit] = useState(false);

  // Form states - Student Health
  const [healthGenotype, setHealthGenotype] = useState("");
  const [healthBloodGroup, setHealthBloodGroup] = useState("");
  const [healthAllergies, setHealthAllergies] = useState("");
  const [healthChronic, setHealthChronic] = useState("");
  const [healthEmergencyName, setHealthEmergencyName] = useState("");
  const [healthEmergencyPhone, setHealthEmergencyPhone] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [savingHealth, setSavingHealth] = useState(false);

  // Form states - Inventory
  const [invCode, setInvCode] = useState("");
  const [invName, setInvName] = useState("");
  const [invCategory, setInvCategory] = useState("MEDICATION");
  const [invDosage, setInvDosage] = useState("Tablet");
  const [invUnit, setInvUnit] = useState("Tablets");
  const [invQty, setInvQty] = useState("100");
  const [invReorder, setInvReorder] = useState("20");
  const [invRack, setInvRack] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [savingInv, setSavingInv] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [statsRes, visitsRes, studentsRes, invRes, immRes] = await Promise.all([
        fetch(`${API}/api/v1/clinic/stats`, { credentials: "include" }),
        fetch(`${API}/api/v1/clinic/visits`, { credentials: "include" }),
        fetch(`${API}/api/v1/clinic/students`, { credentials: "include" }),
        fetch(`${API}/api/v1/clinic/inventory`, { credentials: "include" }),
        fetch(`${API}/api/v1/clinic/immunizations`, { credentials: "include" }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (visitsRes.ok) setVisits(await visitsRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (invRes.ok) setInventory(await invRes.json());
      if (immRes.ok) setImmunizations(await immRes.json());
    } catch {
      // offline / mock fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRecordVisit(e: FormEvent) {
    e.preventDefault();
    if (!visitStudentId || !visitComplaint) return;
    setSubmittingVisit(true);

    const payload: Record<string, unknown> = {
      studentId: visitStudentId,
      complaint: visitComplaint,
      symptoms: visitSymptoms || undefined,
      temperature: visitTemp ? parseFloat(visitTemp) : undefined,
      bloodPressure: visitBP || undefined,
      pulseRate: visitPulse ? parseInt(visitPulse, 10) : undefined,
      weight: visitWeight ? parseFloat(visitWeight) : undefined,
      diagnosis: visitDiagnosis || undefined,
      treatmentGiven: visitTreatment || undefined,
      disposition: visitDisposition,
      parentNotified: visitParentNotified,
      referralHospital: visitDisposition === "REFERRED_TO_HOSPITAL" ? visitHospital : undefined,
      referralReason: visitDisposition === "REFERRED_TO_HOSPITAL" ? visitReferralReason : undefined,
    };

    if (visitDispenseItem && parseInt(visitDispenseQty, 10) > 0) {
      payload.dispensedItems = [
        {
          inventoryId: visitDispenseItem,
          quantity: parseInt(visitDispenseQty, 10),
          dosage: visitTreatment,
        },
      ];
    }

    try {
      const res = await fetch(`${API}/api/v1/clinic/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowVisitModal(false);
        resetVisitForm();
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingVisit(false);
    }
  }

  function resetVisitForm() {
    setVisitStudentId("");
    setVisitComplaint("");
    setVisitSymptoms("");
    setVisitTemp("");
    setVisitBP("");
    setVisitPulse("");
    setVisitWeight("");
    setVisitDiagnosis("");
    setVisitTreatment("");
    setVisitDisposition("RETURNED_TO_CLASS");
    setVisitParentNotified(false);
    setVisitHospital("");
    setVisitReferralReason("");
    setVisitDispenseItem("");
    setVisitDispenseQty("1");
  }

  function openHealthModal(st: StudentHealthInfo) {
    setSelectedStudentForHealth(st);
    setHealthGenotype(st.genotype || "AA");
    setHealthBloodGroup(st.bloodGroup || "O+");
    setHealthAllergies(st.allergies || "");
    setHealthChronic(st.chronicConditions || "");
    setHealthEmergencyName(st.emergencyContactName || "");
    setHealthEmergencyPhone(st.emergencyContactPhone || "");
    setHealthNotes(st.medicalNotes || "");
    setShowHealthModal(true);
  }

  async function handleSaveHealth(e: FormEvent) {
    e.preventDefault();
    if (!selectedStudentForHealth) return;
    setSavingHealth(true);
    try {
      const res = await fetch(`${API}/api/v1/clinic/students/${selectedStudentForHealth.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          genotype: healthGenotype,
          bloodGroup: healthBloodGroup,
          allergies: healthAllergies,
          chronicConditions: healthChronic,
          emergencyContactName: healthEmergencyName,
          emergencyContactPhone: healthEmergencyPhone,
          medicalNotes: healthNotes,
        }),
      });
      if (res.ok) {
        setShowHealthModal(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingHealth(false);
    }
  }

  async function handleAddInventory(e: FormEvent) {
    e.preventDefault();
    if (!invCode || !invName) return;
    setSavingInv(true);
    try {
      const res = await fetch(`${API}/api/v1/clinic/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          itemCode: invCode,
          name: invName,
          category: invCategory,
          dosageForm: invDosage,
          unit: invUnit,
          quantityOnHand: parseInt(invQty, 10),
          reorderLevel: parseInt(invReorder, 10),
          locationRack: invRack,
          notes: invNotes,
        }),
      });
      if (res.ok) {
        setShowInventoryModal(false);
        setInvCode("");
        setInvName("");
        setInvRack("");
        setInvNotes("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingInv(false);
    }
  }

  // Filtered queries
  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    const adm = (s.admissionNumber || "").toLowerCase();
    const geno = (s.genotype || "").toLowerCase();
    const bg = (s.bloodGroup || "").toLowerCase();
    return name.includes(q) || adm.includes(q) || geno.includes(q) || bg.includes(q);
  });

  const filteredVisits = visits.filter((v) => {
    const q = search.toLowerCase();
    const name = `${v.student.firstName} ${v.student.lastName}`.toLowerCase();
    const adm = (v.student.admissionNumber || "").toLowerCase();
    const comp = (v.complaint || "").toLowerCase();
    return name.includes(q) || adm.includes(q) || comp.includes(q);
  });

  const filteredInventory = inventory.filter((i) => {
    const q = search.toLowerCase();
    return i.name.toLowerCase().includes(q) || i.itemCode.toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Top Banner & Quick Metrics */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "var(--color-brand-navy, #0B2545)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6v12M6 12h12" />
                <rect x="3" y="3" width="18" height="18" rx="4" />
              </svg>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-brand-navy, #0B2545)", margin: 0 }}>
              School Health & Clinic Operations
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            Daily triage log, Sick Bay cot occupancy, genotype safety registry, and dispensary inventory.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowInventoryModal(true)}
            className="btn btn-secondary"
            style={{ height: 38, fontSize: 13, borderRadius: 8 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Stock Intake
          </button>
          <button
            type="button"
            onClick={() => setShowVisitModal(true)}
            className="btn btn-primary"
            style={{
              height: 38,
              fontSize: 13,
              borderRadius: 8,
              backgroundColor: "var(--color-brand-navy, #0B2545)",
              color: "#FFFFFF",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Log Clinic Visit
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: 18, borderLeft: "4px solid var(--color-brand-navy, #0B2545)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Visits Logged Today
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-brand-navy, #0B2545)", marginTop: 6 }}>
            {stats?.todayVisits ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Total all-time: {stats?.totalVisits ?? 0} cases
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: "4px solid #E59828" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Currently in Sick Bay
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#D1841B", marginTop: 6 }}>
            {stats?.activeResting ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Resting on observation cot
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: "4px solid var(--color-brand-crimson, #8B1E1E)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Dispensary Low Stock
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-brand-crimson, #8B1E1E)", marginTop: 6 }}>
            {stats?.lowStockCount ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Items at or below reorder threshold
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: "4px solid #166E4E" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Vaccines & Registry
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#166E4E", marginTop: 6 }}>
            {immunizations.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Documented routine doses
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--color-border, #E1E8F0)",
          marginBottom: 20,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "triage", label: "Daily Triage & Visits", count: visits.length },
            { id: "registry", label: "Student Health Registry", count: students.length },
            { id: "inventory", label: "Dispensary Stock", count: inventory.length },
            { id: "immunization", label: "Routine Immunizations", count: immunizations.length },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearch("");
                }}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--color-brand-navy, #0B2545)" : "var(--color-text-secondary)",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: active ? "2.5px solid var(--color-brand-navy, #0B2545)" : "2.5px solid transparent",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 7px",
                    borderRadius: 12,
                    backgroundColor: active ? "var(--color-brand-navy, #0B2545)" : "#E2E8F0",
                    color: active ? "#FFFFFF" : "var(--color-text-secondary)",
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ width: 260 }}>
          <input
            type="text"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records..."
            style={{ height: 36, fontSize: 13, borderRadius: 8 }}
          />
        </div>
      </div>

      {/* ── TAB 1: DAILY TRIAGE & VISITS ── */}
      {activeTab === "triage" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid var(--color-border, #E1E8F0)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Student & Class</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Date / Time</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Vitals</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Chief Complaint & Diagnosis</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Medication / Treatment</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Disposition</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
                      Loading clinic records...
                    </td>
                  </tr>
                ) : filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
                      No clinic visits found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((v) => {
                    const isFever = v.temperature != null && v.temperature >= 37.5;
                    return (
                      <tr key={v.id} style={{ borderBottom: "1px solid var(--color-border, #E1E8F0)" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 700, color: "var(--color-ink)", fontSize: 13.5 }}>
                            {v.student.firstName} {v.student.lastName}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", marginTop: 2 }}>
                            {v.student.admissionNumber} {v.student.genotype && `• Genotype: ${v.student.genotype}`}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--color-text-secondary)" }}>
                          {new Date(v.visitDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          <div style={{ fontSize: 11 }}>
                            {new Date(v.visitDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {v.temperature && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  backgroundColor: isFever ? "var(--color-danger-bg, #FAECE7)" : "#F1F5F9",
                                  color: isFever ? "var(--color-danger-text, #993C1D)" : "var(--color-ink)",
                                }}
                              >
                                {v.temperature}°C
                              </span>
                            )}
                            {v.bloodPressure && (
                              <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, backgroundColor: "#F1F5F9", color: "var(--color-ink)" }}>
                                {v.bloodPressure}
                              </span>
                            )}
                            {v.pulseRate && (
                              <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, backgroundColor: "#F1F5F9", color: "var(--color-text-secondary)" }}>
                                {v.pulseRate} bpm
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px", maxWidth: 260 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>{v.complaint}</div>
                          {v.diagnosis && (
                            <div style={{ fontSize: 11.5, color: "var(--color-brand-navy, #0B2545)", marginTop: 2, fontStyle: "italic" }}>
                              Dx: {v.diagnosis}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "14px 16px", maxWidth: 220 }}>
                          <div style={{ fontSize: 12.5, color: "var(--color-ink)" }}>
                            {v.treatmentGiven || "Observation only"}
                          </div>
                          {v.dispenses && v.dispenses.length > 0 && (
                            <div style={{ marginTop: 4 }}>
                              {v.dispenses.map((d) => (
                                <span
                                  key={d.id}
                                  style={{
                                    display: "inline-block",
                                    fontSize: 11,
                                    backgroundColor: "#EBF2FA",
                                    color: "var(--color-brand-navy, #0B2545)",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    marginRight: 4,
                                  }}
                                >
                                  {d.inventory.name} ({d.quantity})
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          {v.disposition === "RESTING_IN_BAY" && (
                            <span className="pill-warning" style={{ fontSize: 11 }}>Resting in Bay</span>
                          )}
                          {v.disposition === "RETURNED_TO_CLASS" && (
                            <span className="pill-success" style={{ fontSize: 11 }}>Returned to Class</span>
                          )}
                          {v.disposition === "SENT_HOME" && (
                            <span className="pill-neutral" style={{ fontSize: 11 }}>Released / Sent Home</span>
                          )}
                          {v.disposition === "REFERRED_TO_HOSPITAL" && (
                            <span className="pill-danger" style={{ fontSize: 11 }}>Referred to Hospital</span>
                          )}
                          {v.parentNotified && (
                            <div style={{ fontSize: 10.5, color: "#166E4E", marginTop: 4, fontWeight: 600 }}>
                              Parent Notified
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          {v.disposition === "REFERRED_TO_HOSPITAL" && (
                            <button
                              type="button"
                              onClick={() => setReferralLetterVisit(v)}
                              className="btn btn-secondary"
                              style={{ padding: "4px 10px", fontSize: 11.5, borderRadius: 6 }}
                            >
                              Referral Letter
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: STUDENT HEALTH REGISTRY ── */}
      {activeTab === "registry" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid var(--color-border, #E1E8F0)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Student Name</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Adm No & Class</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Blood Group</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Genotype</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Allergies & Sensitivities</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Chronic Medical Conditions</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Emergency Contact</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
                      No student records found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const isSickleCell = st.genotype === "SS" || st.genotype === "SC";
                    const currentClass = st.enrollments?.[0]?.classSection?.name || "Unassigned";
                    return (
                      <tr key={st.id} style={{ borderBottom: "1px solid var(--color-border, #E1E8F0)" }}>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: "var(--color-ink)" }}>
                          {st.firstName} {st.lastName}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--color-text-secondary)" }}>
                          <div>{st.admissionNumber}</div>
                          <div style={{ fontSize: 11, color: "var(--color-brand-navy, #0B2545)", fontWeight: 600 }}>{currentClass}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "3px 8px", borderRadius: 4, backgroundColor: "#EBF2FA", color: "var(--color-brand-navy, #0B2545)", fontWeight: 700, fontSize: 12 }}>
                            {st.bloodGroup || "Not Set"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 800,
                              backgroundColor: isSickleCell ? "var(--color-brand-crimson, #8B1E1E)" : "#F1F5F9",
                              color: isSickleCell ? "#FFFFFF" : "var(--color-ink)",
                            }}
                          >
                            {st.genotype || "Not Set"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12.5, maxWidth: 180, color: st.allergies && st.allergies !== "None reported" ? "var(--color-brand-crimson, #8B1E1E)" : "var(--color-text-secondary)" }}>
                          {st.allergies || "None reported"}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12.5, maxWidth: 180, color: st.chronicConditions && st.chronicConditions !== "None" ? "var(--color-brand-crimson, #8B1E1E)" : "var(--color-text-secondary)" }}>
                          {st.chronicConditions || "None"}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12 }}>
                          <div style={{ fontWeight: 600, color: "var(--color-ink)" }}>{st.emergencyContactName || "Parent on record"}</div>
                          <div style={{ color: "var(--color-text-secondary)" }}>{st.emergencyContactPhone || "—"}</div>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => openHealthModal(st)}
                            className="btn btn-secondary"
                            style={{ padding: "4px 10px", fontSize: 11.5, borderRadius: 6 }}
                          >
                            Edit Health
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: DISPENSARY STOCK ── */}
      {activeTab === "inventory" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid var(--color-border, #E1E8F0)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Item Code</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Name & Category</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Dosage Form</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Stock on Hand</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Reorder Level</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Location Rack</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
                      No items registered in the school dispensary.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const isLow = item.quantityOnHand <= item.reorderLevel;
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border, #E1E8F0)" }}>
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--color-brand-navy, #0B2545)" }}>
                          {item.itemCode}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 700, color: "var(--color-ink)", fontSize: 13 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{item.category.toLowerCase().replace("_", " ")}</div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--color-text-secondary)" }}>
                          {item.dosageForm || "—"} ({item.unit})
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: isLow ? "var(--color-brand-crimson, #8B1E1E)" : "var(--color-ink)",
                              backgroundColor: isLow ? "var(--color-danger-bg, #FAECE7)" : "#F1F5F9",
                              padding: "3px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {item.quantityOnHand} {item.unit}
                          </span>
                          {isLow && (
                            <span style={{ fontSize: 11, color: "var(--color-brand-crimson, #8B1E1E)", fontWeight: 700, marginLeft: 6 }}>
                              LOW STOCK
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--color-text-secondary)" }}>
                          {item.reorderLevel} {item.unit}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--color-ink)" }}>
                          {item.locationRack || "General Cabinet"}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--color-text-secondary)", maxWidth: 220 }}>
                          {item.notes || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: ROUTINE IMMUNIZATIONS ── */}
      {activeTab === "immunization" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid var(--color-border, #E1E8F0)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Student</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Vaccine Name</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Dose</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Administered Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Next Due Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Provider / Clinic</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>Batch No</th>
                </tr>
              </thead>
              <tbody>
                {immunizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
                      No immunization records registered.
                    </td>
                  </tr>
                ) : (
                  immunizations.map((imm) => (
                    <tr key={imm.id} style={{ borderBottom: "1px solid var(--color-border, #E1E8F0)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: "var(--color-ink)", fontSize: 13 }}>
                          {imm.student.firstName} {imm.student.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{imm.student.admissionNumber}</div>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "var(--color-brand-navy, #0B2545)", fontSize: 13 }}>
                        {imm.vaccineName}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12.5 }}>Dose #{imm.doseNumber}</td>
                      <td style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--color-text-secondary)" }}>
                        {new Date(imm.administeredAt).toLocaleDateString("en-GB")}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--color-text-secondary)" }}>
                        {imm.nextDueDate ? new Date(imm.nextDueDate).toLocaleDateString("en-GB") : "Fully Immunized"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--color-ink)" }}>
                        {imm.provider || "Bright Future Academy Sick Bay"}
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 11.5, color: "var(--color-text-secondary)" }}>
                        {imm.batchNumber || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: LOG CLINIC VISIT ── */}
      {showVisitModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(11, 37, 69, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              maxWidth: 680,
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "24px 28px",
              boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-brand-navy, #0B2545)", margin: 0 }}>
                  Log Sick Bay Visit & Triage
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                  Record clinical complaint, vital signs, treatment given, and student disposition.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVisitModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleRecordVisit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Select Student *</label>
                <select
                  className="input"
                  value={visitStudentId}
                  onChange={(e) => setVisitStudentId(e.target.value)}
                  required
                >
                  <option value="">-- Choose student from directory --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} ({st.admissionNumber}) {st.genotype ? `[${st.genotype}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Chief Complaint *</label>
                <input
                  type="text"
                  className="input"
                  value={visitComplaint}
                  onChange={(e) => setVisitComplaint(e.target.value)}
                  placeholder="e.g. Sudden severe headache and chills during period 2"
                  required
                />
              </div>

              <div>
                <label className="label">Observed Symptoms</label>
                <input
                  type="text"
                  className="input"
                  value={visitSymptoms}
                  onChange={(e) => setVisitSymptoms(e.target.value)}
                  placeholder="e.g. Mild photophobia, stomach nausea, warm to touch"
                />
              </div>

              {/* Vitals Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <div>
                  <label className="label">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={visitTemp}
                    onChange={(e) => setVisitTemp(e.target.value)}
                    placeholder="37.2"
                  />
                </div>
                <div>
                  <label className="label">Blood Pressure</label>
                  <input
                    type="text"
                    className="input"
                    value={visitBP}
                    onChange={(e) => setVisitBP(e.target.value)}
                    placeholder="110/70"
                  />
                </div>
                <div>
                  <label className="label">Pulse (bpm)</label>
                  <input
                    type="number"
                    className="input"
                    value={visitPulse}
                    onChange={(e) => setVisitPulse(e.target.value)}
                    placeholder="75"
                  />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    value={visitWeight}
                    onChange={(e) => setVisitWeight(e.target.value)}
                    placeholder="42.5"
                  />
                </div>
              </div>

              <div>
                <label className="label">Suspected Diagnosis / Clinical Impression</label>
                <input
                  type="text"
                  className="input"
                  value={visitDiagnosis}
                  onChange={(e) => setVisitDiagnosis(e.target.value)}
                  placeholder="e.g. Tension headache / Mild dehydration / Suspected Malaria"
                />
              </div>

              <div>
                <label className="label">First Aid / Clinical Treatment Given</label>
                <input
                  type="text"
                  className="input"
                  value={visitTreatment}
                  onChange={(e) => setVisitTreatment(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg administered with water. Cold compress applied."
                />
              </div>

              {/* Medication Dispense Selector */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Dispense from School Dispensary</label>
                  <select
                    className="input"
                    value={visitDispenseItem}
                    onChange={(e) => setVisitDispenseItem(e.target.value)}
                  >
                    <option value="">-- No dispensary deduction --</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.quantityOnHand} {item.unit} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity Dispensed</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={visitDispenseQty}
                    onChange={(e) => setVisitDispenseQty(e.target.value)}
                  />
                </div>
              </div>

              {/* Disposition Selector */}
              <div>
                <label className="label">Disposition Status *</label>
                <select
                  className="input"
                  value={visitDisposition}
                  onChange={(e) => setVisitDisposition(e.target.value as any)}
                  required
                >
                  <option value="RETURNED_TO_CLASS">Returned to Classroom</option>
                  <option value="RESTING_IN_BAY">Resting on Sick Bay Observation Cot</option>
                  <option value="SENT_HOME">Released to Parent / Sent Home</option>
                  <option value="REFERRED_TO_HOSPITAL">Referred to External Hospital / Specialist</option>
                </select>
              </div>

              {/* Hospital Referral Details (if referred) */}
              {visitDisposition === "REFERRED_TO_HOSPITAL" && (
                <div style={{ padding: 14, backgroundColor: "#FFF5F5", borderRadius: 10, border: "1px solid #FED7D7", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-brand-crimson, #8B1E1E)" }}>
                    Hospital Referral Escalation Details
                  </div>
                  <div>
                    <label className="label">Receiving Hospital / Clinic</label>
                    <input
                      type="text"
                      className="input"
                      value={visitHospital}
                      onChange={(e) => setVisitHospital(e.target.value)}
                      placeholder="e.g. Primary Health Care Centre Kashere or Federal Teaching Hospital Gombe"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Reason for Emergency Referral</label>
                    <input
                      type="text"
                      className="input"
                      value={visitReferralReason}
                      onChange={(e) => setVisitReferralReason(e.target.value)}
                      placeholder="e.g. High grade fever (39.2°C) unresponsive to oral antipyretic, needs blood film"
                      required
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="notifyParentCheck"
                  checked={visitParentNotified}
                  onChange={(e) => setVisitParentNotified(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <label htmlFor="notifyParentCheck" style={{ fontSize: 13, cursor: "pointer", color: "var(--color-ink)", fontWeight: 600 }}>
                  Notify Parent / Guardian immediately via SMS / Phone Call
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="btn btn-secondary"
                  style={{ height: 40, borderRadius: 8 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVisit}
                  className="btn btn-primary"
                  style={{
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: "var(--color-brand-navy, #0B2545)",
                    color: "#FFFFFF",
                    fontWeight: 700,
                  }}
                >
                  {submittingVisit ? "Recording..." : "Save Clinic Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT STUDENT HEALTH PROFILE ── */}
      {showHealthModal && selectedStudentForHealth && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(11, 37, 69, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              maxWidth: 580,
              width: "100%",
              padding: "24px 28px",
              boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-brand-navy, #0B2545)", margin: 0 }}>
                  Update Student Health Profile
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                  {selectedStudentForHealth.firstName} {selectedStudentForHealth.lastName} ({selectedStudentForHealth.admissionNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHealthModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveHealth} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Genotype *</label>
                  <select
                    className="input"
                    value={healthGenotype}
                    onChange={(e) => setHealthGenotype(e.target.value)}
                    required
                  >
                    <option value="AA">AA (Normal Haemoglobin)</option>
                    <option value="AS">AS (Sickle Cell Trait)</option>
                    <option value="SS">SS (Sickle Cell Anaemia - Caution)</option>
                    <option value="AC">AC (Haemoglobin C Trait)</option>
                    <option value="SC">SC (HbSC Disease)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Blood Group *</label>
                  <select
                    className="input"
                    value={healthBloodGroup}
                    onChange={(e) => setHealthBloodGroup(e.target.value)}
                    required
                  >
                    <option value="O+">O Rh-Positive (O+)</option>
                    <option value="O-">O Rh-Negative (O-)</option>
                    <option value="A+">A Rh-Positive (A+)</option>
                    <option value="A-">A Rh-Negative (A-)</option>
                    <option value="B+">B Rh-Positive (B+)</option>
                    <option value="B-">B Rh-Negative (B-)</option>
                    <option value="AB+">AB Rh-Positive (AB+)</option>
                    <option value="AB-">AB Rh-Negative (AB-)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Known Drug & Food Allergies</label>
                <input
                  type="text"
                  className="input"
                  value={healthAllergies}
                  onChange={(e) => setHealthAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, Pollen"
                />
              </div>

              <div>
                <label className="label">Chronic Conditions / Physical Limitations</label>
                <input
                  type="text"
                  className="input"
                  value={healthChronic}
                  onChange={(e) => setHealthChronic(e.target.value)}
                  placeholder="e.g. Bronchial Asthma (Inhaler required), Sickle Cell"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Emergency Contact Name</label>
                  <input
                    type="text"
                    className="input"
                    value={healthEmergencyName}
                    onChange={(e) => setHealthEmergencyName(e.target.value)}
                    placeholder="e.g. Alhaji Abubakar"
                  />
                </div>
                <div>
                  <label className="label">Emergency Contact Phone</label>
                  <input
                    type="text"
                    className="input"
                    value={healthEmergencyPhone}
                    onChange={(e) => setHealthEmergencyPhone(e.target.value)}
                    placeholder="08029839848"
                  />
                </div>
              </div>

              <div>
                <label className="label">General Medical Clearance Notes</label>
                <textarea
                  className="input"
                  rows={3}
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                  placeholder="Additional notes from primary physician or parent on record..."
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowHealthModal(false)}
                  className="btn btn-secondary"
                  style={{ height: 40, borderRadius: 8 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHealth}
                  className="btn btn-primary"
                  style={{
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: "var(--color-brand-navy, #0B2545)",
                    color: "#FFFFFF",
                    fontWeight: 700,
                  }}
                >
                  {savingHealth ? "Saving..." : "Update Health Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD INVENTORY ITEM ── */}
      {showInventoryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(11, 37, 69, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              maxWidth: 540,
              width: "100%",
              padding: "24px 28px",
              boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-brand-navy, #0B2545)", margin: 0 }}>
                  Register Dispensary Item
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                  Add medication, first-aid consumable, or diagnostic equipment to dispensary inventory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInventoryModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddInventory} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div>
                  <label className="label">Item Code *</label>
                  <input
                    type="text"
                    className="input"
                    value={invCode}
                    onChange={(e) => setInvCode(e.target.value)}
                    placeholder="MED-XYZ-01"
                    required
                  />
                </div>
                <div>
                  <label className="label">Item Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg Tablets"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={invCategory}
                    onChange={(e) => setInvCategory(e.target.value)}
                  >
                    <option value="MEDICATION">Medication</option>
                    <option value="FIRST_AID">First Aid Consumable</option>
                    <option value="EQUIPMENT">Medical Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="label">Dosage Form</label>
                  <input
                    type="text"
                    className="input"
                    value={invDosage}
                    onChange={(e) => setInvDosage(e.target.value)}
                    placeholder="Tablet / Liquid"
                  />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input
                    type="text"
                    className="input"
                    value={invUnit}
                    onChange={(e) => setInvUnit(e.target.value)}
                    placeholder="Tablets / Bottles"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Quantity on Hand *</label>
                  <input
                    type="number"
                    className="input"
                    value={invQty}
                    onChange={(e) => setInvQty(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Reorder Alert Level</label>
                  <input
                    type="number"
                    className="input"
                    value={invReorder}
                    onChange={(e) => setInvReorder(e.target.value)}
                    placeholder="20"
                  />
                </div>
              </div>

              <div>
                <label className="label">Location Rack / Shelf</label>
                <input
                  type="text"
                  className="input"
                  value={invRack}
                  onChange={(e) => setInvRack(e.target.value)}
                  placeholder="Rack A1 - Analgesics"
                />
              </div>

              <div>
                <label className="label">Clinical Notes / Indications</label>
                <input
                  type="text"
                  className="input"
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  placeholder="Primary use, contraindications, or storage conditions"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowInventoryModal(false)}
                  className="btn btn-secondary"
                  style={{ height: 40, borderRadius: 8 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInv}
                  className="btn btn-primary"
                  style={{
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: "var(--color-brand-navy, #0B2545)",
                    color: "#FFFFFF",
                    fontWeight: 700,
                  }}
                >
                  {savingInv ? "Adding..." : "Add to Dispensary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: OFFICIAL A4 HOSPITAL REFERRAL LETTER SLIP ── */}
      {referralLetterVisit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              maxWidth: 780,
              width: "100%",
              maxHeight: "94vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Top Toolbar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 24px",
                borderBottom: "1px solid var(--color-border, #E1E8F0)",
                backgroundColor: "#F8FAFC",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-brand-navy, #0B2545)" }}>
                Hospital Referral Letter Preview
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{
                    height: 32,
                    fontSize: 12,
                    borderRadius: 6,
                    backgroundColor: "var(--color-brand-navy, #0B2545)",
                    color: "#FFFFFF",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print Letter
                </button>
                <button
                  type="button"
                  onClick={() => setReferralLetterVisit(null)}
                  className="btn btn-secondary"
                  style={{ height: 32, fontSize: 12, borderRadius: 6 }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* A4 Document Body */}
            <div
              id="printable-referral"
              style={{
                padding: "36px 44px",
                color: "#0B2545",
                fontFamily: "serif",
              }}
            >
              {/* Institutional Letterhead */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px double #0B2545", paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <img
                    src="/school-logo.png"
                    alt="BFA Crest"
                    style={{ width: 72, height: 72, objectFit: "contain" }}
                  />
                  <div>
                    <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0B2545", letterSpacing: "0.03em", margin: 0, fontFamily: "sans-serif" }}>
                      BRIGHT FUTURE ACADEMY
                    </h1>
                    <div style={{ fontSize: 12, fontStyle: "italic", color: "#5C6E82", margin: "2px 0 4px" }}>
                      &ldquo;Guided By Principles, Driven By Purpose&rdquo;
                    </div>
                    <div style={{ fontSize: 11, color: "#0A192F", fontFamily: "sans-serif" }}>
                      Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State
                    </div>
                    <div style={{ fontSize: 11, color: "#0A192F", fontFamily: "sans-serif" }}>
                      Contact: 08029839848 | brightfutureacademykashere@gmail.com
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", fontFamily: "sans-serif" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#8B1E1E", textTransform: "uppercase" }}>
                    SCHOOL SICK BAY / CLINIC
                  </div>
                  <div style={{ fontSize: 11, color: "#5C6E82", marginTop: 2 }}>
                    Ref: BFA/MED/{referralLetterVisit.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 11, color: "#0A192F", marginTop: 2 }}>
                    Date: {new Date(referralLetterVisit.visitDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: "center", margin: "18px 0", textTransform: "uppercase" }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    borderBottom: "1.5px solid #0B2545",
                    paddingBottom: 2,
                    fontFamily: "sans-serif",
                  }}
                >
                  OFFICIAL MEDICAL REFERRAL / ESCORT LETTER
                </span>
              </div>

              <div style={{ fontSize: 13, marginBottom: 14, fontFamily: "sans-serif" }}>
                <strong>TO: </strong>
                {referralLetterVisit.referralHospital || "The Medical Officer in Charge, General Hospital / Federal Teaching Hospital"}
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                Dear Doctor / Medical Director,
                <br />
                We are urgently referring our student, whose bio-clinical details appear below, for comprehensive evaluation, laboratory diagnosis, and specialist management.
              </div>

              {/* Patient Bio Box */}
              <div style={{ border: "1px solid #CBD5E1", borderRadius: 8, padding: "12px 16px", marginBottom: 16, backgroundColor: "#F8FAFC", fontFamily: "sans-serif" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 12.5 }}>
                  <div>
                    <span style={{ color: "#5C6E82" }}>Student Name: </span>
                    <strong style={{ color: "#0B2545" }}>{referralLetterVisit.student.firstName} {referralLetterVisit.student.lastName}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#5C6E82" }}>Admission No: </span>
                    <strong style={{ color: "#0B2545" }}>{referralLetterVisit.student.admissionNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#5C6E82" }}>Genotype / Blood Group: </span>
                    <strong style={{ color: referralLetterVisit.student.genotype === "SS" ? "#8B1E1E" : "#0B2545" }}>
                      {referralLetterVisit.student.genotype || "AA"} / {referralLetterVisit.student.bloodGroup || "O+"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#5C6E82" }}>Emergency Contact: </span>
                    <strong>{referralLetterVisit.student.guardianName || "Parent on Record"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#5C6E82" }}>Contact Phone: </span>
                    <strong>{referralLetterVisit.student.guardianPhone || "08029839848"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#5C6E82" }}>Known Allergies: </span>
                    <strong style={{ color: "#8B1E1E" }}>{referralLetterVisit.student.allergies || "None reported"}</strong>
                  </div>
                </div>
              </div>

              {/* Triage Vitals */}
              <div style={{ marginBottom: 16, fontFamily: "sans-serif" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0B2545", marginBottom: 6, textTransform: "uppercase" }}>
                  Triage Vitals at Time of Evaluation:
                </div>
                <div style={{ display: "flex", gap: 18, fontSize: 12.5 }}>
                  <div><strong>Temperature: </strong>{referralLetterVisit.temperature ? `${referralLetterVisit.temperature}°C` : "N/A"}</div>
                  <div><strong>Blood Pressure: </strong>{referralLetterVisit.bloodPressure || "N/A"}</div>
                  <div><strong>Pulse Rate: </strong>{referralLetterVisit.pulseRate ? `${referralLetterVisit.pulseRate} bpm` : "N/A"}</div>
                  <div><strong>Weight: </strong>{referralLetterVisit.weight ? `${referralLetterVisit.weight} kg` : "N/A"}</div>
                </div>
              </div>

              {/* Clinical Presentation & Reason for Referral */}
              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16, fontFamily: "sans-serif" }}>
                <div style={{ marginBottom: 6 }}>
                  <strong>Chief Complaint & Presentation: </strong>
                  {referralLetterVisit.complaint} {referralLetterVisit.symptoms && `(${referralLetterVisit.symptoms})`}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <strong>First Aid & Intervention Given at Sick Bay: </strong>
                  {referralLetterVisit.treatmentGiven || "Initial observation and hydration"}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <strong>Primary Reason for Escalation / Referral: </strong>
                  <span style={{ color: "#8B1E1E", fontWeight: 700 }}>
                    {referralLetterVisit.referralReason || "Further diagnostic investigation and treatment beyond secondary school clinic scope"}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 36 }}>
                Kindly extend your prompt professional medical assistance to the student. Please provide feedback on the discharge slip for school health record updating.
              </div>

              {/* Signatures */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20, fontFamily: "sans-serif" }}>
                <div style={{ width: 220, textAlign: "center" }}>
                  <div style={{ borderBottom: "1px solid #0B2545", height: 40, marginBottom: 6 }}></div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Attending School Nurse / Officer</div>
                  <div style={{ fontSize: 10.5, color: "#5C6E82" }}>Bright Future Academy Clinic</div>
                </div>

                <div
                  style={{
                    width: 140,
                    height: 80,
                    border: "2px dashed #0B2545",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#5C6E82",
                    textAlign: "center",
                    padding: 4,
                  }}
                >
                  OFFICIAL SCHOOL CLINIC STAMP
                </div>

                <div style={{ width: 220, textAlign: "center" }}>
                  <div style={{ borderBottom: "1px solid #0B2545", height: 40, marginBottom: 6 }}></div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Receiving Hospital Officer</div>
                  <div style={{ fontSize: 10.5, color: "#5C6E82" }}>Signature, Date & Stamp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
