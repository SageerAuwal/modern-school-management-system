"use client";

import React from "react";

export interface ProfileTabItem {
  id: string;
  label: string;
  subtitle?: string;
  avatarText?: string;
  badgeCount?: number;
}

interface ProfileSwitcherTabsProps {
  items: ProfileTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onAddClick?: () => void;
  addTooltip?: string;
}

export default function ProfileSwitcherTabs({
  items,
  activeId,
  onSelect,
  onAddClick,
  addTooltip = "Add new profile or class",
}: ProfileSwitcherTabsProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 6px",
        backgroundColor: "var(--color-surface-hover, rgba(0, 0, 0, 0.04))",
        borderRadius: 24,
        border: "var(--border-width) solid var(--color-border)",
        maxWidth: "100%",
        overflowX: "auto",
      }}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const initials =
          item.avatarText ??
          item.label
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px 5px 6px",
              borderRadius: 20,
              border: isActive ? "1px solid var(--color-border)" : "1px solid transparent",
              backgroundColor: isActive ? "#ffffff" : "transparent",
              color: isActive ? "var(--color-ink)" : "var(--color-text-secondary)",
              fontWeight: isActive ? 600 : 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              whiteSpace: "nowrap",
            }}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: isActive ? "var(--color-ink)" : "rgba(0,0,0,0.08)",
                color: isActive ? "#ffffff" : "var(--color-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {initials}
            </div>

            <span>{item.label}</span>

            {/* Notification or Item Badge */}
            {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 9,
                  backgroundColor: isActive ? "var(--color-danger-bg)" : "rgba(0,0,0,0.08)",
                  color: isActive ? "var(--color-danger-text)" : "var(--color-text-secondary)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {item.badgeCount}
              </span>
            )}
          </button>
        );
      })}

      {onAddClick && (
        <button
          type="button"
          onClick={onAddClick}
          title={addTooltip}
          aria-label={addTooltip}
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: "1px dashed var(--color-border)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-ink)";
            e.currentTarget.style.color = "var(--color-ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
