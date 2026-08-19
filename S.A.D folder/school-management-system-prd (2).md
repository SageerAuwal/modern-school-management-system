# Product Requirements Document: School Management System

**Status:** Draft v5.0 — Paystack, Android-only, and partial government reporting spec confirmed
**Author:** [Your name]
**Last updated:** August 2026

---

## 1. Overview

### 1.1 Summary
A management system for a single school, built in two phases. **Phase 1** is the deployable core: student/staff management, manual attendance, academics (classes, grading, exams, timetabling), behavior tracking, fee billing with payment gateway integration, library/health/extracurricular/transport records, in-app messaging, AI-assisted insights, and government compliance reporting. **Phase 2** — facial recognition attendance and location-enforced staff accountability — is explicitly gated behind validation criteria (section 3, Phase 2 gate) and is not built as part of the initial rollout.

This split exists because Phase 2's two features carry a different risk category than everything else in this document: a bug in fee calculation is an error you fix; a false face-match or a wrongly-triggered staff suspension is a harm that already happened to a specific child or teacher by the time anyone notices. That asymmetry is why Phase 2 isn't just "later" in a build sequence — it's conditional on evidence and safeguards that don't yet exist.

### 1.2 Goals
- Replace manual/fragmented processes with one system of record for everything that touches a student's school life.
- Automate attendance and enforce staff accountability for it.
- Give parents and students complete self-service visibility.
- Use AI to surface problems (at-risk students) and reduce teacher admin burden (auto-drafted comments, natural-language reporting).
- Support the operational edges of running a school (library, health, transport, extracurriculars) without needing separate tools.

---

## 2. Users & personas

| Persona | Description | Key needs |
|---|---|---|
| School admin | Runs the school | Full oversight: students, staff, fees, compliance reports, violation review |
| Teacher | Teaches class sections | Attendance, grading, exams, behavior notes, messaging with parents |
| Nurse/health staff | Manages student health records | Log incidents, track medical conditions/allergies, restrict access appropriately |
| Librarian | Manages library | Track book inventory, loans, returns |
| Transport coordinator | Manages routes | Assign students to routes, track pickup/drop status |
| Parent/guardian | Has one or more children enrolled | Full visibility: academics, behavior, health alerts, fees, transport, messaging |
| Student | Enrolled learner | Self-service: grades, attendance, fees, library loans, timetable |

---

## 3. Scope: functional requirements

### PHASE 1 — Deployable v1 (build this now)

**3.1 Identity & access management**
- Single-school tenancy, role-based access control across all personas above.
- Parents linked to multiple children; invitation-based account creation.

