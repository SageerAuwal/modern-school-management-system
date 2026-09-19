"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
  school?: {
    id: string;
    name: string;
    code: string;
  };
  student?: {
    id: string;
    admissionNumber: string;
    currentClass?: { name: string };
  };
  staff?: {
    id: string;
    employeeNumber: string;
    designation?: string;
  };
}

function AccountContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "security" ? "security" : "profile";

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "session">(initialTab);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Profile Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/v1/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
        }
      } catch {
        setProfileError("Failed to load user profile. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileSaving(true);

    try {
      const res = await fetch(`${API}/api/v1/users/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, email, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile details.");
      }

      setUser((prev) => (prev ? { ...prev, firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone } : data));
      setProfileSuccess("Your profile details have been updated successfully.");
    } catch (err: any) {
      setProfileError(err.message || "An error occurred while updating profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Please provide your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch(`${API}/api/v1/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to change password.");
      }

      setPasswordSuccess("Your password has been changed successfully. You can now use your new password for all future logins.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "An error occurred while changing password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const roleName = (user?.role || "ADMIN").toUpperCase();
  let roleTitle = "Super Administrator";
  if (roleName === "TEACHER") roleTitle = "Teacher / Faculty Staff";
  else if (roleName === "PARENT") roleTitle = "Parent / Guardian";
  else if (roleName === "STUDENT") roleTitle = "Student";
  else if (roleName === "BURSAR") roleTitle = "Bursar / Financial Officer";

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1040, margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--color-border, #E8ECE9)",
          paddingBottom: 20,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: "var(--color-brand-teal, #0E7D75)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              boxShadow: "0 4px 14px rgba(14, 125, 117, 0.25)",
            }}
          >
            {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-ink, #0D2B22)", margin: 0, letterSpacing: "-0.02em" }}>
              Account Settings
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary, #4A6B5D)" }}>
              Manage your personal credentials, contact details, and institutional security.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
              color: "var(--color-brand-teal, #0E7D75)",
              border: "1px solid var(--color-border, #E8ECE9)",
            }}
          >
            {roleTitle}
          </span>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Bright Future Academy · Kashere
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--color-border, #E8ECE9)",
          marginBottom: 24,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "profile" ? "var(--color-brand-teal, #0E7D75)" : "var(--color-text-secondary, #4A6B5D)",
            borderBottom: activeTab === "profile" ? "3px solid var(--color-brand-teal, #0E7D75)" : "3px solid transparent",
            transition: "all 0.15s",
          }}
        >
          Profile Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "security" ? "var(--color-brand-teal, #0E7D75)" : "var(--color-text-secondary, #4A6B5D)",
            borderBottom: activeTab === "security" ? "3px solid var(--color-brand-teal, #0E7D75)" : "3px solid transparent",
            transition: "all 0.15s",
          }}
        >
          Login & Password
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("session")}
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            color: activeTab === "session" ? "var(--color-brand-teal, #0E7D75)" : "var(--color-text-secondary, #4A6B5D)",
            borderBottom: activeTab === "session" ? "3px solid var(--color-brand-teal, #0E7D75)" : "3px solid transparent",
            transition: "all 0.15s",
          }}
        >
          Institutional Security & Info
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading account information...
        </div>
      ) : (
        <>
          {/* TAB 1: PROFILE DETAILS */}
          {activeTab === "profile" && (
            <div style={{ maxWidth: 640 }}>
              <div
                style={{
                  backgroundColor: "var(--color-surface, #FFFFFF)",
                  borderRadius: 16,
                  border: "1px solid var(--color-border, #E8ECE9)",
                  padding: 24,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--color-ink)" }}>
                  Personal Information
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
                  Update your contact email, phone number, and official name as recorded in the institutional database.
                </p>

                {profileSuccess && (
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "#EAF6F0",
                      color: "#1B6A45",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 16,
                      border: "1px solid #C4E5D4",
                    }}
                  >
                    {profileSuccess}
                  </div>
                )}

                {profileError && (
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "var(--color-danger-bg, #FAECE7)",
                      color: "var(--color-danger-text, #993C1D)",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 16,
                      border: "1px solid var(--color-danger-border, #F0C4B8)",
                    }}
                  >
                    {profileError}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--color-border, #E8ECE9)",
                          fontSize: 13,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--color-border, #E8ECE9)",
                          fontSize: 13,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>
                      Email Address (Login Identifier)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border, #E8ECE9)",
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      Used for logging in to your specific role portal and institutional communications.
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>
                      Phone Contact Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 08029839848"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border, #E8ECE9)",
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Read-only Institutional Identifiers */}
                  <div
                    style={{
                      padding: "14px 16px",
                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                      borderRadius: 10,
                      border: "1px solid var(--color-border, #E8ECE9)",
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 8 }}>
                      Institutional Record Identifiers
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                      <div>
                        <span style={{ color: "var(--color-text-secondary)" }}>Role Level: </span>
                        <strong style={{ color: "var(--color-ink)" }}>{roleTitle}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--color-text-secondary)" }}>School Code: </span>
                        <strong style={{ color: "var(--color-ink)" }}>{user?.school?.code || "BFA-KASHERE"}</strong>
                      </div>
                      {user?.student && (
                        <>
                          <div>
                            <span style={{ color: "var(--color-text-secondary)" }}>Admission No: </span>
                            <strong style={{ color: "var(--color-ink)" }}>{user.student.admissionNumber}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--color-text-secondary)" }}>Class: </span>
                            <strong style={{ color: "var(--color-ink)" }}>{user.student.currentClass?.name || "Enrolled"}</strong>
                          </div>
                        </>
                      )}
                      {user?.staff && (
                        <>
                          <div>
                            <span style={{ color: "var(--color-text-secondary)" }}>Staff ID: </span>
                            <strong style={{ color: "var(--color-ink)" }}>{user.staff.employeeNumber}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--color-text-secondary)" }}>Designation: </span>
                            <strong style={{ color: "var(--color-ink)" }}>{user.staff.designation || "Academic Faculty"}</strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 8,
                      backgroundColor: "var(--color-brand-teal, #0E7D75)",
                      color: "#FFFFFF",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: profileSaving ? "not-allowed" : "pointer",
                      opacity: profileSaving ? 0.7 : 1,
                    }}
                  >
                    {profileSaving ? "Saving Details..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: LOGIN & PASSWORD RESET */}
          {activeTab === "security" && (
            <div style={{ maxWidth: 640 }}>
              <div
                style={{
                  backgroundColor: "var(--color-surface, #FFFFFF)",
                  borderRadius: 16,
                  border: "1px solid var(--color-border, #E8ECE9)",
                  padding: 24,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--color-ink)" }}>
                  Change Account Password
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
                  Verify your current password to establish a new password for future access to your account.
                </p>

                {passwordSuccess && (
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "#EAF6F0",
                      color: "#1B6A45",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 16,
                      border: "1px solid #C4E5D4",
                    }}
                  >
                    {passwordSuccess}
                  </div>
                )}

                {passwordError && (
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "var(--color-danger-bg, #FAECE7)",
                      color: "var(--color-danger-text, #993C1D)",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 16,
                      border: "1px solid var(--color-danger-border, #F0C4B8)",
                    }}
                  >
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>
                      Current Password
                    </label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Enter your existing password"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border, #E8ECE9)",
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>
                      New Password
                    </label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="At least 6 characters"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border, #E8ECE9)",
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>
                      Confirm New Password
                    </label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-type your new password"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border, #E8ECE9)",
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      id="togglePass"
                      checked={showPasswords}
                      onChange={(e) => setShowPasswords(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label htmlFor="togglePass" style={{ fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                      Show password text
                    </label>
                  </div>

                  {/* Password Guidelines */}
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                      borderRadius: 10,
                      border: "1px solid var(--color-border, #E8ECE9)",
                      marginBottom: 20,
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>
                      Password Requirements:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                      <li style={{ color: newPassword.length >= 6 ? "#1B6A45" : "inherit" }}>
                        Minimum 6 characters in length
                      </li>
                      <li style={{ color: newPassword && newPassword === confirmPassword ? "#1B6A45" : "inherit" }}>
                        Confirmation must match exactly
                      </li>
                      <li>Use a combination of letters and numbers for high security</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 8,
                      backgroundColor: "var(--color-brand-teal, #0E7D75)",
                      color: "#FFFFFF",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: passwordSaving ? "not-allowed" : "pointer",
                      opacity: passwordSaving ? 0.7 : 1,
                    }}
                  >
                    {passwordSaving ? "Updating Password..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: INSTITUTIONAL SECURITY & SESSION */}
          {activeTab === "session" && (
            <div style={{ maxWidth: 640 }}>
              <div
                style={{
                  backgroundColor: "var(--color-surface, #FFFFFF)",
                  borderRadius: 16,
                  border: "1px solid var(--color-border, #E8ECE9)",
                  padding: 24,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--color-ink)" }}>
                  Institutional Security & Session Policy
                </h2>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
                  Bright Future Academy provides isolated authentication per user role to ensure student and school records remain confidential.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      border: "1px solid var(--color-border, #E8ECE9)",
                      backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>
                      Active Session Role
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-brand-teal, #0E7D75)", fontWeight: 700 }}>
                      {roleTitle} (Restricted Portal Access)
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      Your credentials are bound strictly to this role. Attempts to access other role consoles without authorized permissions will be blocked.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      border: "1px solid var(--color-border, #E8ECE9)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>
                          Multi-Factor Authentication (MFA / 2FA)
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                          Protect your account using TOTP authenticator app tokens.
                        </div>
                      </div>
                      <Link
                        href="/mfa"
                        style={{
                          padding: "8px 14px",
                          borderRadius: 8,
                          backgroundColor: "var(--color-surface-subtle, #F4F7F5)",
                          color: "var(--color-brand-teal, #0E7D75)",
                          border: "1px solid var(--color-border, #E8ECE9)",
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        Manage MFA
                      </Link>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      border: "1px solid var(--color-border, #E8ECE9)",
                      backgroundColor: "#FAFDFB",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>
                      Institutional Helpdesk & Support
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                      <strong>Institution:</strong> Bright Future Academy<br />
                      <strong>Address:</strong> Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State<br />
                      <strong>Email:</strong> brightfutureacademykashere@gmail.com<br />
                      <strong>Contact:</strong> 08029839848
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading account settings...
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
