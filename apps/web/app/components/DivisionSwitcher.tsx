"use client";

import React from "react";

export type SchoolDivision = "ALL" | "PRIMARY" | "SECONDARY";

export interface DivisionCounts {
  ALL?: number;
  PRIMARY?: number;
  SECONDARY?: number;
}

interface DivisionSwitcherProps {
  value: SchoolDivision;
  onChange: (division: SchoolDivision) => void;
  counts?: DivisionCounts;
  storageKey?: string;
  size?: "sm" | "md";
  className?: string;
  showLabel?: boolean;
}

export function getDivisionForLevel(level?: string | null): "PRIMARY" | "SECONDARY" {
  const l = (level || "").toUpperCase().trim();
  if (
    l.startsWith("JSS") ||
    l.startsWith("SSS") ||
    l.startsWith("SS") ||
    l.startsWith("BASIC 7") ||
    l.startsWith("BASIC 8") ||
    l.startsWith("BASIC 9")
  ) {
    return "SECONDARY";
  }
  return "PRIMARY";
}

export default function DivisionSwitcher({
  value,
  onChange,
  counts,
  storageKey,
  size = "md",
  className = "",
  showLabel = true,
}: DivisionSwitcherProps) {
  const handleSelect = (div: SchoolDivision) => {
    onChange(div);
    if (storageKey && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(storageKey, div);
      } catch {
        // Storage access might fail in private windows
      }
    }
  };

  const options: Array<{ key: SchoolDivision; label: string; shortLabel: string }> = [
    { key: "ALL", label: "All Divisions", shortLabel: "All" },
    { key: "PRIMARY", label: "Nursery & Primary", shortLabel: "Primary" },
    { key: "SECONDARY", label: "Secondary (JSS & SSS)", shortLabel: "Secondary" },
  ];

  const isSmall = size === "sm";

  return (
    <div
      className={`division-switcher-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? 6 : 8,
        flexWrap: "wrap",
      }}
    >
      {showLabel && (
        <span
          style={{
            fontSize: isSmall ? 11 : 12,
            fontWeight: 700,
            color: "var(--color-text-secondary, #70817B)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginRight: 2,
            userSelect: "none",
          }}
        >
          Section:
        </span>
      )}

      <div
        role="tablist"
        aria-label="Institutional Division Selector"
        style={{
          display: "inline-flex",
          backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
          padding: isSmall ? 3 : 4,
          borderRadius: 9999,
          border: "1px solid var(--color-border, #E8ECE9)",
          gap: 2,
        }}
      >
        {options.map((opt) => {
          const isActive = value === opt.key;
          const count = counts ? counts[opt.key] : undefined;

          // Theme token assignment: Secondary gets brand teal, Primary/All gets brand navy
          const activeBg =
            opt.key === "SECONDARY"
              ? "var(--color-brand-teal, #0E7D75)"
              : "var(--color-brand-navy, #0B2545)";

          return (
            <button
              key={opt.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelect(opt.key)}
              style={{
                border: "none",
                outline: "none",
                background: isActive ? activeBg : "transparent",
                color: isActive ? "#FFFFFF" : "var(--color-text-secondary, #70817B)",
                padding: isSmall ? "4px 12px" : "6px 16px",
                borderRadius: 9999,
                fontSize: isSmall ? 12 : 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                boxShadow: isActive ? "0 2px 6px rgba(0, 0, 0, 0.12)" : "none",
                transition: "background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              <span>{isSmall ? opt.shortLabel : opt.label}</span>
              {typeof count === "number" && (
                <span
                  style={{
                    fontSize: isSmall ? 10 : 11,
                    fontWeight: 700,
                    backgroundColor: isActive ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.06)",
                    color: isActive ? "#FFFFFF" : "var(--color-ink, #182220)",
                    padding: "1px 6px",
                    borderRadius: 9999,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