**3.4 Student & staff management**
- Full profiles, enrollment/withdrawal, guardian relationships, staff-subject-section assignment.
- **Decided — staff account scope:** of the 500 reported staff, only roles that actually interact with the system get full accounts: teachers, admins, nurse/health staff, librarian, and transport coordinators (not individual drivers). Support/facility staff (security, cleaners, general non-teaching support) get a lightweight staff *record* (for the school's own reference — name, role, contact) without portal login. This meaningfully reduces the real account count below 500 and should be sized accurately once the school confirms its actual role breakdown — worth a direct headcount-by-role from the school rather than assuming, since it affects both the performance targets in section 4.2 and any future licensing/seat-based costs.

**3.5 Academics — classes & grading**
- Class sections, terms, weighted grade calculation, report card generation.
- **Attendance in Phase 1 is manual/teacher-marked**, not the facial-recognition capture described in Phase 2 below. This is a real, complete, deployable feature on its own — schools ran on manual attendance for decades — and it also functions as the permanent fallback if Phase 2 is never built or later disabled.

**3.6 Fees & billing**
- Fee structure configuration, invoicing, payment recording, balance tracking.

---

### PHASE 2 — Gated, and currently NOT cleared to build (status confirmed August 2026)

**Confirmed status:** you asked the school directly and the answer is that Phase 2 was requested without a documented incident behind it — "they just wanted it," not "this happened and we need to prevent it." That means **gate criterion 1 is not met**, as of now. Under this document's own rule, that's not a soft flag — Phase 2 stays out of active scope indefinitely, not just "later in the roadmap." If a real incident occurs in the future and the school wants to revisit this, criterion 1 can be re-evaluated then, with actual evidence in hand. Until that happens, sections 3.2 and 3.3 below describe a feature that is documented but not scheduled.

**Phase 2 gate — must be satisfied before any Phase 2 work begins:**
1. **Evidence, not assumption — NOT CURRENTLY MET.** The school has documented a real, specific problem — e.g. confirmed instances of attendance being marked fraudulently, or staff being paid/credited for hours not worked off-campus — not a general desire for "more accountability." Confirmed as of this revision: no such evidence exists. Phase 2 is out of scope until this changes.
2. **Legal review completed** against Nigeria's Data Protection Act 2023 — specifically a Data Protection Impact Assessment (DPIA) and a documented child-consent process for biometric enrollment (see section 4, Compliance) — and, separately, a check on Nigerian employment law regarding staff location monitoring (geofencing). Both signed off before any code is written, not during.
3. **Phase 1's manual attendance has been running successfully** for at least one full term, so there's a proven fallback in place before adding a system that can fail in a way manual attendance can't.
4. **Pilot-first rollout plan agreed**, not school-wide launch on day one — one classroom, one grade, or one small group of staff, with a defined review point before expanding.
5. **A specific, agreed answer on the auto-suspension question**: given the staff-trust and possible employment-law exposure of automatically locking a teacher out of their role based on a spoofable signal, the school should explicitly decide (not default into) whether violations trigger auto-suspension or instead route to admin review before any access is restricted. Flag-for-review is the lower-risk starting point; auto-suspension should require a deliberate, documented reason to choose it over that default.

If and when that gate is satisfied, the following two features move into active development:

**3.2 Attendance — facial recognition** *(Phase 2, gated — not currently scheduled, see status above)*
- Face recognition matches enrolled student photos to mark attendance; manual override always available.
- Consent-based enrollment (see section 4 — biometric data handling).
- **Roster-scoped capture:** a teacher can only trigger face-recognition attendance for a class section they are actually scheduled to teach, at that scheduled time, per the timetable (3.7) — not for any section, at any time, at will. The system checks the teacher's current roster/timetable slot before allowing an attendance capture session to start.
- If a teacher attempts to start attendance capture outside their scheduled slot (wrong section, wrong period, no class currently assigned), the action is blocked and logged — this uses the same violation-logging mechanism as staff location enforcement (3.3), since it's the same category of concern: attendance actions performed outside their legitimate context.
- **Substitute teachers (decided):** handled via temporary roster reassignment, not a separate one-off exception path. When a sub is scheduled to cover a class, an admin assigns them to that section for the relevant period(s) in the timetable/roster (3.7) before the class starts. The sub then passes the same roster check as any regularly assigned teacher — there's one consistent authorization rule in the system, not two parallel paths to maintain and audit separately. This does mean substitute assignments need to be entered promptly by admin staff; a sub who isn't yet in the roster when their class starts will be blocked the same as anyone without a scheduled slot, so this workflow needs to be part of the standard substitute-coverage process, not an afterthought.

**3.3 Staff location enforcement** *(Phase 2, gated — not currently scheduled, see status above)*
- GPS (primary) + IP address (secondary, corroborating) signal check before attendance-related actions.
- Disagreement between signals flagged as higher-suspicion violation, not treated as auto-fail.
- Low-confidence flag (not hard block) when GPS is unavailable and only IP is present; repeated low-confidence events escalate to admin review.
- Suspension of restricted functions on detected off-campus use follows whichever policy the school explicitly chose under gate criterion 5 above (auto-suspend vs. flag-for-admin-review); manual admin reinstatement either way; full violation history on staff profile.

---

### Everything else — Phase 1 (build this now)

**3.7 Timetable auto-generation**
- Constraint-solver generates class schedules from teacher availability, room capacity, subject-hour requirements, and section sizes.
- Admin can manually override any generated slot; solver re-validates on manual edit to flag new conflicts.
- **Decided:** hard constraints (must never be violated) are teacher double-booking, room double-booking, and subject-hour requirements per curriculum. Soft constraints (solver optimizes for, admin can accept a suboptimal result to satisfy) are teacher time-of-day preference, keeping a teacher's classes contiguous where possible, and grouping electives. Modeled as two separate constraint lists in the solver input — hard constraints are non-negotiable filters, soft constraints are weighted scoring the solver tries to maximize. This is a standard pattern for constraint-solver libraries (e.g. OR-Tools' `AddHardConstraint` vs. objective weighting), not a custom design.

**3.8 Exam/assessment management**
- Question banks tagged by subject/topic/difficulty.
- Auto-graded question types (multiple choice, true/false, short numeric answer); manual grading queue for open-ended answers.
- Exam scheduling tied into the timetable module (3.7) to avoid double-booking rooms/periods.

**3.9 Behavior/discipline tracking**
- Incident logging (type, severity, description, staff reporter), merit/demerit points, intervention notes.
- Visible to parents in the same portal as grades — same transparency principle as academics.
- **Decided:** conduct-level incidents only — things with a real behavioral/disciplinary dimension (fighting, bullying, repeated disruption, property damage, dress-code/rule violations serious enough to warrant a formal note). Academic shortcomings like late or missing homework stay in the gradebook (3.5), not this feed. Reasoning: mixing "forgot homework" with "was in a fight" in one feed either desensitizes parents to real incidents through noise, or makes minor academic slips feel like disciplinary strikes — neither is the right read for either category of information. A merit/demerit point system can still reward small positive behaviors without needing every minor negative one logged as an "incident."

**3.10 In-app messaging**
- Direct teacher-parent messaging thread per student, scoped so a teacher only messages parents of their own students.
- Message history retained as part of the student's record (useful for disputes, continuity across school years).
- **Decided:** admins can access threads, but every access is logged (who viewed which thread, when) and visible in the audit log alongside other sensitive-access events (section 4.1). Reasoning: fully private threads remove a real safeguarding backstop — schools have a duty of care, and an admin needing to review a thread after a complaint or concern is a legitimate, sometimes urgent need. Fully open, unaudited admin access, on the other hand, undermines the trust that makes teachers and parents willing to communicate candidly. Logged access is the middle path: the admin capability exists for when it's genuinely needed, but it isn't invisible or unaccountable — a teacher or parent could, in principle, ask whether their thread was accessed and why. This is a real school policy decision though, not just a technical default — worth confirming the school agrees with this framing rather than assuming it.

