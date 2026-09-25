"use client";

import React, { useState, useEffect } from "react";
import ActionConfirmationModal from "../../components/ActionConfirmationModal";
import RejectPaymentModal from "../../components/RejectPaymentModal";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gender: string;
  guardianName?: string;
  guardianPhone?: string;
  enrollments?: Array<{
    classSection: { name: string; level: string };
  }>;
}

interface ReceiptData {
  paymentId: string;
  receiptNumber: string;
  paidAt: string;
  amount: number;
  method: string;
  balanceRemaining: number;
  invoiceTotal: number;
  invoiceStatus: string;
  school: {
    name: string;
    address: string;
    phone: string;
    email: string;
    state?: string;
    lga?: string;
  };
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    gender: string;
    classSection: string;
  };
  cashier: {
    name: string;
    role: string;
  };
  allocations: Array<{ name: string; amount: number }>;
  notes?: string;
}

interface CashDrawerData {
  drawer: {
    id: string;
    date: string;
    status: string;
    cashCollected: number;
    posCollected: number;
    transferTotal: number;
    closingCash?: number;
    difference?: number;
    closureNotes?: string;
    closedAt?: string;
  };
  summary: {
    cashTotal: number;
    posTotal: number;
    transferTotal: number;
    grandTotal: number;
    transactionsCount: number;
  };
  recentPayments: Array<{
    id: string;
    reference: string;
    amount: number;
    method: string;
    paidAt: string;
    studentName: string;
    admissionNumber: string;
  }>;
}

interface DebtorItem {
  invoiceId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  totalBilled: number;
  paidAmount: number;
  outstandingBalance: number;
  daysOverdue: number;
  agingCategory: string;
  parentName: string;
  parentPhone: string;
}

