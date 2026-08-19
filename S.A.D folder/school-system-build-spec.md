# Build Spec: School Management System (Core Scope)

**Purpose of this document:** a module-by-module breakdown of the PRD, formatted so each module can be handed to Claude Code as its own focused session. Work through modules in order — each one lists what it depends on, so don't start a module before its dependencies are built and reviewed.

**Scope note:** this covers the trimmed core scope sized for a solo, 2-month, AI-assisted build: authentication, student/staff management, manual attendance, grading, and fees with Paystack — web only. The full PRD's other modules (timetable, exams, behavior tracking, messaging, AI insights, library/health/transport, government reporting, native app) follow the same template below and can be added as separate modules once the core is live and tested — they are intentionally not included here so the core stays achievable in the timeframe.

**How to use this with Claude Code:** open one module at a time. Paste that module's section into your prompt, working in your actual project directory so Claude Code can read/write real files. Review every file it produces before moving to the next module — don't queue up multiple modules in one session.

---

## Module 0 — Project foundation (do this first, once)

**Goal:** repo structure, database connection, environment config — the scaffolding everything else sits on.

**Build:**
- Next.js project (TypeScript), NestJS backend project, PostgreSQL connection via Prisma.
- Environment variables for secrets (DB credentials, JWT secret, Paystack keys) — never hardcoded, loaded from `.env` (not committed).
- Basic project structure: `/apps/web`, `/apps/api`, `/prisma/schema.prisma`.
- CI check (even a minimal one): lint + type-check on every commit, so broken code doesn't silently accumulate.

**Review before moving on:** confirm no secrets are committed to git, confirm the database connects, confirm both apps run locally.

---

## Security baseline — apply starting in Module 0, not bolted on at the end

This is cross-cutting, not its own module you build once and move past. Each item below should be true from the first module onward, not retrofitted after Module 5. Mapped from PRD section 4.1 so nothing gets lost in translation to code.

**Set up in Module 0 (infrastructure-level, do this before writing feature code):**
- **TLS everywhere.** HTTPS only, no plain HTTP endpoint, for both the web app and the API — most hosting platforms (Vercel, Railway, Render) handle this automatically, but confirm it's actually enforced, not just available.
- **Database encryption at rest.** Most managed Postgres hosts (Supabase, Neon, RDS) enable this by default — confirm it's on rather than assuming.
- **Secrets in environment variables only**, loaded from your hosting platform's secret manager (not committed `.env` files) once you deploy — local `.env` for dev is fine, but production secrets should live in your host's secrets configuration, not in a file that could end up in git by accident.
- **Security headers** on every response: Content-Security-Policy, X-Frame-Options, HSTS. NestJS's `helmet` middleware does most of this in a few lines — ask Claude Code to add it in Module 0, not later.

**Apply in every module, every endpoint, from Module 1 onward:**
- **Input validation on every endpoint** — use NestJS's built-in validation pipes (class-validator/DTOs) so malformed or malicious input is rejected before it reaches your database logic, not just on the happy path.
- **Parameterized queries only.** Prisma does this by default as long as you use its query builder rather than raw SQL strings — flag any place Claude Code writes raw SQL and ask why, since that's the most common place SQL injection sneaks in.
- **Rate limiting on every public endpoint**, not just login — NestJS's `@nestjs/throttler` package covers this in a few lines; apply it globally, not per-endpoint-by-hand, so nothing gets missed.
- **No sensitive data in logs** — passwords, tokens, and (per Module 5) anything payment-related should never appear in console output or error logs. Worth explicitly telling Claude Code this constraint when generating logging code, since default error logging often dumps the full request body.

