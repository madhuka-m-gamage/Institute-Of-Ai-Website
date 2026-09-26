# Recon — Admin Console

Audited ref: `origin/main` @ `9779fd9`. Read-only. Google Workspace calls (`services/workspace.ts`, `WorkspaceAdminPanel`, `BulkEmailModal`, `EnterpriseInquiryModal`) out of scope except where they touch admin data flow.

## Scope (files read)

- `src/pages/AdminPage.tsx` (1551 lines; auth gate, fetch, filters, tabs, dead CSV helper)
- `src/components/ApplicationDetailModal.tsx` (review save, decision-letter send, PDF attach)
- `src/components/BulkStatusModal.tsx`, `StatusBadge.tsx`, `AdminAuditTrailPanel.tsx`, `AdminNotificationBell.tsx`, `RecentActivityPanel.tsx`, `UserManagementPanel.tsx`, `CandidateExportModal.tsx`
- `src/services/csvExport.ts`, `src/services/pdfDocuments.ts`
- `src/lib/firebase.ts`, `src/types.ts`, `firestore.rules`, `firebase-blueprint.json` (grep), `src/App.tsx` (routing grep), `src/services/applicationWorkflow.ts` (grep)

## What it does (tabs, entry points, dependencies)

- Entry: `/admin` (or `#admin`, `?page=admin`), linked from `Footer.tsx:86`. `App.tsx:182` renders `<AdminPage>` unconditionally; no route guard.
- Auth: `initAuth` (onAuthStateChanged) → any non-null `User` renders the full console (`AdminPage.tsx:415`, `:560` comment "Authenticated & Authorized" — no authorization exists). Sign-in via email/password (`emailPasswordSignIn`) or Google popup with 15 Workspace scopes.
- Tabs (`AdminPage.tsx:70`): `admissions | activity | workspace | users | audit` — matches CLAUDE.md. Admissions has sub-tabs `applications | activity | enterprise | messages` (`:71`).
- Data load: `getDocs` of whole `applications`, `enterpriseInquiries`, `contactMessages` collections on login (`:265`, `:282`, `:291`); no pagination, no refresh-on-write.
- Live listeners: notification bell (3× `onSnapshot`, `limit(20)`), RecentActivityPanel (`adminAuditLogs` limit 100, `application_workflows` limit 40).
- Writes: application status/notes (single + batch), decision-letter flags, `adminAuditLogs` entries. No deletes anywhere (`deleteDoc`/`updateDoc` imported but unused in `AdminPage.tsx:3`).
- Exports: CSV (`csvExport.ts` via `CandidateExportModal`), PDFs via jsPDF (`pdfDocuments.ts`) downloaded or attached to Gmail.
- "Staff & Roles" tab (`UserManagementPanel`) is a hardcoded in-memory mock; no persistence.

## Admin operations vs rules

| Operation | Collection | file:line | Rules allow? | Notes |
|---|---|---|---|---|
| List all applications | applications | AdminPage.tsx:265 | Yes, any signed-in user (`rules:27`) | Full PII to any account |
| List enterprise inquiries | enterpriseInquiries | AdminPage.tsx:282, AdminNotificationBell.tsx:66 | Yes if `token.email != null` (`rules:34`) — true for every Google/email-password user | |
| List contact messages | contactMessages | AdminPage.tsx:291, AdminNotificationBell.tsx:92 | Yes, any signed-in (`rules:41`) | |
| Update status/notes | applications | ApplicationDetailModal.tsx:278 | Yes if `token.email != null` (`rules:29`) — any user | No field/value validation |
| Bulk status update | applications | BulkStatusModal.tsx:45-66 | Same as above | >500 docs fails whole batch |
| Mark decision letter sent | applications | ApplicationDetailModal.tsx:369 | Same | |
| Delete application | applications | (not in UI) | Yes for any user with email (`rules:29`) | Reachable from devtools/SDK |
| Write audit log | adminAuditLogs | ApplicationDetailModal.tsx:282,378; BulkStatusModal.tsx:70; CandidateExportModal.tsx:126 | **No** — no match block, default deny (`rules:6-8`) | Failure swallowed (`console.warn`) |
| Read audit log | adminAuditLogs | AdminAuditTrailPanel.tsx:30; RecentActivityPanel.tsx:84 | **No** — default deny | Trail panel shows hardcoded fake seed logs on error |
| Read workflow logs | application_workflows | RecentActivityPanel.tsx:109 | Yes signed-in; **create is public** (`rules:49`) | Anonymous users can inject feed entries |
| Grant/revoke staff role | (none; React state) | UserManagementPanel.tsx:84-119 | n/a | Pure UI mock |
| Create console account | Firebase Auth | firebase.ts:6 (imported, unused) | n/a — Auth signUp REST open if Email provider enabled | Self-signup yields full access |