**3.11 AI-assisted insights**
- **At-risk early warning:** flags students showing combined attendance decline + grade decline patterns. **Decided: visible to the student's teacher(s) and school admin simultaneously**, not teacher-first-then-escalate. Reasoning: gating admin visibility behind a teacher's manual escalation adds a delay and a dependency on one person remembering to act, for information the school has a real interest in seeing promptly — early intervention (counseling, parent meetings) is often an admin-coordinated response, not something a single teacher arranges alone. The safeguard against this feeling like surveillance-by-committee is the explainability requirement below: nobody sees a bare score, everyone sees the actual signals, so the flag reads as "here's what's observably changed," not "the algorithm is watching this kid."
- **Auto-drafted report card comments:** generated from grade/attendance/behavior data, always shown as an editable draft — never sent without teacher review and edit.
- **Natural-language admin queries:** e.g. "students with 3+ unexcused absences this month," translated to structured queries over the existing data model — this is a UI convenience layer over real queries, not a black-box answer generator.
- **Non-functional requirement:** any AI-flagged risk assessment must show *why* it flagged a student (which signals triggered it) — no opaque scores. Misclassifying a student as "at risk" without visible reasoning erodes trust fast and can also mislabel a student inaccurately in ways that follow them.

### Tier 3 — Operational modules (Phase 1, trimmed scope)

**3.12 Library management**
- Book inventory, loan/return tracking, overdue notifications to students/parents.

