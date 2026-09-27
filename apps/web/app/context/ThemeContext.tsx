"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const applyTheme = useCallback((targetTheme: Theme) => {
    let active: "light" | "dark" = "light";
    if (targetTheme === "system") {
      if (typeof window !== "undefined" && window.matchMedia) {
        active = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
    } else {
      active = targetTheme;
    }

    setResolvedTheme(active);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", active);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sms-theme") as Theme | null;
      const initialTheme: Theme = saved === "dark" || saved === "light" || saved === "system" ? saved : "light";
      setThemeState(initialTheme);
      applyTheme(initialTheme);
    } catch {}

    const mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const handleChange = () => {
      const current = localStorage.getItem("sms-theme") as Theme | null;
      if (current === "system") {
        applyTheme("system");
      }
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [applyTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("sms-theme", newTheme);
    } catch {}
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