## Docs vs code mismatches

- CLAUDE.md tab list is accurate. CLAUDE.md does not mention that there is **no admin authorization** at all; "Auth gating is done in-component" overstates it — the gate is authentication only.
- UI claims "Immutable Governance Stream" (`AdminAuditTrailPanel.tsx:114`), "Super Administrator Session" / "Verified Google Identity" shown to every user including email/password users (`UserManagementPanel.tsx:149,159`), "Granted ... privileges" toast (`:104`) — none backed by code.
- `firebase-blueprint.json` defines `users.role` but nothing reads/writes/enforces it; `adminAuditLogs` is absent from both blueprint and rules.
- Comment `AdminPage.tsx:124` "4 Primary Administrative Tabs" — there are 5.
- A later commit `19232dc "Add role-based access control for staff/admin users"` exists on another branch but is **not** in audited `origin/main`.

## Security findings (server enforcement vs client trust)

**ADM-1 — critical — firestore.rules:27,29,34,41; AdminPage.tsx:415**
Any authenticated Firebase user (any Google account; any self-registered email/password account) gets the entire console and, independently of the UI, can read all applications/inquiries/messages and update or delete any application directly via SDK. The rule `request.auth.token.email != null` is effectively `isSignedIn()`.
Remediation: define admins server-side (custom claim `admin: true` set via Admin SDK, or `admins/{uid}` doc writable only by Admin SDK); add `function isAdmin()` and require it for read/update/delete on applications, enterpriseInquiries, contactMessages, application_workflows reads; gate the UI on the same claim (`getIdTokenResult().claims.admin`) purely for UX. Disable Email/Password self-signup in Firebase console (or require `email_verified` + claim).

**ADM-2 — high — firestore.rules:28 (interaction with admin)**
`applications` `create: if true` with no schema validation: a public submitter can create a doc with `status:'accepted'`, `reviewedBy`, `decisionLetterSent:true`, forged `createdAt`, huge fields. Admin console trusts these values for filters, counts, CSV, and synthesized activity (`RecentActivityPanel.tsx:238-273` fabricates "decision letter dispatched" events from these fields).
Remediation: `request.resource.data.keys().hasOnly([...public fields])`, force `status == 'submitted'`, forbid review fields, size limits, `createdAt == request.time` (serverTimestamp). (Coordinate with admissions-form auditor.)

**ADM-3 — high — BulkStatusModal.tsx:70; ApplicationDetailModal.tsx:282,378; CandidateExportModal.tsx:126; AdminAuditTrailPanel.tsx:30-54**
Audit trail is non-functional and forgeable by design: `adminAuditLogs` has no rule → all writes denied and silently swallowed; reads fail and the panel renders fabricated seed entries. Even if a rule is added, entries are client-written, skippable, and `actorEmail` is a prop (`currentAdminEmail`, falls back to `'admin@instituteofai.com'`) not `request.auth`. Exports of full PII (CSV) are therefore unlogged.
Remediation: add rule `allow create: if isAdmin() && request.resource.data.actorUid == request.auth.uid && request.resource.data.actorEmail == request.auth.token.email && request.resource.data.timestamp == request.time; allow read: if isAdmin(); allow update, delete: if false;`. Better: write audit entries server-side (Cloud Function trigger on `applications` update, or Vercel API route with Admin SDK). Remove fake seed fallback; show an error instead.

**ADM-4 — high — UserManagementPanel.tsx:36-119**
"Staff & Roles" is a mock: hardcoded roster (including a real personal email at `:40`) in React state; grant/revoke does nothing server-side and resets on reload. Admins may believe they revoked someone's access when they did not. No escalation path exists only because no role store exists at all.
Remediation: either remove the tab until real RBAC lands, or back it with the ADM-1 role store (Admin-SDK-only writes via a privileged API route; client cannot write roles; `users/{uid}` rule `allow write: if isOwner` must NOT be where roles live, since owners can self-write — `rules:22`).

**ADM-5 — medium — firestore.rules:20-23 (latent)**
`users/{userId}` is readable by any signed-in user and self-writable by owner with no field restrictions. Blueprint defines `role` there. If RBAC is later implemented by reading `users/{uid}.role`, any user can set `role:'admin'` on themselves.
Remediation: never store authz in owner-writable docs; restrict with `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role'])` or use custom claims.