**3.13 Health/nurse records**
- Medical conditions, allergies, medication needs, incident logging (injuries, illness visits).
- Access restricted to nurse/health staff and admin by default — this is more sensitive than academic data and should not be visible to all teachers by default.
- **Decided — consent workflow:** captured once during enrollment (3.4), as part of the guardian's initial account setup, as an explicit opt-in checkbox with plain-language explanation of what's collected and who can see it — not bundled silently into a general "terms of service" acceptance. Retention: health records are retained for the duration of enrollment plus a defined post-withdrawal period (recommend confirming a specific number with the school — many jurisdictions expect some retention for liability/continuity reasons, so "delete immediately on withdrawal" likely isn't right either). This is separate from Phase 2's biometric consent (which needs a DPIA per NDPA, section 4) — health data consent is a lighter-weight, standard process that doesn't carry the same legal machinery, but it's still real consent, not assumed.

**3.14 Extracurricular activity tracking**
- Clubs/sports rosters, attendance/participation tracking, visible in the student's overall profile.

**3.15 Transport tracking**
- Route assignment, pickup/drop-off status per student, parent notification on pickup/drop confirmation.

### Tier 4 — Integrations (Phase 1, narrowed scope — see note below on unresolved justification)

**3.16 Payment gateway integration (confirmed: Paystack)**
- Paystack integration layered onto the existing fee/invoicing module (3.6), so parents can pay directly rather than only recording manual payments.
- Paystack handles card tokenization and PCI-DSS scope on its side — your system stores only a Paystack transaction/reference ID, never raw card data.
- Supports the payment methods Paystack offers in Nigeria (card, bank transfer, USSD) — worth confirming with parents which methods they'll actually use, since USSD/bank transfer may matter more than card for some families.

**3.17 Government reporting (confirmed: full category list)**
- **Category 1 — institutional identifiers & school profile:**
  - **Official registration codes:** Ministry School Code / EMIS ID, examination center numbers (WAEC/NECO/Cambridge/state board IDs as applicable), tax/business registration number.
  - **Geospatial & administrative data:** GPS coordinates (latitude/longitude), LGA (Local Government Area), district, state/province, ward, urban/rural designation.
  - **School profile:** ownership classification (private/public/mission), operating status, levels offered (Early Years, Primary, JSS, SSS).
- **Category 2 — student enrollment data:** counts and records by grade level, gender, and likely age band — sourced from the student management module (3.4).
- **Category 3 — attendance rates:** aggregated from the attendance module (manual in Phase 1, per 3.5) — likely needs school-wide and per-grade rate calculations, not just raw daily records.
- **Category 4 — exam results:** sourced from the academics/exam management module (3.8) — likely needs results broken out by the recognized exam bodies referenced in category 1 (WAEC/NECO/state board), not just internal assessment scores.
- **Category 5 — staff data:** qualifications and staff-student ratios — sourced from staff management (3.4), meaning staff profiles need a qualifications field, which isn't currently modeled and should be added.
- **Design implication:** category 1 is static/one-time setup data (belongs in a School Profile entity, captured once at setup, not regenerated per report). Categories 2-5 are dynamic and need to be computed/aggregated at export time from the relevant modules — this means the government-report export feature has a real dependency on 3.4, 3.5, and 3.8 all being built and populated with real data first, so it can't be built as an early, isolated module (this affects sequencing — see section 6).
- **Confirmed — file format and frequency:** exports in both CSV and PDF (CSV likely for portal upload/data submission, PDF likely for a human-readable/printable/signable copy — worth confirming that split is actually right, since it's a reasonable assumption rather than something you stated explicitly). Submitted termly and annually — meaning the export logic needs to support both a per-term aggregation (attendance rates, exam results for that term) and a full-year rollup, not just one or the other.
- **Still genuinely open:** whether there's a specific CSV column structure/order the receiving ministry portal expects (most government upload portals reject files that don't match an exact expected schema, even if the data itself is correct), and whether the PDF needs a specific letterheaded/signed format rather than a generic report layout. These are the kind of details that are easy to overlook until an actual submission gets rejected — worth getting the ministry's actual template or a sample of a previously-accepted submission before building the export, if one exists.

**3.18 Native mobile app (confirmed: Android only)**
- **Decided:** Android only for v1 — no iOS app. This simplifies 3.18 considerably: one platform to build, test, and maintain, no dual App Store/Play Store review process, no cross-platform framework overhead if you build natively for Android (Kotlin) rather than React Native for a single target.
- Feature parity with the web portal for each role, prioritizing the highest-frequency actions per persona (parents: attendance/grades/messaging/fees; teachers: attendance/grading/messaging; students: grades/timetable/library).
- Push notifications (Firebase Cloud Messaging) as the primary channel for real-time alerts (absence, new grade, message received, payment due).
- **Still worth confirming, now that scope is narrower:** is Android-only because most parents/staff use Android devices (common and reasonable in this market), or is there an iOS-owning portion of your parent base who'd be left without a native option (falls back to the responsive web app, which still works for them — just not a native experience)?

**3.19 Local draft caching (revised scope — simpler than full offline-first)**
- **Decided:** not full offline-first support with server sync and conflict resolution. Instead: unsaved input (e.g., gradebook entries mid-edit) is cached in local session storage on the device as the user types, so a dropped connection doesn't lose what they were entering. Once connectivity returns, the cached draft is submitted through the normal save flow — no background sync engine, no conflict-resolution logic, no offline queue of actions taken while disconnected.
- This is a meaningfully smaller feature than the original ask, and I'd rate it well: it solves the actual painful moment (losing 20 minutes of grade entry because WiFi blipped) without the complexity and failure modes of true offline-first (silent conflicting edits, stale-session handling, sync engine bugs). Good scope-down.
- **What this does NOT cover:** taking attendance, entering grades, or any other action while genuinely offline for an extended period — those still require connectivity. If sustained offline usage (not just brief drops) turns out to be a real problem at this school, that's a different, larger feature to scope separately later, not something this covers.

**3.20 Multi-language UI (confirmed)**
- Two languages: English and Hausa.
- No right-to-left layout needed — Hausa is written in Latin script in this context (Boko), which simplifies the UI framework requirement considerably compared to a right-to-left language.

> **Open API — cut from Phase 1 scope entirely, per your decision.** No integration surface will be built for now. If a real need for third-party integration comes up later (a specific external system the school needs to connect to), it can be scoped as its own feature at that point.

> **Native apps (3.18) — narrowed to Android-only, one open sub-question remains** (whether any parents are iOS-only and would be left with web-only access) — see 3.18 above. This is a much smaller, better-justified decision than the original "full native apps, both platforms" scope.

---

## 4. Non-functional requirements

### 4.1 Security

**Authentication & access control**
- Multi-factor authentication (MFA) required for all admin and staff accounts; strongly recommended (not just optional) for parent accounts given the sensitivity of student data.
- Role-based access control enforced at the API/database query layer, not just hidden in the UI — a request for data outside a role's scope must be rejected server-side even if someone bypasses the UI entirely.
- Session management: short-lived access tokens with refresh tokens, automatic session expiry after inactivity, forced re-authentication for sensitive actions (viewing health records, processing payments, reinstating a suspended staff member).
- Password policy: minimum complexity, breach-list checking (reject passwords found in known breach databases), rate-limited login attempts with lockout/backoff on repeated failures.

**Data protection**
- Encryption at rest for the full database, with separate, more restrictive encryption keys for the most sensitive tables (biometric templates, health records, payment references).
- Encryption in transit (TLS 1.2+) for every connection — web, mobile apps, API, and any admin/ops access.
- Field-level encryption (beyond whole-database encryption) specifically for biometric templates and health records, so a database-level breach doesn't expose them in plaintext even if disk encryption is somehow defeated.
- No sensitive data (passwords, biometric templates, full payment details) ever appears in logs, error messages, or analytics events.

**Application security**
- Follow OWASP Top 10 mitigations as a baseline: input validation/sanitization on every endpoint, parameterized queries only (no raw SQL string interpolation), CSRF protection, secure headers (CSP, HSTS, X-Frame-Options), output encoding to prevent XSS.
- Dependency scanning in CI/CD to catch known-vulnerable third-party libraries before deployment, not after.
- Rate limiting and abuse detection on all public-facing endpoints, especially auth and payment endpoints.
- Secrets (API keys, database credentials, encryption keys) stored in a dedicated secrets manager, never in source code or config files committed to version control.

**Infrastructure security**
- Network segmentation: database not directly reachable from the public internet, only via the application layer.
- Principle of least privilege for every service account and integration — the payment gateway integration, for example, should only be able to touch fee/invoice data, nothing else.
- Regular automated vulnerability scanning of infrastructure and dependencies.
- Web application firewall (WAF) in front of public-facing endpoints.

**Third-party integration security (payment gateways & government reporting)**
- **Payment gateways:** raw card data should never touch your own servers — use the gateway's tokenization/hosted-fields approach so your system only ever handles a token, not card numbers. This also keeps you out of most of PCI-DSS scope rather than needing to become PCI-compliant yourselves.
- **Government reporting exports:** since these leave your system as files/API payloads to an external authority, they need their own access control (who's allowed to generate/export them) and an audit trail of every export (who, when, what data left the system) — an export is a data-exfiltration point even when it's the legitimate, intended kind.
- Any external integration should authenticate with its own scoped credentials, not a shared admin credential, so a compromised integration doesn't grant broader system access.

**Monitoring, logging & incident response**
- Centralized audit logging for all sensitive actions (already listed in the requirements below), retained long enough to support an investigation, with logs themselves protected from tampering (append-only or write-once storage).
- Real-time alerting on suspicious patterns: repeated failed logins, unusual data export volume, access to health/biometric records outside normal patterns.
- A documented incident response plan: who is notified, what gets locked down first, and what the disclosure obligations are if student data is actually breached (this varies by jurisdiction and is a legal question, not just a technical one).

**Backup & disaster recovery**
- Regular encrypted backups, tested restore procedures (a backup that's never been restored isn't a verified backup), and a defined recovery time objective (RTO) / recovery point objective (RPO) for how much downtime and data loss is acceptable in a worst case.

### 4.2 Performance & scalability

- **Concurrent users:** sized for the confirmed school size — 2,000 students, 500 staff (some portion of that 500 may be non-teaching staff without portal accounts; see open question 11). Two distinct peak scenarios to design and test for:
  - **Morning attendance window:** all teaching staff marking attendance within the same 15-20 minutes — target sustaining roughly 60-100 concurrent authenticated sessions performing frequent, small write operations (attendance records), not just page loads. (Sized down from an earlier placeholder estimate now that the real staff count is known.)
  - **Parent/student portal peak:** evening grade-checking or a fee-due/exam-result day can spike a meaningful fraction of the parent base logging in around the same time — target sustaining 400-600 concurrent sessions doing mostly reads (viewing grades, attendance, balances), with the system tested up to roughly 1,000 concurrent as a safety margin above expected peak.
  - These are starting design targets based on the confirmed numbers, not guarantees — revisit if actual enrollment grows.
- **Response time targets:** common actions (loading a class roster, marking attendance, viewing a grade) should complete in under 1-2 seconds under normal load; facial recognition matching should return a result within a few seconds to keep classroom attendance-taking practical. At this scale, also set a target for report-generation actions (report cards, government exports) — these touch far more rows than a single lookup and should be allowed a longer but still bounded time (e.g. under 30 seconds, or moved to an async/background job with a notification when ready if it runs longer).
- **Database performance:** indexed queries for all common lookups (student by ID, attendance by date/section, grades by student); query performance should be tested against realistic data volumes for a 2,000-student school (multiple years of attendance/grade history, not just current-term data), not just a near-empty development database.
- **Scalability approach:** horizontally scalable application tier (stateless API servers behind a load balancer) so capacity can grow if the school's usage grows, without needing an architecture rewrite. At this student count, also plan for read replicas on the database from the start, since reporting/dashboard queries at this scale can otherwise compete with and slow down transactional attendance/grading traffic.

### 4.3 Other non-functional requirements

- **Biometric data (face recognition):** parental consent required before enrollment; non-biometric fallback always available; encrypted storage separate from general records; defined retention/deletion policy.
- **Health data:** treat as more sensitive than academic data — restricted access by role, not just by school membership; audit log on every access, not just every edit.
- **Location data (geofencing):** retained only as long as needed for violation logging, not continuously tracked.
- **AI transparency:** at-risk flags and auto-drafted content must be explainable and always human-reviewed before acting on them or sending them to parents.
- **Compliance:** governed by Nigeria's Data Protection Act 2023 (NDPA), enforced by the Nigeria Data Protection Commission (NDPC). Specifically relevant: biometric and health data are classified as sensitive personal data requiring stricter processing measures; anyone under 18 is legally a "child," so every student in this system falls under the Act's child-consent provisions; a Data Protection Impact Assessment (DPIA) is required before processing that's likely to significantly affect data subjects' rights — biometric processing of minors should be assumed to meet that bar. **Practical implication: a DPIA and documented consent process aren't optional paperwork here, they're a specific legal prerequisite before any facial recognition enrollment (Phase 2) begins**, and this should be done with a Nigerian data-protection lawyer or consultant familiar with NDPA compliance, not assumed from this document.
- **Availability:** attendance-critical paths must degrade gracefully (manual override if recognition service is down).
- **Accuracy tolerance:** facial recognition false-reject/accept rates tested against real lighting/camera conditions before rollout.

---

## 5. Technology stack

Each layer below is chosen with security as a first-class criterion, not an afterthought bolted onto a stack picked for other reasons.

### 5.1 Frontend
- **Next.js 14+ (App Router) + TypeScript** for the web portals. Server components keep sensitive logic and data-fetching off the client, reducing what an attacker can inspect or tamper with in the browser; TypeScript's strict typing catches a category of bugs (wrong data shape, unchecked null) that otherwise become runtime vulnerabilities.
- **Tailwind CSS** for styling — no functional security implication, but keeps the UI layer simple and auditable.
- **Native Android (Kotlin + Jetpack Compose)** for the parent/teacher/student Android app and the staff GPS companion app (3.3, if/when Phase 2 is ever cleared) — since it's a single target platform (Android-only, confirmed in 3.18), building natively avoids the overhead React Native adds for cross-platform support you don't need. If Phase 2 stays ungated indefinitely, the companion app requirement in this line doesn't apply either, since it only exists to support Phase 2's geofencing.
- **Auth tokens stored in httpOnly, secure, SameSite cookies — never localStorage or sessionStorage.** This is a specific, deliberate choice: tokens in localStorage are readable by any JavaScript on the page, so a single XSS bug anywhere in the app becomes full account takeover. httpOnly cookies aren't readable by JavaScript at all, which removes that entire attack path.
- **Content Security Policy (CSP)** enforced at the framework level to restrict what scripts/resources can execute, as a second layer of defense against XSS even if a vulnerability slips through.

### 5.2 Backend
- **Node.js + NestJS (TypeScript)**, modular by domain (academics, fees, health, library, transport, messaging). NestJS's built-in guards/interceptors make role-based access control a structural part of every request rather than a checklist item developers might forget on a new endpoint.
- **class-validator / Zod schema validation** on every incoming request — reject malformed or unexpected input before it reaches business logic, not after.
- **Helmet + rate-limiting middleware (NestJS Throttler or equivalent)** applied globally, not just on auth endpoints.
- **Static analysis (e.g., Semgrep) and dependency scanning (e.g., Snyk/Dependabot) as CI/CD gates** — a pull request with a known-vulnerable dependency or a flagged unsafe pattern shouldn't be mergeable, not just flagged after the fact.

### 5.3 Database
- **PostgreSQL**, with **Row-Level Security (RLS)** enabled on tenant-scoped tables. This is the strongest available guarantee against data leakage between roles: even if an application-layer bug incorrectly builds a query, the database itself refuses to return rows outside what that role/session is permitted to see. This is a meaningfully stronger posture than relying on application code alone to enforce scoping everywhere, every time.
- **Encryption at rest** (provider-managed, e.g., AWS RDS/GCP Cloud SQL encryption) for the whole database, plus **column-level encryption (pgcrypto or application-layer encryption)** for the most sensitive individual fields — health record details, biometric template references — so a database-level breach doesn't expose those fields even if the broader database is compromised.
- **Biometric templates stored in a separate, more restricted data store** from the main relational database entirely (not just a separate table) — this limits blast radius if the primary application database is ever compromised.
- **Automated encrypted backups with tested restore procedures** and point-in-time recovery.

### 5.4 API layer
- **Internal API only** (no external/third-party integration surface — cut from scope, see section 3). A documented, versioned REST API still exists as the interface between the frontend clients and backend, but there's no need for the additional OpenAPI-spec public documentation, external-consumer rate limiting tiers, or interoperability-standard alignment that a third-party-facing API would require. This meaningfully simplifies section 5.4 compared to the earlier draft.
- **OAuth2/JWT with short-lived access tokens and rotating refresh tokens** — a stolen access token expires quickly; refresh token rotation detects and invalidates a token if it's used twice (a signal of theft).
- **Rate limiting and auth enforcement** still apply to this internal API — "internal" doesn't mean "less secured," since it's still reachable by the mobile apps and any device outside your physical network.

### 5.5 Machine learning / AI
- **At-risk student flagging: rules-based/deterministic logic, not a black-box model**, specifically because it must be explainable (section 4.3) — a transparent scoring rule ("3+ unexcused absences AND a 15%+ grade drop over the term") can be audited and justified in a way a trained classifier's internal weights cannot.
- **Report-card comment drafting and natural-language admin queries: a hosted LLM API used under a data processing agreement that guarantees your students' data is not used for model training** and is deleted/not retained beyond the request — this needs to be a specific, checked contractual term with whichever provider you use, not an assumption.
- **Facial recognition: self-hosted/on-premises face-embedding model (confirmed decision)**, not a third-party cloud API. Children's biometric data never leaves your infrastructure — no vendor to trust, no external breach surface, no separate data-handling contract to police. This does mean your team owns the model hosting, matching accuracy tuning, and hardware (GPU inference capacity for real-time matching at scale) rather than offloading that to a vendor's SLA — worth budgeting the extra engineering/ops effort accordingly (e.g., an open-source face-embedding model such as ArcFace/InsightFace deployed on your own infrastructure, with inference served via a dedicated internal service the attendance module calls — never a public-facing endpoint).

**GPU capacity sizing (starting estimate, to be validated by load testing before launch)**
- Sized against the morning attendance-rush target from section 4.2: roughly 60-100 concurrent sessions within a 15-20 minute window, each triggering one or more face-match inferences — this is a lighter load than earlier placeholder estimates assumed, which likely reduces required GPU capacity accordingly (still to be confirmed by real load testing before finalizing hardware budget).
- A single modern GPU (e.g., an NVIDIA T4/L4-class instance) typically handles a face-embedding comparison in well under 200ms once the model is loaded and warmed, and can serve multiple requests concurrently via batching rather than one-at-a-time. As a starting point before real benchmarking: **2-4 GPU instances behind a load balancer**, with requests queued and distributed across them, should comfortably absorb the attendance-rush peak with headroom — but this is an estimate to validate, not a final spec.
- **Autoscaling matters more than a fixed number here:** provision the baseline (e.g., 1-2 GPUs) for normal/off-peak use, and autoscale up during the known attendance-rush window rather than running peak capacity 24/7 — this is a meaningful cost lever, since GPU capacity is one of the more expensive infrastructure line items in this system.
- **This estimate must be confirmed with real load testing (section 9.3)** against your actual model choice, image resolution, and camera setup before finalizing hardware/cloud budget — face-matching latency varies enough by model and image quality that a paper estimate shouldn't be the final word.

### 5.6 Cross-cutting security infrastructure
- **Secrets management:** HashiCorp Vault or a cloud-native equivalent (AWS/GCP Secrets Manager) — no credential ever lives in source code or a config file.
- **Network:** database not directly internet-reachable; WAF (Cloudflare or cloud-provider WAF) in front of all public endpoints.
- **Container/deployment security:** minimal base images, containers run as non-root, images scanned before deployment.
- **Centralized, tamper-resistant logging** feeding real-time alerting on suspicious patterns (repeated failed logins, abnormal export volume, off-hours access to health/biometric records).

### 5.7 Supporting choices
- **Local draft caching:** browser session storage on web, Android's local storage (DataStore/SharedPreferences) on the native app — holding in-progress form input only, not a sync engine, not an offline action queue (see 3.19 for the simplified scope).
- **Localization:** i18n framework (e.g., next-intl / react-i18next) applied from the start rather than retrofitted.
- **Geofencing:** GPS (primary) + IP corroboration (secondary).
- **Timetable solver:** constraint-satisfaction library (e.g., OR-Tools) rather than a hand-rolled scheduler.
- **Messaging:** WebSocket-based real-time layer, or polling if real-time isn't essential for v1.
- **Payments:** Paystack (confirmed), integrated via their hosted checkout/tokenization flow so raw card data never touches your servers.

---

## 6. Build sequence

### Phase 1 — the deployable core (build now, no gate)

| Step | Scope | Why this order |
|---|---|---|
| 1 | Auth, roles, student/staff/class setup, manual attendance | Working system on day one, no dependency on hardware/AI/consent workflows |
| 2 | Grading, fees (manual recording), parent/student portals | Core value delivered before adding complexity |
| 3 | Timetable auto-generation | Needed as a foundation for exam scheduling (step 4) and, later, for Phase 2's roster-scoped attendance check — building it early avoids rework |
| 4 | Exam management | Builds on the timetable from step 3 |
| 5 | Behavior tracking, in-app messaging | Adds transparency features once trust in core data is established |
| 6 | AI insights (at-risk flagging, auto-comments, NL queries) | Needs a real data history to be useful — flagging "at risk" from day-one-empty data isn't meaningful |
| 7 | Library, health records, extracurriculars, transport | Operationally important but independent of the academic core — parallelizable with steps 3-6 if you have separate engineering capacity |
| 8 | Payment gateway (Paystack, confirmed); government reporting (categories, format, and frequency all confirmed — see 3.17) | Payment integration can start now. Government reporting export logic depends on 3.4, 3.5, and 3.8 being built and populated first (see 3.17) — so this isn't just "step 8," it's genuinely blocked until those modules have real data, though the remaining unknown is now just the ministry's exact CSV schema/PDF template, not the overall spec |
| 9 | Native Android app | Confirmed in scope (Android-only) — best built once the web platform and data model are stable |

**Phase 1 is a complete, deployable product on its own.** A school running steps 1-8 has a real, working system of record — this isn't a stripped-down placeholder waiting for Phase 2, it's the actual product.

### → PHASE 2 GATE — CURRENTLY NOT PASSED ←
As of this revision, criterion 1 (documented evidence of a real problem) is confirmed unmet — the school requested these features without a specific incident behind them. Phase 2's steps below are not scheduled and shouldn't appear on an active roadmap or timeline until that changes. This section is kept in the document as a reference for what would happen if the gate is later passed, not as a plan currently in motion.

### Phase 2 — gated, not currently scheduled

| Step | Scope | Why this order |
|---|---|---|
| 10 | Legal review, consent workflow design, pilot plan | Must exist before any Phase 2 code is written |
| 11 | Facial recognition attendance — pilot classroom/grade only | Small blast radius while accuracy and workflow are proven |
| 12 | Staff location enforcement — pilot group only | Same principle; roll out to the same small group as step 11 before expanding |
| 13 | School-wide rollout of both, only after a defined pilot review point | Expansion is a deliberate decision after real data from steps 11-12, not an automatic next step |

---

## 7. Open questions — final status

Most of what was open is now decided. What's left is genuinely a short list, and I've marked which items are decisions you can revisit versus facts I can't invent.

**Still genuinely unresolved (needs a real external source, not judgment):**
1. **Ministry's exact CSV column schema and PDF template (3.17).** This is the one item I won't fabricate a specific answer for — it needs to come from the actual ministry portal documentation or a previously-accepted submission sample. Guessing a schema and building against it risks a real rejected submission later.

**Decided in this revision (my best judgment — flagged clearly so you can override any of them):**
2. Timetable hard vs. soft constraints — modeled as two separate constraint categories (3.7).
3. Behavior tracking scope — conduct-level incidents only, not minor academic slips (3.9).
4. Messaging privacy — admins can access threads, but every access is logged (3.10).
5. AI at-risk flag visibility — teacher and admin see it simultaneously, always with visible reasoning (3.11).
6. Health data consent — captured at enrollment as an explicit opt-in, separate from Phase 2's biometric consent process (3.13).
7. Staff account scope — only system-interacting roles get full accounts; other staff get a record without login (3.4).
8. GPS-unavailable fallback — allow with a low-confidence flag rather than a hard block (3.3, still Phase 2/gated but documented).
9. Substitute teachers — handled via temporary roster reassignment, one consistent authorization rule (3.2, Phase 2/gated).

**Confirmed by you directly, not a judgment call:**
10. Payment gateway — Paystack.
11. Native app — Android only. One residual note: if any real portion of the parent base is iOS-only, they fall back to the responsive web app — worth a quick gut-check with the school that this is acceptable, since I can't verify it from here.
12. Phase 2 — confirmed not cleared to build (no documented evidence behind the request).

**Legal, not engineering — needs a Nigerian data-protection professional, not this document:**
13. Exact biometric retention period and DPIA specifics for Phase 2, if and when the gate is ever passed.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Phase 2 gets built before its gate criteria are actually met | Treat section 3's Phase 2 gate as a hard stop, not a suggestion — the whole point of the phase split is that this category of feature fails differently (harm-on-failure, not bug-on-failure) than everything else in this document |
| Scope is large enough that "build everything" delays any usable release | Phase 1 (section 6) is deliberately a complete, shippable product on its own |
| Biometric + health data combined in one system raises compliance stakes | Legal review before storing either; strict role-based access; separate encrypted storage for biometric templates |
| GPS/IP signals individually spoofable | Cross-check both; treat disagreement as suspicious rather than trusting either alone |
| AI at-risk flagging could mislabel students without visible reasoning | Require explainable flags (show triggering signals); human review before any action |
| Auto-drafted comments sent without review | Always require teacher edit/approval before comments reach parents |
| Timetable solver underestimated as "just scheduling logic" | Use an established constraint-solver library rather than building from scratch |
| Government reporting export gets built against an assumed CSV column order or PDF layout that the ministry portal actually rejects | Categories, file types (CSV+PDF), and frequency (termly+annual) are confirmed — but get the ministry's actual template or a previously-accepted submission sample before writing export logic, rather than guessing the exact schema |
| Behavior tracking becomes noisy if minor and major incidents are mixed | Decide severity scope explicitly (open question 3) before building the feed |
| Localization retrofitted late becomes far more expensive | Build the i18n framework in from phase 1 of native app work, not after |
| Local draft cache silently lost (browser storage cleared, different device used) | Set expectations clearly in the UI that this is a short-term save aid, not durable storage — encourage normal save/submit as soon as connectivity returns rather than relying on the cache for long |
| Phase 2 features (face recognition, geofencing) get built anyway despite the gate not being passed, due to schedule pressure or the school pushing | Treat the confirmed "criterion 1 not met" status (section 3) as a hard stop in project planning, not a footnote — this is the single most important guardrail in this document |

---

## 9. Testing & validation — how you'd confirm it actually works and holds up

A feature "working" and a feature being "secure" and "fast enough" are three separate things to verify — each needs its own kind of testing, done before launch and repeated on a schedule after.

### 9.1 Functional testing
- Automated test suite (unit + integration tests) covering each module in section 3, run on every code change before merge.
- End-to-end tests for critical user flows: taking attendance, entering grades, processing a payment, generating a government report.
- User acceptance testing (UAT) with real school staff before each phase goes live — actual teachers taking real attendance in a pilot classroom catches problems automated tests won't.

### 9.2 Security testing
- **Penetration testing:** an independent third party attempts to break in — at minimum before initial launch, then annually and after any major architecture change. This is the direct answer to "is it secure after test": a pen test report is the closest thing to a real answer, since no team can fully assess its own blind spots.
- **Vulnerability scanning:** automated scans of infrastructure and dependencies, run continuously (not just once), since new vulnerabilities in third-party libraries are discovered on an ongoing basis.
- **Authentication/authorization testing:** explicit test cases that try to access another school role's data, another student's records, or an admin action from a non-admin account — confirming role boundaries are enforced server-side, not just hidden in the UI.
- **Payment flow testing:** confirm no raw card data ever reaches your own logs/database, and that the tokenization flow with the payment gateway behaves correctly on both success and failure paths.
- **Biometric-specific testing:** confirm the non-biometric fallback works reliably, and that a student's face data is actually deleted (not just hidden) when consent is withdrawn or a student leaves the school.

### 9.3 Performance & load testing
- **Load testing:** simulate realistic peak concurrency (e.g., all teachers marking attendance in the same 15-minute morning window) against a staging environment before launch, to confirm the system holds up under real conditions rather than just in isolated manual testing.
- **Stress testing:** push beyond expected peak load to find the actual breaking point and confirm the system fails gracefully (clear error, no data corruption) rather than silently.
- **Response-time monitoring in production:** ongoing tracking of real response times against the targets in section 4.2, with alerting if performance degrades below target — this tells you not just "did it pass a test once" but "is it still fast for real users right now."

### 9.4 How many users it can handle & how fast it is — making this concrete
With the school confirmed at 2,000 students and 500 staff, section 4.2 now sets actual acceptance targets: roughly 60-100 concurrent sessions during the morning attendance window, and 400-600 concurrent sessions (tested up to ~1,000) during parent/student portal peaks, with 1-2 second response times for common actions. Load testing in 9.3 is what proves whether the built system actually meets these targets — not an assumption, a measured result. If actual enrollment changes materially, revisit these numbers before final load testing rather than testing against a stale assumption.

---
