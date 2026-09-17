"use client";

import React, { useState, useMemo } from "react";

export interface ActivityEvent {
  id: string;
  day: number; // 1 - 31
  month: number; // 0 - 11
  title: string;
  time: string;
  category:
    | "attendance-present"
    | "attendance-absent"
    | "assignment"
    | "lesson"
    | "exam"
    | "library"
    | "security"
    | "event";
}

interface ActivityTimelineProps {
  events?: ActivityEvent[];
  studentName?: string;
  onFilterClick?: () => void;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "March",
  "April",
  "May",
  "June",
  "July",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

const CATEGORY_STYLES: Record<
  string,
  { bg: string; color: string; border?: string; icon: React.ReactNode }
> = {
  "attendance-present": {
    bg: "#dcfce7",
    color: "#166534",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  "attendance-absent": {
    bg: "#fef3c7",
    color: "#92400e",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  assignment: {
    bg: "#e0e7ff",
    color: "#3730a3",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
      </svg>
    ),
  },
  lesson: {
    bg: "#e0f2fe",
    color: "#075985",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  exam: {
    bg: "#f3e8ff",
    color: "#6b21a8",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  library: {
    bg: "#ede9fe",
    color: "#5b21b6",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  security: {
    bg: "#ccfbf1",
    color: "#115e59",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  event: {
    bg: "#fee2e2",
    color: "#991b1b",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export default function ActivityTimeline({
  events = [],
  studentName,
  onFilterClick,
}: ActivityTimelineProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Default demo events if none supplied
  const defaultEvents: ActivityEvent[] = useMemo(() => {
    return [
      { id: "1", day: 1, month: selectedMonth, title: "Assignment Sent", time: "6:45 am", category: "assignment" },
      { id: "2", day: 1, month: selectedMonth, title: "Absent from class", time: "8:00 am", category: "attendance-absent" },
      { id: "3", day: 3, month: selectedMonth, title: "Assignment edited", time: "6:45 am", category: "assignment" },
      { id: "4", day: 3, month: selectedMonth, title: "Lesson Viewed", time: "9:15 am", category: "lesson" },
      { id: "5", day: 3, month: selectedMonth, title: "Present in class", time: "8:00 am", category: "attendance-present" },
      { id: "6", day: 6, month: selectedMonth, title: "PDF / Syllabus downloaded", time: "11:30 am", category: "library" },
      { id: "7", day: 6, month: selectedMonth, title: "Changed account Password", time: "2:15 pm", category: "security" },
      { id: "8", day: 9, month: selectedMonth, title: "Exam timetable viewed", time: "7:00 am", category: "exam" },
      { id: "9", day: 9, month: selectedMonth, title: "Present in class", time: "8:00 am", category: "attendance-present" },
      { id: "10", day: 9, month: selectedMonth, title: "Continuous Assessment recorded", time: "10:30 am", category: "exam" },
      { id: "11", day: 12, month: selectedMonth, title: "Library Book Loaned", time: "1:00 pm", category: "library" },
      { id: "12", day: 14, month: selectedMonth, title: "Mathematics Exam Completed", time: "11:00 am", category: "exam" },
    ];
  }, [selectedMonth]);

  const activeEvents = events.length > 0 ? events : defaultEvents;

  // Render day rows 1 to 15 (or full month)
  const days = Array.from({ length: 15 }, (_, i) => i + 1);

  return (
    <div
      className="card"
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 20,
        padding: "24px 28px",
        marginTop: 20,
      }}
    >
      {/* Top Bar: Title + Filter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
            Activity Calendar
          </h2>
          {studentName && (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
              Tracking chronological learning activity for <strong>{studentName}</strong>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (onFilterClick) onFilterClick();
            else setActiveCategoryFilter(activeCategoryFilter ? null : "attendance-present");
          }}
          className="btn btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            fontSize: 12,
            borderRadius: 18,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filter</span>
          <span
            style={{
              padding: "1px 6px",
              borderRadius: 10,
              backgroundColor: "var(--color-ink)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            1
          </span>
        </button>
      </div>

      {/* Horizontal Month Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 12,
          marginBottom: 20,
          borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        {MONTH_NAMES.map((name, index) => {
          const isSelected = selectedMonth === index;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setSelectedMonth(index)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: "none",
                backgroundColor: isSelected ? "var(--color-ink)" : "transparent",
                color: isSelected ? "#ffffff" : "var(--color-text-secondary)",
                fontSize: 13,
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Day-by-Day Timeline Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {days.map((dayNum) => {
          // Check if weekend (e.g. 4 and 5, 11 and 12)
          const isWeekend = dayNum === 4 || dayNum === 5 || dayNum === 11 || dayNum === 12;
          const dayEvents = activeEvents.filter(
            (e) =>
              e.day === dayNum &&
              (!activeCategoryFilter || e.category === activeCategoryFilter)
          );

          return (
            <div
              key={dayNum}
              style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr",
                alignItems: "center",
                columnGap: 16,
                minHeight: 38,
              }}
            >
              {/* Day Number / Circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: dayEvents.length > 0 ? "rgba(0,0,0,0.06)" : "transparent",
                  color: dayEvents.length > 0 ? "var(--color-ink)" : "var(--color-text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: dayEvents.length > 0 ? 700 : 400,
                }}
              >
                {dayNum}
              </div>

              {/* Event Pills or Status Text */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {isWeekend && dayEvents.length === 0 ? (
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,0.3)", fontStyle: "normal" }}>
                    Weekend
                  </span>
                ) : dayEvents.length === 0 ? (
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,0.25)" }}>
                    No events.
                  </span>
                ) : (
                  dayEvents.map((evt) => {
                    const style = CATEGORY_STYLES[evt.category] || {
                      bg: "#f1f5f9",
                      color: "#334155",
                      icon: null,
                    };

                    return (
                      <div
                        key={evt.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 14px",
                          borderRadius: 18,
                          backgroundColor: style.bg,
                          color: style.color,
                          fontSize: 12,
                          fontWeight: 500,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                          transition: "transform 0.15s ease",
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center" }}>
                          {style.icon}
                        </span>
                        <span>{evt.title}</span>
                        <span
                          style={{
                            fontSize: 11,
                            opacity: 0.75,
                            marginLeft: 4,
                            fontWeight: 400,
                          }}
                        >
                          {evt.time}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