**ADM-6 — medium — firestore.rules:49; RecentActivityPanel.tsx:109-120,216-231**
`application_workflows` create is public; the admin activity feed renders these as "system@instituteofai.com (Automated Workflow)" events. Anyone can spam/forge feed entries (display is React text, so no XSS). Also `readinessScore || 95` fabricates a score when missing.
Remediation: validate schema on create (or write server-side), restrict reads to admins, don't label client-created docs as "system".

**ADM-7 — medium — csvExport.ts:15-21; AdminPage.tsx:379-391**
CSV/formula injection: applicant-controlled fields (name, phone, background, goals, notes-derived text) are quoted but not neutralized; cells beginning `= + - @ \t \r` execute as formulas in Excel/Sheets (e.g. `=HYPERLINK(...)` exfil, DDE). Public submitters control these values.
Remediation: in `escapeCsvCell`, prefix `'` when `/^[=+\-@\t\r]/.test(str)`, then quote/escape. Delete the dead duplicate `handleExportSelectedCsv` (`AdminPage.tsx:361-407`, unused; also leaves `a.id` unescaped).

**ADM-8 — medium — AdminPage.tsx:258-305; firebase.ts:55-73**
PII over-fetch: every login pulls entire applications/inquiries/messages collections with no `limit()`; cost and exposure scale with data; errors are swallowed per-collection (`console.warn`) so a permission failure shows as "Live sync complete" with empty lists (`:298`). Google sign-in requests broad Drive/Gmail/Contacts/Calendar scopes for every console login (Workspace auditor owns scope detail).
Remediation: paginate with `orderBy(createdAt) + limit`, surface fetch errors, request Workspace scopes incrementally only when Workspace features are used.

**ADM-9 — low — no XSS sinks found**
No `dangerouslySetInnerHTML`/`innerHTML` in module (grep across `src`). Applicant data rendered as React text. `mailto:` built with `encodeURIComponent` (`ApplicationDetailModal.tsx:415`). Gmail header injection via applicant `email` passed to `sendGmailMessage` (`:365`) — defer to Workspace auditor; recommend validating email on create (ADM-2).

## Bugs / data-integrity risks

**ADM-10 — medium — BulkStatusModal.tsx:49-66**
Single `writeBatch` for all selected; >500 selections throws and nothing is written (atomic, but unusable at scale). `notes` built from the client's stale copy of `app.notes` and always written (`: app.notes || ''`) → lost updates if another admin edited notes since page load. Same stale-overwrite in `ApplicationDetailModal.tsx:271-276` (notes/status last-writer-wins, no `reviewedAt` precondition).
Remediation: chunk into ≤500-op batches with per-chunk result reporting; only write `notes` when a batch note is supplied and use a transaction or `arrayUnion` for append-only notes; optionally compare `reviewedAt` in a transaction.

**ADM-11 — medium — ApplicationDetailModal.tsx:320-374**
Decision letter can be sent for an unsaved status (local `status` state differs from DB) and records `lastDecisionStatus` without persisting `status`. After sending, parent state isn't updated (`onStatusUpdated` not called) so list shows stale `decisionLetterSent`. If `updateDoc` fails after Gmail succeeds, error toast implies email failed though it was sent → duplicate sends.
Remediation: require save before send (or save status in same flow), call `onStatusUpdated` with new flags, separate error messages for send vs. record steps.

**ADM-12 — medium — pdfDocuments.ts:90-103,455-503**
Enterprise "Corporate AI Transformation Blueprint" (`enterprise-*` id, default-attached) has no generator branch; falls through to the Tuition Grant letter, stating "Institutional Co-Sponsorship Awarded" — enterprise applicants receive an unintended grant award letter, filename also differs from listed one. `isGrant = candidateStatus === 'grant'` (`:45`) is never true (not an `ApplicationStatus`).
Remediation: add a real enterprise branch or drop the entry; explicit `switch` on category with a throw on unknown; tie grant default to the template variant.

**ADM-13 — medium — pdfDocuments.ts:20-34**
`resolveProgramDetails` fuzzy match (substring both ways + `badge` substring) can pick the wrong course; unmatched → silently `COURSES[0]`. Wrong syllabus/tuition in "official" PDFs. Applications carry `courseId` but it isn't used.
Remediation: resolve by `application.courseId` exact match first; no silent default (warn/omit attachment).