**Ongoing, not a one-time task:**
- **Dependency scanning** — `npm audit` (or GitHub's free Dependabot alerts once you push to GitHub) run periodically, not just once at the start.
- **Backup strategy** — most managed Postgres hosts offer automated daily backups; confirm it's enabled and, at least once, actually practice restoring from one — an unverified backup is not a real backup.
- **Basic monitoring** — even a free-tier error tracker (e.g., Sentry) catches production errors you'd otherwise only hear about from an angry parent or teacher.

**Database & data security specifically — this deserves its own attention, not just "encryption at rest":**

- **Least-privilege database credentials.** Your app should connect to Postgres with a role that can only read/write the tables it needs — not the database superuser/admin account. Most managed hosts create an admin credential by default; create a separate, scoped app-user role and use that in your connection string instead. This limits the blast radius if your app credentials ever leak.
- **Never expose the database directly to the internet.** It should only be reachable from your application server, not from your own laptop over the public internet or from anywhere else — most managed Postgres hosts support this via IP allowlisting or private networking; confirm yours is configured this way, not left open by default.
- **Encrypted connection string (TLS to the database itself)**, not just TLS on your web traffic — check your Postgres host's connection string includes `sslmode=require` or equivalent; this is easy to silently skip when copy-pasting a local dev connection string into production.
- **Audit logging at the data layer, not just "the feature exists."** PRD section 4.1 requires an audit trail for grade changes, fee adjustments, and role changes — concretely, this means a dedicated `AUDIT_LOG` table (actor, action, target record, timestamp, before/after values where relevant) written to whenever those actions happen, not just trusting that "someone would notice" if a record changed. Ask Claude Code to build this as its own small piece in Module 1, then have every later module write to it for its own sensitive actions, rather than each module inventing its own ad hoc logging.
- **Data minimization and retention.** Under Nigeria's NDPA, data shouldn't be kept indefinitely "just in case" — decide (even informally, in writing, for now) how long you'll retain a withdrawn student's records and a former staff member's data, and build a simple mechanism to actually purge or anonymize records past that point, rather than assuming "we'll deal with it later." Right now Module 2 keeps withdrawn students' records indefinitely for history — that's fine as a default, but it should be a deliberate retention policy decision, not an accidental one.
- **A concrete plan for data subject deletion requests.** NDPA gives people rights over their own data, including a parent asking for their child's data to be deleted. You don't need a full self-service deletion flow for v1, but you should know, concretely, how an admin would actually delete a specific student's full record on request (across `STUDENT`, `ATTENDANCE`, `GRADE`, `INVOICE`/`PAYMENT`) rather than discovering there's no clean way to do it when someone actually asks.
- **Backup retention and access.** Beyond "backups exist" — confirm how long backups are retained, and that backup access itself is restricted (a backup file with full student/payment data sitting somewhere with loose access is its own leak vector, not just the live database).

**What's deliberately not in this list:** a web application firewall (WAF), full incident response plan, and formal third-party penetration testing from PRD section 4.1/9.2. Those are real requirements for a mature production system, but they're not a solo-developer-in-two-months task — they're the kind of thing to revisit once the school is live and you have budget or time for a proper security review, not something to try to fit into the initial build. Flagging that gap honestly now so it isn't forgotten later.

---

## Module 1 — Auth, roles, school setup

**Depends on:** Module 0.

**Data model (from ERD):** `SCHOOL`, `USER` (with `role` field: admin, teacher, parent, student).

**Build:**
- School profile setup (one-time): name, EMIS ID, address, GPS, LGA, state, ownership type (fields from PRD section 3.17 — capture now even though reporting export comes later, so it's not re-collected).
- User registration via admin invitation only (no public sign-up) — admin creates a user record with a role, an invite email/link is sent, user sets their own password.
- Login (email + password), JWT access token + refresh token, role embedded in the token.
- **Password policy:** minimum complexity, rate-limited login attempts.
- **Role-based access control enforced at the API layer** — every endpoint checks the caller's role server-side, not just hidden in the UI. This is the most important thing to review in this module: try logging in as a teacher and calling an admin-only endpoint directly (not through the UI) to confirm it's rejected.

**UI screens:** login page, admin "invite user" form, first-login password-set flow.

**Explicit review checklist before moving to Module 2:**
- [ ] A non-admin role cannot access admin-only API endpoints, even by calling them directly.
- [ ] Passwords are hashed (bcrypt/argon2), never stored plaintext.
- [ ] JWT secret is in environment config, not in code.

---

## Module 2 — Student & staff management

**Depends on:** Module 1 (roles must exist to assign "who can edit what").

**Data model:** `STUDENT`, and staff records on `USER` (role = teacher/admin, plus profile fields: subjects, contact info).

**Build:**
- Student CRUD: name, DOB, contact info, guardian relationship (a student can have multiple guardians; a guardian/parent `USER` can be linked to multiple students).
- Staff CRUD: name, role, subjects, contact info.
- Enrollment/withdrawal status on students (active, withdrawn, graduated).
- Bulk CSV import for initial student data migration — validate rows and report errors clearly rather than failing silently on bad data.

**UI screens:** admin student list + add/edit form, admin staff list + add/edit form, CSV import screen with validation feedback.

**Explicit review checklist:**
- [ ] A parent account only sees their own linked children's data — try a direct API call for another student's ID while logged in as a parent and confirm it's rejected.
- [ ] Withdrawn students are excluded from active rosters but not deleted (history should be retained).

---

## Module 3 — Manual attendance

**Depends on:** Module 2 (needs students and class assignment).

**Data model:** `CLASS_SECTION`, `ENROLLMENT`, `ATTENDANCE` (with a `source` field — set to `"manual"` for now, so the schema doesn't need to change later if any automated attendance capture is added).

**Build:**
- Class section creation (subject, term — kept simple for now, no full timetable solver yet).
- Enroll students into sections.
- Teacher marks attendance per section per day: present/absent/late/excused.
- Attendance history view per student.

**UI screens:** admin "create class section" + "enroll students," teacher "mark attendance" (roster for their section, one tap per student), student/parent "view attendance history."

**Explicit review checklist:**
- [ ] A teacher can only mark attendance for sections they're actually assigned to teach — confirm via direct API call, not just UI.
- [ ] Attendance records can't be edited after the fact without an audit trail (who changed it, when).

---

## Module 4 — Grading & report cards

**Depends on:** Module 3 (uses the same class sections).

**Data model:** `GRADE`.

**Build:**
- Assessment entry per student per section (assignment/quiz/exam types, weighted toward a term grade).
- Report card generation (PDF export) per student per term.

**UI screens:** teacher gradebook (enter scores per section), parent/student "view grades" and "view report card," admin report-card generation/download.

**Explicit review checklist:**
- [ ] A student/parent can only view their own grades — same direct-API-call test as attendance.
- [ ] Grade edits are logged (audit trail) — this is explicitly required in PRD section 4.1.

---

## Module 5 — Fees & Paystack integration

**Depends on:** Module 2 (needs students to bill).

**Data model:** `INVOICE`, `PAYMENT` (with `paystack_ref` field).

**Build:**
- Fee structure setup (admin defines fee items and amounts per term/grade).
- Invoice generation per student.
- **Paystack integration: use their hosted checkout / tokenized payment flow — raw card details must never reach your own backend or logs.** This is the single most important thing to get right in this module.
- Payment status tracking (paid/outstanding/overdue) visible to parents.
- Manual payment recording option (for cash/bank transfer payments made outside Paystack).

**UI screens:** admin fee structure setup, admin invoice generation, parent "pay now" (redirects to Paystack) + payment history, admin manual payment entry.

**Explicit review checklist:**
- [ ] Search your own database and logs for anything resembling a card number — there should be none, ever.
- [ ] Payment webhook from Paystack is verified (signature check) before trusting it, not just accepted blindly — this prevents someone faking a "payment successful" callback.
- [ ] A parent can only pay/view invoices for their own linked children.

---

## After Module 5: what "done" looks like

At this point you have a real, working system: a school can log in, manage students and staff, take attendance, enter grades, generate report cards, and collect fees online. This is legitimately deployable — not a stripped-down demo.

**Before calling it launched:**
- Run through the security review checklist in PRD section 9.2 (auth boundary testing, payment flow testing) — at minimum, manually attempt the "wrong role, wrong student" tests listed above one more time across the whole system, not just per-module.
- Basic load test: have several people (or a script) hit the system simultaneously to catch anything that breaks under concurrent use, even informally, before real users do it for you on day one.

**Next modules, same template, once core is stable and live:** timetable, exams, behavior tracking, messaging, library/health/transport, government reporting export, AI insights — in that rough order per the PRD's build sequence (section 6). Phase 2 (facial recognition, geofencing) stays out of scope entirely per the PRD's gate status, unless the school later provides real evidence of the problem it's meant to solve.
