"use client";

import { useState, useEffect } from "react";

export interface CurrentUser {
  id: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "PARENT" | "STUDENT" | string;
  firstName: string;
  lastName: string;
  schoolId?: string;
  school?: { name: string };
  photoUrl?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then((data) => {
        if (!ignore && data?.id) {
          setUser(data);
        }
      })
      .catch(() => {
        if (!ignore) setUser(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const role = (user?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isBursar = role === "BURSAR";
  const isTeacher = role === "TEACHER" || role === "STAFF";
  const isParent = role === "PARENT";
  const isStudent = role === "STUDENT";

  return {
    user,
    role,
    isAdmin,
    isBursar,
    isTeacher,
    isParent,
    isStudent,
    loading,
  };
}