**ADM-14 — low — pdfDocuments.ts:200-205,253,295,354**
Long names/emails not wrapped (`text` without `splitTextToSize`) overflow the box; hardcoded page counts (`drawFooter(1, 2)`) wrong; helvetica can't render Sinhala/Tamil/non-Latin names (garbled output). Remediation: wrap, compute total pages after render, embed a Unicode font if needed.

**ADM-15 — medium — AdminNotificationBell.tsx:38-122**
`limit(20)` with no `orderBy` returns an arbitrary (doc-ID-ordered) 20, not newest; every existing doc on mount emits an "unread" notification (no "since mount" filter), so the badge always shows up to 60 on load; `data.fullName` read directly (not `getCandidateName`); `notif.data` (raw, un-normalized) opens `ApplicationDetailModal` (`AdminPage.tsx:148`); `new Date(notif.timestamp)` renders "Invalid Date" for Firestore `Timestamp` values. Listeners are correctly unsubscribed (no leak). Unused imports `orderBy/doc/updateDoc/writeBatch`.
Remediation: `orderBy('createdAt','desc'), limit(20)`; skip initial snapshot for unread state; use `getCandidateName`/`getApplicationTimestamp`; look up the normalized app from `applications` by id.

**ADM-16 — low — status value drift: types.ts:76; AdminPage.tsx:825,924,997; StatusBadge.tsx:30**
`'pending'` is treated as a status in filters and badge but isn't in `ApplicationStatus`; bulk "Declined" label vs badge "REJECTED"; `entityType: 'report'` (`CandidateExportModal.tsx:130`) not in `AdminAuditLog` union. Rules don't constrain status values at all. Remediation: single status enum + rule `status in [...]`; migrate/normalize `pending`.

**ADM-17 — low — ad hoc date parsing**
`ApplicationDetailModal.tsx:490,540`, `AdminAuditTrailPanel.tsx:169`, `RecentActivityPanel.tsx:279,308,343`, `csvExport.ts:26-35` use `new Date(x)` directly; Firestore `Timestamp` → "Invalid Date" / `[object Object]` in CSV. Remediation: use `getApplicationTimestamp`/`formatApplicationDate` or a shared `toMillis` helper.

**ADM-18 — low — CandidateExportModal.tsx:44-48; BulkStatusModal.tsx:34-35**
Modals are always mounted, so `useState` initializers run once at page load: export scope never defaults to "selected"/"filtered"; bulk note/status persist between openings. Remediation: mount conditionally or reset state on `isOpen` change.

**ADM-19 — low — BulkStatusModal.tsx:75; ApplicationDetailModal.tsx:288; RecentActivityPanel.tsx:266**
Audit `details` embed candidate names/emails/internal notes as free text (PII duplicated into logs, hard to redact); bulk details reads `a.candidateName || a.fullName` directly. Remediation: store entity IDs + structured fields only.

## Candidate decisions (options + recommendation)

1. **How to define an admin** — (a) Firebase custom claims set via Admin SDK script/API route; (b) `admins/{uid}` doc writable only via Admin SDK, checked with `exists()` in rules; (c) hardcoded email allowlist in rules. **Recommend (a)** (cheap in rules, no extra reads); (c) acceptable as an immediate stopgap for a tiny team.
2. **Audit trail location** — (a) client writes constrained by rules; (b) server-side (Cloud Function trigger or Vercel API route with Admin SDK). **Recommend (b)** for status/export events; (a) as an interim fix since today nothing is recorded.
3. **Staff & Roles tab** — (a) remove/hide now; (b) implement real RBAC UI backed by decision 1. **Recommend (a) now, (b) later.**
4. **Email/password sign-in** — (a) keep, but disable self-signup and require claim; (b) Google-only with Workspace domain restriction (`hd`) + claim. **Recommend (b)** if all staff are on the institute domain.
5. **Public create validation for applications/workflows** — (a) rules schema validation; (b) move submissions behind a Vercel API route using Admin SDK + rate limiting. **Recommend (a) now**, (b) if spam appears.

## Open questions

- Are the deployed Firestore rules identical to `firestore.rules` in repo (esp. is there an `adminAuditLogs` rule in prod)? If not, ADM-3 details change.
- Is the Email/Password provider enabled in Firebase Auth, and is self-signup allowed? How were existing admin email/password accounts created?
- Who are the intended admins (count, domain)? Is a Google Workspace domain restriction viable?
- Should the RBAC work in commit `19232dc` (not on `origin/main`) be treated as the baseline for remediation?
- Is `madhukagamage6@gmail.com` hardcoded in `UserManagementPanel.tsx:40` intended to be public in the shipped bundle?
- Expected application volume (drives pagination and the 500-op batch limit priority)?
