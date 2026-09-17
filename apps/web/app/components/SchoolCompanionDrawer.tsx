"use client";

import React, { useState } from "react";

interface SchoolCompanionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userRole?: string;
}

interface HelperSuggestion {
  id: string;
  title: string;
  prompt: string;
  category: string;
}

export default function SchoolCompanionDrawer({
  isOpen,
  onClose,
  userName = "Amir",
  userRole = "Student",
}: SchoolCompanionDrawerProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<
    Array<{ sender: "user" | "assistant"; text: string; time: string }>
  >([]);

  if (!isOpen) return null;

  const categories = ["All", "Exams", "Assignments", "Schedule", "Classes", "Fees"];

  const suggestions: HelperSuggestion[] = [
    {
      id: "s1",
      title: "Create Exam Study Plan",
      prompt: "Generate a 5-day study revision plan for upcoming mid-term exams.",
      category: "Exams",
    },
    {
      id: "s2",
      title: "Generate 10 Practice Questions",
      prompt: "Provide 10 practice questions on Mathematics quadratic equations with explanations.",
      category: "Assignments",
    },
    {
      id: "s3",
      title: "Check Upcoming Timetable",
      prompt: "What classes and exam periods are scheduled for tomorrow?",
      category: "Schedule",
    },
    {
      id: "s4",
      title: "Review Fee Payment Status",
      prompt: "Show current term fee invoice breakdown and outstanding balance.",
      category: "Fees",
    },
    {
      id: "s5",
      title: "Class Attendance Summary",
      prompt: "Summarize current term attendance rate and any recorded absence notes.",
      category: "Classes",
    },
  ];

  const filteredSuggestions =
    activeCategory === "All"
      ? suggestions
      : suggestions.filter((s) => s.category === activeCategory);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || query).trim();
    if (!text) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { sender: "user" as const, text, time: timeStr };

    let replyText = `Here is the information regarding "${text}":\n\n`;
    if (text.toLowerCase().includes("exam") || text.toLowerCase().includes("study")) {
      replyText += "• Upcoming Exams: Mathematics (in 5 days), English Language (in 12 days).\n• Tip: Allocate 45 minutes daily for high-weight topics. You can review the full schedule under the Exams tab.";
    } else if (text.toLowerCase().includes("fee") || text.toLowerCase().includes("invoice")) {
      replyText += "• Current Status: Tuition Invoice is marked ACTIVE with full payment records preserved. View details in the Fees tab.";
    } else if (text.toLowerCase().includes("attendance")) {
      replyText += "• Current Attendance Rate: 94% (Present for 16 out of 17 marked sessions). All records are audited.";
    } else {
      replyText += "All school records, academic schedules, and module shortcuts are synced live with the school database.";
    }

    setMessages((prev) => [
      ...prev,
      userMsg,
      { sender: "assistant", text: replyText, time: timeStr },
    ]);
    setQuery("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(2px)",
        zIndex: 999,
        display: "flex",
        justifyContent: "flex-end",
        transition: "all 0.25s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 390,
          height: "100%",
          backgroundColor: "#ffffff",
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.12)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 22px",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 16,
            borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>
              School Companion
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 12,
                backgroundColor: "var(--color-ink)",
                color: "#ffffff",
                letterSpacing: "0.03em",
              }}
            >
              ✦ Active
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant panel"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              color: "var(--color-text-secondary)",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Welcome Section */}
        <div style={{ margin: "20px 0 16px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
            How can I help you, {userName}?
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-secondary)",
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            Ask anything about your academic status, assignments, exam schedule, or courses.
          </p>
        </div>

        {/* Category Pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 10,
            marginBottom: 14,
          }}
        >
          {categories.map((cat) => {
            const isCatActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 16,
                  border: isCatActive ? "1px solid var(--color-ink)" : "1px solid rgba(0,0,0,0.08)",
                  backgroundColor: isCatActive ? "var(--color-ink)" : "transparent",
                  color: isCatActive ? "#ffffff" : "var(--color-text-secondary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Messages or Preset Suggestions */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 ? (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-secondary)",
                  marginBottom: 10,
                }}
              >
                Quick Suggestions
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredSuggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => handleSendMessage(sug.prompt)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 14,
                      backgroundColor: "var(--color-page, #f8f8f7)",
                      border: "1px solid rgba(0, 0, 0, 0.04)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--color-page, #f8f8f7)";
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", marginBottom: 2 }}>
                      {sug.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.3 }}>
                      {sug.prompt}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  padding: "10px 14px",
                  borderRadius: 14,
                  backgroundColor: m.sender === "user" ? "var(--color-ink)" : "#f1f5f9",
                  color: m.sender === "user" ? "#ffffff" : "var(--color-ink)",
                  fontSize: 13,
                  lineHeight: 1.4,
                  whiteSpace: "pre-line",
                }}
              >
                {m.text}
              </div>
            ))
          )}
        </div>

        {/* Input Bar */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "var(--color-page, #f8f8f7)",
              borderRadius: 22,
              padding: "6px 12px",
              border: "1px solid rgba(0, 0, 0, 0.08)",
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="How can I help you today?"
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 13,
                color: "var(--color-ink)",
              }}
            />
            <button
              type="submit"
              aria-label="Send message"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                backgroundColor: "var(--color-ink)",
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