export default function BursarConsolePage() {
  const { user, isAdmin, isBursar } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<"cashier" | "pending" | "drawer" | "debtors" | "statement">("cashier");

  // Cashier state
  const [studentsList, setStudentsList] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [externalReference, setExternalReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [tuitionAlloc, setTuitionAlloc] = useState<number>(0);
  const [levyAlloc, setLevyAlloc] = useState<number>(0);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);

  // 2-Step Confirmation States
  const [isConfirmCollectOpen, setIsConfirmCollectOpen] = useState(false);
  const [isConfirmCloseDrawerOpen, setIsConfirmCloseDrawerOpen] = useState(false);

  // Pending Approvals Queue
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [confirmTargetPayment, setConfirmTargetPayment] = useState<any | null>(null);
  const [rejectTargetPayment, setRejectTargetPayment] = useState<any | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Cash Drawer state
  const [drawerData, setDrawerData] = useState<CashDrawerData | null>(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [closeDrawerModalOpen, setCloseDrawerModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closureNotes, setClosureNotes] = useState("");
  const [closingDrawer, setClosingDrawer] = useState(false);

  // Debtors state
  const [debtorsList, setDebtorsList] = useState<DebtorItem[]>([]);
  const [totalDebtOutstanding, setTotalDebtOutstanding] = useState(0);
  const [loadingDebtors, setLoadingDebtors] = useState(false);

  // Statement state
  const [statementStudentId, setStatementStudentId] = useState("");
  const [statementData, setStatementData] = useState<any | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Fetch initial students, drawer, debtors & pending
  useEffect(() => {
    fetchStudents();
    fetchDrawer();
    fetchDebtors();
    fetchPending();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/v1/students?search=");
      if (res.ok) {
        const d = await res.json();
        setStudentsList(d || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchPending = async () => {
    try {
      setLoadingPending(true);
      const res = await fetch("/api/v1/fees/invoices/payments/pending");
      if (res.ok) {
        const d = await res.json();
        setPendingPayments(d || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchDrawer = async () => {
    try {
      setLoadingDrawer(true);
      const res = await fetch("/api/v1/bursar/drawer/today");
      if (res.ok) {
        const d = await res.json();
        setDrawerData(d);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDrawer(false);
    }
  };

  const fetchDebtors = async () => {
    try {
      setLoadingDebtors(true);
      const res = await fetch("/api/v1/bursar/debtors");
      if (res.ok) {
        const d = await res.json();
        setDebtorsList(d.debtors || []);
        setTotalDebtOutstanding(d.totalOutstanding || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDebtors(false);
    }
  };

  const handleSelectStudent = (st: StudentOption) => {
    setSelectedStudent(st);
    setStudentSearch(`${st.firstName} ${st.lastName} (${st.admissionNumber})`);
    setAmount(25000);
    setTuitionAlloc(20000);
    setLevyAlloc(5000);
  };

  const handleAmountChange = (val: number) => {
    setAmount(val);
    // Auto-split between tuition and levies
    const tuition = Math.round(val * 0.8);
    setTuitionAlloc(tuition);
    setLevyAlloc(val - tuition);
  };

  const handleCollectFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || amount <= 0) {
      setErrorMsg("Please select a student and enter a valid payment amount.");
      return;
    }
    setErrorMsg(null);
    setIsConfirmCollectOpen(true);
  };

  const executeCollectFee = async () => {
    if (!selectedStudent || amount <= 0) return;

    try {
      setSubmittingPayment(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch("/api/v1/bursar/collect-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          amount,
          method: paymentMethod,
          externalReference: externalReference.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
          allocations: [
            { name: "School Tuition & Academic Fees", amount: tuitionAlloc },
            { name: "Development & PTA Levies", amount: levyAlloc },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Payment recording failed");
      }

      const receipt: ReceiptData = await res.json();
      setCurrentReceipt(receipt);
      setReceiptModalOpen(true);
      setIsConfirmCollectOpen(false);
      setSuccessMsg(`Payment recorded successfully. Receipt No: ${receipt.receiptNumber}`);

      // Refresh drawer, debtors & pending
      fetchDrawer();
      fetchDebtors();
      fetchPending();

      // Reset form
      setAmount(0);
      setTuitionAlloc(0);
      setLevyAlloc(0);
      setExternalReference("");
      setPaymentNotes("");
    } catch (err: any) {
      setErrorMsg(err.message || "Error processing payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const executeCloseDrawer = async () => {
    try {
      setClosingDrawer(true);
      const res = await fetch("/api/v1/bursar/drawer/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingCash: countedCash,
          closureNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to close cash drawer");
      }

      setIsConfirmCloseDrawerOpen(false);
      setCloseDrawerModalOpen(false);
      setSuccessMsg("Shift cash drawer closed and reconciled successfully.");
      fetchDrawer();
    } catch (err: any) {
      setErrorMsg(err.message || "Error closing drawer");
    } finally {
      setClosingDrawer(false);
    }
  };

  const executeConfirmPendingPayment = async () => {
    if (!confirmTargetPayment) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`/api/v1/fees/invoices/payments/${confirmTargetPayment.id}/confirm`, {
        method: "POST",
      });
      if (res.ok) {
        setConfirmTargetPayment(null);
        setSuccessMsg(`Payment submission ${confirmTargetPayment.reference} confirmed and verified successfully.`);
        fetchPending();
        fetchDrawer();
        fetchDebtors();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to confirm payment");
      }
    } catch {
      setErrorMsg("Network error while confirming payment");
    } finally {
      setActionProcessing(false);
    }
  };

  const executeRejectPendingPayment = async (reason: string) => {
    if (!rejectTargetPayment) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`/api/v1/fees/invoices/payments/${rejectTargetPayment.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setRejectTargetPayment(null);
        setSuccessMsg(`Payment submission ${rejectTargetPayment.reference} marked as rejected.`);
        fetchPending();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to reject payment");
      }
    } catch {
      setErrorMsg("Network error while rejecting payment");
    } finally {
      setActionProcessing(false);
    }
  };

  const handleLoadStatement = async (stId: string) => {
    if (!stId) return;
    try {
      setLoadingStatement(true);
      const res = await fetch(`/api/v1/bursar/student/${stId}/statement`);
      if (res.ok) {
        const d = await res.json();
        setStatementData(d);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStatement(false);
    }
  };

  const filteredStudents = studentSearch.trim()
    ? studentsList
        .filter(
          (s) =>
            s.firstName.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.lastName.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.admissionNumber.toLowerCase().includes(studentSearch.toLowerCase()),
        )
        .slice(0, 6)
    : [];

  return (
    <div style={{ padding: "24px 28px", backgroundColor: "#FFFFFF", minHeight: "100%" }}>
      {/* ── Page Header ── */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-brand-navy, #0B2545)", margin: 0 }}>
            Bursary &amp; Counter Cashier Desk
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "3px 0 0" }}>
            Point-of-Sale Fee Collection · Sequential Official Receipts · Daily Shift Reconciliation · Debtors Aging
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              backgroundColor: drawerData?.drawer.status === "OPEN" ? "#EFF6FF" : "#F1F5F9",
              border: `1px solid ${drawerData?.drawer.status === "OPEN" ? "#BFDBFE" : "#E2E8F0"}`,
              fontSize: 11,
              fontWeight: 800,
              color: drawerData?.drawer.status === "OPEN" ? "#1E40AF" : "#64748B",
            }}
          >
            Cash Drawer: {drawerData?.drawer.status === "OPEN" ? "OPEN & ACTIVE" : "CLOSED"}
          </div>

          {drawerData?.drawer.status === "OPEN" && (
            <button
              onClick={() => {
                setCountedCash(drawerData.drawer.cashCollected);
                setCloseDrawerModalOpen(true);
              }}
              className="btn btn-secondary"
              style={{ fontSize: 12, fontWeight: 700 }}
            >
              Close Shift Drawer
            </button>
          )}
        </div>
      </div>

      {/* ── Notifications ── */}
      {successMsg && (
        <div className="pill-success no-print" style={{ marginBottom: 14, padding: "8px 16px", borderRadius: 8 }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="pill-danger no-print" style={{ marginBottom: 14, padding: "8px 16px", borderRadius: 8 }}>
          {errorMsg}
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="no-print" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--color-border, #E2E8F0)", marginBottom: 18 }}>
        <button
          onClick={() => setActiveTab("cashier")}
          style={{
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 800,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "cashier" ? "var(--color-brand-navy, #0B2545)" : "var(--color-text-secondary)",
            borderBottom: activeTab === "cashier" ? "2px solid var(--color-brand-navy, #0B2545)" : "2px solid transparent",
          }}
        >
          Counter Cashier Desk
        </button>

        <button
          onClick={() => setActiveTab("pending")}
          style={{
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 800,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "pending" ? "var(--color-brand-navy, #0B2545)" : "var(--color-text-secondary)",
            borderBottom: activeTab === "pending" ? "2px solid var(--color-brand-navy, #0B2545)" : "2px solid transparent",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>Pending Approvals</span>
          {pendingPayments.length > 0 && (
            <span
              style={{
                backgroundColor: "#D97706",
                color: "#FFFFFF",
                fontSize: 10.5,
                fontWeight: 800,
                padding: "1px 6px",
                borderRadius: 10,
              }}
            >
              {pendingPayments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("drawer")}
          style={{
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 800,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "drawer" ? "var(--color-brand-navy, #0B2545)" : "var(--color-text-secondary)",
            borderBottom: activeTab === "drawer" ? "2px solid var(--color-brand-navy, #0B2545)" : "2px solid transparent",
          }}
        >
          Shift Reconciliation ({drawerData?.summary.transactionsCount || 0} Txns)
        </button>

        <button
          onClick={() => setActiveTab("debtors")}
          style={{
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 800,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "debtors" ? "var(--color-brand-navy, #0B2545)" : "var(--color-text-secondary)",
            borderBottom: activeTab === "debtors" ? "2px solid var(--color-brand-navy, #0B2545)" : "2px solid transparent",
          }}
        >
          Debtors Aging Matrix ({debtorsList.length})
        </button>

        <button
          onClick={() => setActiveTab("statement")}
          style={{
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 800,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "statement" ? "var(--color-brand-navy, #0B2545)" : "var(--color-text-secondary)",
            borderBottom: activeTab === "statement" ? "2px solid var(--color-brand-navy, #0B2545)" : "2px solid transparent",
          }}
        >
          Student Financial Statement
        </button>
      </div>

      {/* ── TAB 1: COUNTER CASHIER DESK ── */}
      {activeTab === "cashier" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
          {/* Left Column: Collection Form */}
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              border: "1px solid var(--color-border, #E2E8F0)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 900, color: "var(--color-ink)" }}>
              Record Payment &amp; Issue Receipt
            </h3>

            {/* Student Search with Autocomplete */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
                1. Select Enrolled Student
              </label>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setSelectedStudent(null);
                }}
                placeholder="Type student name or admission number..."
                className="input"
                style={{ width: "100%" }}
              />

              {/* Autocomplete Dropdown */}
              {!selectedStudent && filteredStudents.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--color-border, #CBD5E1)",
                    borderRadius: 6,
                    marginTop: 4,
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    zIndex: 20,
                  }}
                >
                  {filteredStudents.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => handleSelectStudent(st)}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid #F1F5F9",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div>
                        <span style={{ fontWeight: 800, fontSize: 12, color: "var(--color-ink)" }}>
                          {st.firstName} {st.lastName}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--color-text-secondary)", marginLeft: 6 }}>
                          {st.admissionNumber}
                        </span>
                      </div>
                      <span className="pill-neutral" style={{ fontSize: 9.5 }}>
                        {st.enrollments?.[0]?.classSection?.name || "Class"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Card */}
            {selectedStudent && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#166534" }}>
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: "#15803D" }}>
                    Adm No: {selectedStudent.admissionNumber} · Class: {selectedStudent.enrollments?.[0]?.classSection?.name || "General"}
                  </div>
                  <div style={{ fontSize: 10, color: "#166534", marginTop: 2 }}>
                    Guardian: {selectedStudent.guardianName || "On Record"} ({selectedStudent.guardianPhone || "No Phone"})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentSearch("");
                  }}
                  style={{
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#991B1B",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Change
                </button>
              </div>
            )}

            {/* Payment Fields */}
            <form onSubmit={handleCollectFee}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
                    2. Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input"
                    style={{ width: "100%" }}
                  >
                    <option value="CASH">Physical Cash</option>
                    <option value="POS_TERMINAL">POS Card Terminal</option>
                    <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                    <option value="BANK_DEPOSIT">Bank Branch Deposit</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
                    3. Total Amount (₦)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={amount || ""}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    placeholder="Enter amount in Naira"
                    className="input"
                    style={{ width: "100%", fontWeight: 800, fontSize: 14, color: "var(--color-brand-navy, #0B2545)" }}
                    required
                  />
                </div>
              </div>

              {/* Quick Amount Presets */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {[10000, 25000, 50000, 75000, 100000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAmountChange(preset)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: 700,
                      backgroundColor: amount === preset ? "var(--color-brand-teal, #0E7D75)" : "#F1F5F9",
                      color: amount === preset ? "#FFFFFF" : "var(--color-ink)",
                      border: "1px solid #CBD5E1",
                      cursor: "pointer",
                    }}
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Multi-Fee Allocations */}
              <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  Fee Component Breakdown:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: "var(--color-text-secondary)" }}>Tuition &amp; Academics (₦)</span>
                    <input
                      type="number"
                      value={tuitionAlloc || ""}
                      onChange={(e) => setTuitionAlloc(Number(e.target.value))}
                      className="input"
                      style={{ width: "100%", marginTop: 2, fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: "var(--color-text-secondary)" }}>PTA &amp; Development Levies (₦)</span>
                    <input
                      type="number"
                      value={levyAlloc || ""}
                      onChange={(e) => setLevyAlloc(Number(e.target.value))}
                      className="input"
                      style={{ width: "100%", marginTop: 2, fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              {/* Reference & Notes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                    POS / Transfer Reference
                  </label>
                  <input
                    type="text"
                    value={externalReference}
                    onChange={(e) => setExternalReference(e.target.value)}
                    placeholder="e.g. POS RRN, Teller Ref"
                    className="input"
                    style={{ width: "100%", fontSize: 12 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                    Bursar Notes / Memo
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Part payment for 1st Term"
                    className="input"
                    style={{ width: "100%", fontSize: 12 }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingPayment || !selectedStudent || amount <= 0}
                className="btn btn-primary"
                style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 900 }}
              >
                {submittingPayment ? "Processing Official Receipt..." : `Collect ₦${amount.toLocaleString()} & Issue Official Receipt`}
              </button>
            </form>
          </div>

          {/* Right Column: Shift Summary & Quick Reprint */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Today's Cash Drawer Card */}
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#F8FAFC",
                border: "1px solid var(--color-border, #E2E8F0)",
              }}
            >
              <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
                Today's Shift Drawer Cash
              </h4>

              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--color-brand-navy, #0B2545)" }}>
                ₦{(drawerData?.summary.cashTotal || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Physical Cash in Custody
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14, borderTop: "1px solid #E2E8F0", paddingTop: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>POS Terminal:</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1E40AF" }}>
                    ₦{(drawerData?.summary.posTotal || 0).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Bank Transfers:</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0E7D75" }}>
                    ₦{(drawerData?.summary.transferTotal || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Payments Stream */}
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                border: "1px solid var(--color-border, #E2E8F0)",
                backgroundColor: "#FFFFFF",
                flex: 1,
              }}
            >
              <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: "var(--color-ink)" }}>
                Recent Collections Today
              </h4>

              {drawerData?.recentPayments && drawerData.recentPayments.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                  {drawerData.recentPayments.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-ink)" }}>
                          {p.studentName}
                        </div>
                        <div style={{ fontSize: 9.5, color: "var(--color-text-secondary)" }}>
                          {p.reference} · {p.method}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#065F46" }}>
                          ₦{p.amount.toLocaleString()}
                        </div>
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/v1/bursar/receipt/${p.id}`);
                            if (res.ok) {
                              const r = await res.json();
                              setCurrentReceipt(r);
                              setReceiptModalOpen(true);
                            }
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            fontSize: 9,
                            fontWeight: 700,
                            color: "var(--color-brand-teal, #0E7D75)",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#94A3B8", fontSize: 11 }}>
                  No fee payments recorded in this shift yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: PENDING APPROVALS QUEUE ── */}
      {activeTab === "pending" && (
        <div>
          {/* Overview Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
            <div style={{ padding: 16, borderRadius: 10, backgroundColor: "#FFFBEB", border: "1px solid #FCD34D" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>
                Awaiting Bursary Verification
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#B45309", marginTop: 2 }}>
                {pendingPayments.length} Submissions
              </div>
              <div style={{ fontSize: 11, color: "#78350F" }}>
                Parent &amp; student payments requiring bank audit
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 10, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                Total Pending Value
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--color-brand-navy, #0B2545)", marginTop: 2 }}>
                ₦{pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toLocaleString("en-NG")}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                Unverified intake pending clearance
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 10, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={fetchPending}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, fontWeight: 700, width: "100%" }}
                  disabled={loadingPending}
                >
                  {loadingPending ? "Refreshing..." : "Refresh Submissions Queue"}
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                  Online &amp; Bank Transfer Submissions
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>
                  Each submission requires Bursary confirmation against school bank account credits before clearing student debt.
                </p>
              </div>
            </div>

            {pendingPayments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-text-secondary)", fontSize: 13 }}>
                No pending payments awaiting verification. All submitted payments have been verified or resolved.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px" }}>Student</th>
                      <th style={{ textAlign: "left", padding: "10px 12px" }}>Invoice / Term</th>
                      <th style={{ textAlign: "right", padding: "10px 12px" }}>Amount (₦)</th>
                      <th style={{ textAlign: "left", padding: "10px 12px" }}>Channel</th>
                      <th style={{ textAlign: "left", padding: "10px 12px" }}>Reference</th>
                      <th style={{ textAlign: "left", padding: "10px 12px" }}>Submitted Date</th>
                      <th style={{ textAlign: "right", padding: "10px 12px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                          <div>
                            {p.invoice?.student ? `${p.invoice.student.lastName}, ${p.invoice.student.firstName}` : "Student"}
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                            {p.invoice?.student?.admissionNumber || "—"}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div>{p.invoice?.term?.name || "Term Invoice"}</div>
                          <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)" }}>
                            Total: ₦{Number(p.invoice?.totalAmount || 0).toLocaleString("en-NG")}
                          </div>
                        </td>
                        <td style={{ textAlign: "right", padding: "10px 12px", fontWeight: 800, color: "var(--color-ink)" }}>
                          ₦{Number(p.amount || 0).toLocaleString("en-NG")}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span className="pill-neutral" style={{ fontSize: 10 }}>
                            {p.method?.replace(/_/g, " ") || "Online"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11 }}>
                          <div>{p.reference}</div>
                          {p.notes && (
                            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontStyle: "italic", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--color-text-secondary)" }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td style={{ textAlign: "right", padding: "10px 12px" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setConfirmTargetPayment(p)}
                              className="btn btn-primary"
                              style={{ padding: "4px 10px", fontSize: 11, backgroundColor: "#059669", color: "#ffffff" }}
                            >
                              Verify &amp; Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectTargetPayment(p)}
                              className="btn btn-secondary"
                              style={{ padding: "4px 10px", fontSize: 11, color: "var(--color-danger-text)" }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SHIFT RECONCILIATION ── */}
      {activeTab === "drawer" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
            <div style={{ padding: 16, borderRadius: 10, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                Total Shift Intake
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--color-brand-navy, #0B2545)", marginTop: 2 }}>
                ₦{(drawerData?.summary.grandTotal || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)" }}>
                Across {drawerData?.summary.transactionsCount || 0} Transactions
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 10, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                Cash In Custody
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#166534", marginTop: 2 }}>
                ₦{(drawerData?.summary.cashTotal || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)" }}>
                Counted against receipts
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 10, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                POS Card Terminal
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1E40AF", marginTop: 2 }}>
                ₦{(drawerData?.summary.posTotal || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)" }}>
                Merchant settlement
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 10, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                Electronic Bank Transfers
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0E7D75", marginTop: 2 }}>
                ₦{(drawerData?.summary.transferTotal || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)" }}>
                Direct bank credit
              </div>
            </div>
          </div>

          {/* Drawer Reconciliation Details */}
          <div style={{ padding: 20, borderRadius: 12, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800 }}>
              Shift Drawer Status &amp; Handover Details
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
              <div>
                <p><strong>Shift Date:</strong> {new Date().toLocaleDateString("en-GB")}</p>
                <p><strong>Drawer Status:</strong> <span className={drawerData?.drawer.status === "OPEN" ? "pill-success" : "pill-neutral"}>{drawerData?.drawer.status}</span></p>
                <p><strong>Expected Cash:</strong> ₦{(drawerData?.drawer.cashCollected || 0).toLocaleString()}</p>
              </div>

              <div>
                <p><strong>Counted Cash:</strong> ₦{(drawerData?.drawer.closingCash ?? drawerData?.drawer.cashCollected ?? 0).toLocaleString()}</p>
                <p><strong>Variance / Difference:</strong> ₦{(drawerData?.drawer.difference || 0).toLocaleString()}</p>
                <p><strong>Closure Notes:</strong> {drawerData?.drawer.closureNotes || "Shift actively in progress"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: DEBTORS AGING MATRIX ── */}
      {activeTab === "debtors" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                Total Outstanding School Fee Arrears
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#B91C1C", marginTop: 2 }}>
                ₦{totalDebtOutstanding.toLocaleString()}
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ fontSize: 12, fontWeight: 700 }}
            >
              Print Debtors Notice List
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid var(--color-border, #E2E8F0)" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px" }}>Student Name</th>
                  <th style={{ textAlign: "left", padding: "10px 12px" }}>Class</th>
                  <th style={{ textAlign: "left", padding: "10px 12px" }}>Guardian / Parent</th>
                  <th style={{ textAlign: "right", padding: "10px 12px" }}>Total Billed</th>
                  <th style={{ textAlign: "right", padding: "10px 12px" }}>Paid Amount</th>
                  <th style={{ textAlign: "right", padding: "10px 12px" }}>Outstanding Debt</th>
                  <th style={{ textAlign: "center", padding: "10px 12px" }}>Aging Category</th>
                </tr>
              </thead>
              <tbody>
                {debtorsList.map((d) => (
                  <tr key={d.invoiceId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 800 }}>
                      {d.studentName}
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                        {d.admissionNumber}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{d.className}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div>{d.parentName}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{d.parentPhone}</div>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 12px" }}>₦{d.totalBilled.toLocaleString()}</td>
                    <td style={{ textAlign: "right", padding: "10px 12px", color: "#166534" }}>₦{d.paidAmount.toLocaleString()}</td>
                    <td style={{ textAlign: "right", padding: "10px 12px", fontWeight: 900, color: "#B91C1C" }}>
                      ₦{d.outstandingBalance.toLocaleString()}
                    </td>
                    <td style={{ textAlign: "center", padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: d.daysOverdue > 60 ? "#FEE2E2" : d.daysOverdue > 30 ? "#FEF3C7" : "#F1F5F9",
                          color: d.daysOverdue > 60 ? "#991B1B" : d.daysOverdue > 30 ? "#92400E" : "#475569",
                        }}
                      >
                        {d.agingCategory}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: STUDENT FINANCIAL STATEMENT / LEDGER ── */}
      {activeTab === "statement" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <select
              value={statementStudentId}
              onChange={(e) => {
                setStatementStudentId(e.target.value);
                handleLoadStatement(e.target.value);
              }}
              className="input"
              style={{ maxWidth: 360 }}
            >
              <option value="">Select a student to load statement of account...</option>
              {studentsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNumber})
                </option>
              ))}
            </select>
          </div>

          {statementData && (
            <div style={{ padding: 20, borderRadius: 12, border: "1px solid #CBD5E1", backgroundColor: "#FFFFFF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0B2545", paddingBottom: 12, marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0B2545" }}>
                    Student Statement of Account
                  </h3>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {statementData.student.name} · {statementData.student.admissionNumber} · Class: {statementData.student.classSection}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Net Balance Outstanding</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#B91C1C" }}>
                    ₦{statementData.summary.netBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC" }}>
                    <th style={{ textAlign: "left", padding: "8px 10px" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "8px 10px" }}>Transaction Description</th>
                    <th style={{ textAlign: "left", padding: "8px 10px" }}>Reference</th>
                    <th style={{ textAlign: "right", padding: "8px 10px" }}>Debit (₦)</th>
                    <th style={{ textAlign: "right", padding: "8px 10px" }}>Credit (₦)</th>
                    <th style={{ textAlign: "right", padding: "8px 10px" }}>Rolling Balance (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {statementData.ledgerEntries.map((e: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "8px 10px" }}>{new Date(e.date).toLocaleDateString("en-GB")}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>{e.description}</td>
                      <td style={{ padding: "8px 10px", color: "#64748B" }}>{e.reference}</td>
                      <td style={{ textAlign: "right", padding: "8px 10px" }}>
                        {e.type === "DEBIT" ? `₦${e.amount.toLocaleString()}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 10px", color: "#166534" }}>
                        {e.type === "CREDIT" ? `₦${e.amount.toLocaleString()}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 800 }}>
                        ₦{e.runningBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: OFFICIAL CERTIFIED RECEIPT ── */}
      {receiptModalOpen && currentReceipt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(16, 20, 26, 0.56)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 28,
              width: "100%",
              maxWidth: 580,
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 30px -5px rgba(0, 0, 0, 0.15)",
            }}
          >
            {/* Action Bar */}
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span className="pill-success" style={{ fontWeight: 800, fontSize: 11 }}>
                Payment Confirmed
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, fontWeight: 800 }}
                >
                  Print Receipt
                </button>
                <button
                  onClick={() => setReceiptModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, fontWeight: 700 }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Official Printable Receipt Document */}
            <div
              className="receipt-print-card"
              style={{
                border: "2px solid #0B2545",
                padding: 24,
                borderRadius: 8,
                backgroundColor: "#FFFFFF",
              }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", borderBottom: "2px solid #0B2545", paddingBottom: 12, marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#0B2545", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {currentReceipt.school.name || "Bright Future Academy"}
                </h2>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                  {currentReceipt.school.address}
                </div>
                <div style={{ fontSize: 9.5, color: "#64748B" }}>
                  Phone: {currentReceipt.school.phone} · Email: {currentReceipt.school.email}
                </div>
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    padding: "3px 12px",
                    backgroundColor: "#0B2545",
                    color: "#FFFFFF",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    borderRadius: 4,
                  }}
                >
                  Official Payment Receipt
                </div>
              </div>

              {/* Receipt Metadata */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 14 }}>
                <div>
                  <div><strong>Receipt No:</strong> <span style={{ fontFamily: "monospace", fontWeight: 800 }}>{currentReceipt.receiptNumber}</span></div>
                  <div><strong>Date:</strong> {new Date(currentReceipt.paidAt).toLocaleDateString("en-GB")} {new Date(currentReceipt.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div><strong>Payment Mode:</strong> {currentReceipt.method}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div><strong>Student Name:</strong> {currentReceipt.student.name}</div>
                  <div><strong>Admission No:</strong> {currentReceipt.student.admissionNumber}</div>
                  <div><strong>Class:</strong> {currentReceipt.student.classSection}</div>
                </div>
              </div>

              {/* Itemized Allocations Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: "#F1F5F9", borderTop: "1px solid #CBD5E1", borderBottom: "1px solid #CBD5E1" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px" }}>Item Description</th>
                    <th style={{ textAlign: "right", padding: "6px 8px" }}>Amount Paid (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReceipt.allocations.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "6px 8px" }}>{item.name}</td>
                      <td style={{ textAlign: "right", padding: "6px 8px", fontWeight: 800 }}>
                        ₦{item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #0B2545", backgroundColor: "#F8FAFC" }}>
                    <td style={{ padding: "8px", fontWeight: 900, textTransform: "uppercase" }}>Total Amount Paid</td>
                    <td style={{ textAlign: "right", padding: "8px", fontWeight: 900, fontSize: 13, color: "#166534" }}>
                      ₦{currentReceipt.amount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Outstanding Balance Banner */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 6,
                  backgroundColor: currentReceipt.balanceRemaining === 0 ? "#DCFCE7" : "#FEF3C7",
                  border: `1px solid ${currentReceipt.balanceRemaining === 0 ? "#86EFAC" : "#FDE68A"}`,
                  fontSize: 11,
                  fontWeight: 800,
                  marginBottom: 16,
                }}
              >
                <span>Term Bill: ₦{currentReceipt.invoiceTotal.toLocaleString()}</span>
                <span>
                  Remaining Balance: ₦{currentReceipt.balanceRemaining.toLocaleString()}
                </span>
              </div>

              {/* Signatures & Seal */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 10, borderTop: "1px solid #E2E8F0" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 140, borderBottom: "1px solid #182220", marginBottom: 4 }} />
                  <div style={{ fontSize: 9.5, fontWeight: 700 }}>{currentReceipt.cashier.name}</div>
                  <div style={{ fontSize: 8.5, color: "#64748B" }}>Authorized Bursar / Cashier</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 70, height: 28, border: "1px dashed #70817B", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#70817B", margin: "0 auto 3px" }}>
                    Finance Stamp
                  </div>
                  <div style={{ fontSize: 8, color: "#64748B" }}>Official Stamp</div>
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: 12, fontSize: 8.5, color: "#94A3B8" }}>
                Valid without alteration · Bright Future Academy Computer-Generated Official Receipt
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CLOSE SHIFT CASH DRAWER ── */}
      {closeDrawerModalOpen && drawerData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(16, 20, 26, 0.56)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 24,
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "var(--color-brand-navy, #0B2545)" }}>
              Close Shift Cash Drawer
            </h3>
            <p style={{ margin: "4px 0 16px", fontSize: 12, color: "var(--color-text-secondary)" }}>
              Verify physical cash in custody against electronic receipts and record handover reconciliation.
            </p>

            <div style={{ marginBottom: 12, padding: "10px", borderRadius: 6, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Expected Cash (Receipts):</span>
                <strong>₦{drawerData.drawer.cashCollected.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
                Counted Physical Cash in Drawer (₦)
              </label>
              <input
                type="number"
                min={0}
                value={countedCash}
                onChange={(e) => setCountedCash(Number(e.target.value))}
                className="input"
                style={{ width: "100%", fontWeight: 800, fontSize: 14 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
                Handover Notes / Variance Justification
              </label>
              <textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="e.g. Cash counted and handed over to Principal / Bank deposit"
                className="input"
                rows={3}
                style={{ width: "100%", fontSize: 12 }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setCloseDrawerModalOpen(false)}
                className="btn btn-secondary"
                disabled={closingDrawer}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={() => setIsConfirmCloseDrawerOpen(true)}
                className="btn btn-primary"
                disabled={closingDrawer}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                Proceed to Reconcile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: 2-STEP CONFIRM CASHIER PAYMENT COLLECTION ── */}
      <ActionConfirmationModal
        isOpen={isConfirmCollectOpen}
        title="Confirm Cashier Payment Collection"
        message={`Confirm collection and official receipt generation of ₦${Number(amount || 0).toLocaleString("en-NG")} for ${selectedStudent?.firstName} ${selectedStudent?.lastName}.`}
        warningNote="An official certified sequential receipt (BFA-REC-2026-XXXX) will be generated and student ledger balance will be decremented. This action is permanently audited."
        confirmVariant="success"
        confirmText="Collect &amp; Issue Receipt"
        cancelText="Review Form"
        isProcessing={submittingPayment}
        onCancel={() => setIsConfirmCollectOpen(false)}
        onConfirm={executeCollectFee}
        details={
          selectedStudent
            ? [
                {
                  label: "Student",
                  value: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
                },
                {
                  label: "Admission No",
                  value: selectedStudent.admissionNumber || "—",
                },
                {
                  label: "Payment Amount",
                  value: `₦${Number(amount || 0).toLocaleString("en-NG")}`,
                  highlight: true,
                },
                {
                  label: "Payment Channel",
                  value: paymentMethod,
                },
                {
                  label: "Tuition Allocation",
                  value: `₦${Number(tuitionAlloc || 0).toLocaleString("en-NG")}`,
                },
                {
                  label: "PTA / Dev Levy Allocation",
                  value: `₦${Number(levyAlloc || 0).toLocaleString("en-NG")}`,
                },
                ...(externalReference ? [{ label: "Bank / POS Reference", value: externalReference }] : []),
              ]
            : []
        }
      />

      {/* ── MODAL: 2-STEP CONFIRM DRAWER CLOSEOUT ── */}
      <ActionConfirmationModal
        isOpen={isConfirmCloseDrawerOpen}
        title="Confirm Shift Cash Drawer Closeout"
        message="You are about to reconcile and permanently close today's cashier shift drawer."
        warningNote="Once closed, this cash drawer shift is locked and cannot be reopened. Any further counter collections will require starting a new drawer shift."
        confirmVariant="danger"
        confirmText="Lock &amp; Close Shift Drawer"
        cancelText="Keep Open"
        isProcessing={closingDrawer}
        onCancel={() => setIsConfirmCloseDrawerOpen(false)}
        onConfirm={executeCloseDrawer}
        details={
          drawerData
            ? [
                {
                  label: "Shift Date",
                  value: new Date().toLocaleDateString("en-GB"),
                },
                {
                  label: "System Expected Cash",
                  value: `₦${Number(drawerData.drawer.cashCollected || 0).toLocaleString("en-NG")}`,
                },
                {
                  label: "Counted Physical Cash",
                  value: `₦${Number(countedCash || 0).toLocaleString("en-NG")}`,
                  highlight: true,
                },
                {
                  label: "Reconciliation Variance",
                  value: `₦${(Number(countedCash || 0) - Number(drawerData.drawer.cashCollected || 0)).toLocaleString("en-NG")}`,
                },
                {
                  label: "Total Intake Across Channels",
                  value: `₦${Number(drawerData.summary.grandTotal || 0).toLocaleString("en-NG")}`,
                },
              ]
            : []
        }
      />

      {/* ── MODAL: 2-STEP CONFIRM ONLINE PAYMENT VERIFICATION ── */}
      <ActionConfirmationModal
        isOpen={Boolean(confirmTargetPayment)}
        title="Confirm &amp; Verify Payment Submission"
        message="You are verifying that this online or bank transfer payment has reflected in school accounts."
        warningNote="Verifying this submission immediately credits the student invoice, clears parent arrears, and reflects in total collected revenue. This action is permanently audited."
        confirmVariant="success"
        confirmText="Verify &amp; Credit Student"
        cancelText="Cancel"
        isProcessing={actionProcessing}
        onCancel={() => setConfirmTargetPayment(null)}
        onConfirm={executeConfirmPendingPayment}
        details={
          confirmTargetPayment
            ? [
                {
                  label: "Student",
                  value: confirmTargetPayment.invoice?.student
                    ? `${confirmTargetPayment.invoice.student.firstName} ${confirmTargetPayment.invoice.student.lastName}`
                    : "Student",
                },
                {
                  label: "Admission No",
                  value: confirmTargetPayment.invoice?.student?.admissionNumber || "—",
                },
                {
                  label: "Amount to Credit",
                  value: `₦${Number(confirmTargetPayment.amount || 0).toLocaleString("en-NG")}`,
                  highlight: true,
                },
                {
                  label: "Payment Channel",
                  value: confirmTargetPayment.method?.replace(/_/g, " ") || "Online",
                },
                {
                  label: "Submission Reference",
                  value: confirmTargetPayment.reference,
                },
                {
                  label: "Invoice Term",
                  value: confirmTargetPayment.invoice?.term?.name || "Term Invoice",
                },
              ]
            : []
        }
      />

      {/* ── MODAL: REJECT PAYMENT REASON MODAL ── */}
      <RejectPaymentModal
        isOpen={Boolean(rejectTargetPayment)}
        onClose={() => setRejectTargetPayment(null)}
        onConfirm={executeRejectPendingPayment}
        isProcessing={actionProcessing}
        paymentDetails={
          rejectTargetPayment
            ? {
                studentName: rejectTargetPayment.invoice?.student
                  ? `${rejectTargetPayment.invoice.student.firstName} ${rejectTargetPayment.invoice.student.lastName}`
                  : "Student",
                admissionNumber: rejectTargetPayment.invoice?.student?.admissionNumber || "—",
                amount: rejectTargetPayment.amount,
                reference: rejectTargetPayment.reference,
                method: rejectTargetPayment.method,
              }
            : null
        }
      />
    </div>
  );
}
