# 🏫 Modern School Management System

A comprehensive, production-grade school management system built for a single Nigerian school — covering student/staff management, academics, fees, attendance, behavior tracking, messaging, AI-assisted insights, and government compliance reporting.

---

## 📋 Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1 — Core** | 🟡 In Progress | Authentication, Students/Staff, Attendance, Grading, Fees |
| **Phase 2 — Gated** | 🔴 Not Started | Facial recognition attendance, GPS staff enforcement *(gated — requires documented evidence + legal review)* |

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router) + TypeScript + Tailwind CSS |
| Backend | NestJS (Node.js + TypeScript) |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (access + refresh tokens), httpOnly cookies |
| Payments | Paystack (hosted checkout) |
| Mobile | Native Android — Kotlin + Jetpack Compose *(Phase 1 later)* |
| i18n | next-intl (English + Hausa) |

---

## 📁 Project Structure

```
school-management-system/
├── apps/
│   ├── web/          ← Next.js frontend
│   └── api/          ← NestJS backend
├── prisma/
│   └── schema.prisma ← Database schema
├── S.A.D folder/     ← System Analysis & Design documents
└── .env.example      ← Environment variable template
```

---

## 🚀 Phase 1 — Build Modules

| Module | Description | Status |
|--------|-------------|--------|
| 0 | Project Foundation (monorepo, DB, CI, security baseline) | ⬜ |
| 1 | Auth, Roles & School Setup | ⬜ |
| 2 | Student & Staff Management | ⬜ |
| 3 | Manual Attendance | ⬜ |
| 4 | Grading & Report Cards | ⬜ |
| 5 | Fees & Paystack Integration | ⬜ |

---

## 🔒 Security

- Role-based access control enforced at the API layer (not just the UI)
- JWT tokens in httpOnly cookies — never localStorage
- Helmet, rate limiting, and input validation applied globally from Module 0
- Audit log on all sensitive actions (grade edits, payment entries, attendance changes)
- Raw card data never touches this server — Paystack hosted checkout only
- Nigeria Data Protection Act 2023 (NDPA) compliant by design

---

## 📄 S.A.D Documentation

All system analysis and design documents are in the [`S.A.D folder/`](./S.A.D%20folder/):

- [`school-management-system-prd.md`](./S.A.D%20folder/school-management-system-prd%20(2).md) — Full Product Requirements Document
- [`school-system-build-spec.md`](./S.A.D%20folder/school-system-build-spec.md) — Module-by-module build specification
- [`school-system-design-spec.md`](./S.A.D%20folder/school-system-design-spec.md) — UI design tokens & component patterns
- [`school_prd_full_erd.html`](./S.A.D%20folder/school_prd_full_erd.html) — Full Entity Relationship Diagram
- [`school_prd_architecture.svg`](./S.A.D%20folder/school_prd_architecture.svg) — System architecture diagram

---

## ⚠️ Phase 2 Gate

Phase 2 (facial recognition + GPS enforcement) is **explicitly blocked** until:
1. A documented real incident exists justifying these features
2. Legal review of NDPA 2023 (DPIA + biometric consent for minors) is complete
3. Phase 1 manual attendance has run for at least one full term
4. A pilot-first rollout plan is agreed
5. Auto-suspend vs. flag-for-review policy is explicitly decided

---

*Built with ❤️ — August 2026*
