"use client";

import React, { useState, useMemo } from "react";

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD or readable string
  category: "exam" | "class" | "event" | "deadline";
  tag?: string;
  daysRemaining?: number;
  progressPercent?: number; // 0 to 100
  color?: string; // e.g. blue, purple, teal, orange
}

interface MiniCalendarScheduleProps {
  events?: ScheduleEvent[];
  title?: string;
  onEventClick?: (event: ScheduleEvent) => void;
}

export default function MiniCalendarSchedule({
  events = [],
  title = "Schedule & Upcoming Assessments",
  onEventClick,
}: MiniCalendarScheduleProps) {
  const [currentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Month days computation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
    // Convert to Monday = 0
    const startOffset = (firstDayIndex + 6) % 7;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      hasEvents: boolean;
      eventColors: string[];
    }> = [];

    // Previous month padding
    const prevMonthTotal = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        day: prevMonthTotal - i,
        isCurrentMonth: false,
        hasEvents: false,
        eventColors: [],
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      // Check if this date has events
      const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const matched = events.filter((e) => e.date === dayStr || e.date.includes(String(d)));
      const colors = matched.map((e) => e.color || (e.category === "exam" ? "#3b82f6" : "#f59e0b"));

      days.push({
        day: d,
        isCurrentMonth: true,
        hasEvents: matched.length > 0,
        eventColors: colors.slice(0, 3),
      });
    }

    // Trailing padding to make full 35 or 42 grid
    const remaining = 35 - days.length;
    if (remaining > 0) {
      for (let i = 1; i <= remaining; i++) {
        days.push({
          day: i,
          isCurrentMonth: false,
          hasEvents: false,
          eventColors: [],
        });
      }
    }

    return days;
  }, [year, month, events]);

  const defaultEvents: ScheduleEvent[] = [
    {
      id: "ev-1",
      title: "Mathematics Mid-Term Exam",
      date: `${year}-${String(month + 1).padStart(2, "0")}-14`,
      category: "exam",
      tag: "Term Exam",
      daysRemaining: 5,
      progressPercent: 65,
      color: "#3b82f6",
    },
    {
      id: "ev-2",
      title: "English Language Assessment",
      date: `${year}-${String(month + 1).padStart(2, "0")}-22`,
      category: "exam",
      tag: "Continuous Assessment",
      daysRemaining: 12,
      progressPercent: 40,
      color: "#8b5cf6",
    },
    {
      id: "ev-3",
      title: "Basic Science Practical & QA",
      date: `${year}-${String(month + 1).padStart(2, "0")}-25`,
      category: "class",
      tag: "Lab Practical",
      daysRemaining: 15,
      progressPercent: 25,
      color: "#0d9488",
    },
    {
      id: "ev-4",
      title: "PTA & Academic Review",
      date: `${year}-${String(month + 1).padStart(2, "0")}-28`,
      category: "event",
      tag: "School Event",
      daysRemaining: 18,
      progressPercent: 15,
      color: "#f59e0b",
    },
  ];

  const activeEvents = events.length > 0 ? events : defaultEvents;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
          {title}
        </h2>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 }}>
          {monthName} {year}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 340px) 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Left Side: Monthly Mini Dot Calendar */}
        <div
          className="card"
          style={{
            backgroundColor: "#ffffff",
            padding: "16px 18px",
            borderRadius: 18,
          }}
        >
          {/* Weekday headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
              <div
                key={day}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  padding: "4px 0",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              rowGap: 4,
              columnGap: 2,
              textAlign: "center",
            }}
          >
            {calendarDays.map((item, idx) => {
              const isSelected = selectedDay === item.day && item.isCurrentMonth;
              const isToday =
                item.isCurrentMonth && item.day === currentDate.getDate();

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => item.isCurrentMonth && setSelectedDay(item.day)}
                  style={{
                    background: isSelected
                      ? "var(--color-ink)"
                      : isToday
                      ? "rgba(0,0,0,0.05)"
                      : "transparent",
                    color: isSelected
                      ? "#ffffff"
                      : item.isCurrentMonth
                      ? "var(--color-ink)"
                      : "rgba(0,0,0,0.25)",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 34,
                    margin: "0 auto",
                    cursor: item.isCurrentMonth ? "pointer" : "default",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: isToday || isSelected ? 700 : 400,
                    position: "relative",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{item.day}</span>
                  {/* Event Dots */}
                  {item.hasEvents && (
                    <div
                      style={{
                        display: "flex",
                        gap: 2,
                        marginTop: 1,
                        position: "absolute",
                        bottom: 3,
                      }}
                    >
                      {item.eventColors.map((dotColor, dotIdx) => (
                        <span
                          key={dotIdx}
                          style={{
                            width: 3.5,
                            height: 3.5,
                            borderRadius: "50%",
                            backgroundColor: isSelected ? "#ffffff" : dotColor,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Upcoming Exam & Timetable Cards with Countdown Bars */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {activeEvents.map((event) => {
            const barColor = event.color || "#3b82f6";
            const percent = event.progressPercent ?? 50;

            return (
              <div
                key={event.id}
                className="card"
                style={{
                  backgroundColor: "#ffffff",
                  padding: "16px 18px",
                  borderRadius: 18,
                  cursor: onEventClick ? "pointer" : "default",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onClick={() => onEventClick?.(event)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        border: `2px solid ${barColor}`,
                        display: "inline-block",
                      }}
                    />
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        margin: 0,
                      }}
                    >
                      {event.title}
                    </h3>
                  </div>
                  {event.tag && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 12,
                        backgroundColor: "var(--color-page, #f4f4f2)",
                        color: "var(--color-text-secondary)",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {event.tag}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    marginBottom: 12,
                  }}
                >
                  {event.date}
                </div>

                {/* Days remaining & Progress bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    Days remaining
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--color-ink)" }}>
                    {event.daysRemaining !== undefined
                      ? `${event.daysRemaining} Days`
                      : "Upcoming"}
                  </span>
                </div>

                <div
                  style={{
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: "rgba(0, 0, 0, 0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${percent}%`,
                      backgroundColor: barColor,
                      borderRadius: 3,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
