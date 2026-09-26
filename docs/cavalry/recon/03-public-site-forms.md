# Recon — Public Site, Routing & Submission Flows

Baseline: `origin/main` @ 9779fd9. Read-only audit. Line numbers are against that commit.

## Scope (files read)

- `src/App.tsx`, `src/main.tsx`
- `src/pages/ContactPage.tsx` (fully); `HomePage`, `AboutPage`, `ProgramsPage`, `ResearchPage` (grepped for sinks, claims, admin exposure)
- `src/components/ApplyModal.tsx`, `EnterpriseContactModal.tsx`, `AIAssistantModal.tsx` (fully); `EnterpriseInquiryModal.tsx` (first 130 lines + sinks); `ContactFAQ.tsx`, `Navbar.tsx`, `Footer.tsx`, `SearchModal.tsx`, `ThreeBackground.tsx` (grepped)
- `src/services/applicationWorkflow.ts` (fully), `src/data/mockData.ts` (grepped)
- Cross-checked: `firestore.rules`, `firebase-blueprint.json` (collection keys), `api/ai/counselor.ts`, `api/_lib/aiHandlers.ts` (grepped), `src/services/workspace.ts#sendGmailMessage`, `src/components/RecentActivityPanel.tsx` (workflow consumer), `vercel.json`
- Not read in detail: `ScrollReveal`, `Toast`, `ProgressBar`, `BackToTop`, `AnimatedSuccessCheckmark`, `Skeleton`, `index.css` (presentational; no sinks found by grep)

## What it does (entry points, dependencies, dependents)

- **Entry:** `main.tsx` → `App.tsx`. Vercel rewrites every non-`/api/` path to `index.html` (`vercel.json`).
- **Routing:** `getInitialPage()` (App.tsx:20-44) resolves pathname → hash → `?page=` → `home`. `popstate` handler (App.tsx:56-70) only reads pathname. A `currentPage` effect (App.tsx:73-88) sets `document.title` and `pushState`s `/${page}`. `AdminPage` is statically imported (App.tsx:18) and rendered when `currentPage==='admin'` (App.tsx:182); no route guard — gating is inside AdminPage. Footer has a public "Admin Console" link (Footer.tsx:86-90).
- **Public writes (unauthenticated Firestore SDK `addDoc`):** `applications`, `application_workflows`, `enterpriseInquiries`, `contactMessages`.
- **Public API call:** `AIAssistantModal` → `POST /api/ai/counselor`.
- **Dependents:** Admin console reads all four collections (`AdminPage.tsx:282,291`, `AdminNotificationBell.tsx:66,92`, `RecentActivityPanel.tsx:108`); `EnterpriseInquiryModal` (admin) sends Gmail to the publicly submitted `workEmail`.
- **ThreeBackground** is hand-rolled raw WebGL (no `three` dependency); cleans up rAF + listener. Not a bundle concern.

## Public write paths

| Form | Collection | Fields written | file:line | Rules allow? | Issues |
|---|---|---|---|---|---|
| Apply modal | `applications` | fullName, applicantName, name, candidateName, email, phone, courseId, courseTitle, background, experienceLevel, pythonProficiency, **status:'submitted'**, notes (phone dup), userId (`uid` or `'guest_applicant'`), **createdAt (client ISO)** | ApplyModal.tsx:161-177 | Yes — `create: if true`, no schema/field validation (firestore.rules:28) | Error swallowed (178-180); success forced in `finally` (205-208); client sets status/createdAt/userId; no dedupe/rate limit (PUB-1,2,3,5,6) |
| Apply modal (2nd write) | `application_workflows` | applicantName, fullName, email, courseId, courseTitle, experience, generatedEmailSubject/Body, analysis{readinessScore,…}, triggeredByUserId, sentAt, **status:'DISPATCHED'** | applicationWorkflow.ts:155-168 | Yes — `create: if true` (rules:49) | Forgeable admin activity log; claims email dispatched but nothing is sent; not atomic with first write (PUB-4,7,8) |
| Enterprise contact modal | `enterpriseInquiries` | companyName, contactName, workEmail, phone, jobTitle, teamSize, primaryFocus, deliveryFormat, timeline, customRequirements, userId (`uid` or `'guest_enterprise'`), createdAt (client ISO) | EnterpriseContactModal.tsx:125-146 | Yes — `create: if true` (rules:35) | Both catch paths show success + toast (142-145, 168-188); PII `console.info` on failure (144); no length cap on `customRequirements` (PUB-1,3,11) |
| Contact page | `contactMessages` | name, email, inquiryType, message, userId (`uid` or `'guest_contact'`), createdAt (client ISO) | ContactPage.tsx:94-101 | Yes — `create: if true` (rules:42) | Error swallowed (102-104), success after 600ms regardless (106-122); fake "UPLINK_STATUS 200_OK / AES-256-GCM" (194-196) (PUB-1,3,13) |

## Docs vs code mismatches

- **D-1** CLAUDE.md: Gemini routes are "used elsewhere in the UI (e.g. the AI counselor modal)". Only `/api/ai/counselor` has a client caller; `/api/ai/evaluate-application` has **no caller in `src/`**.
- **D-2** ApplyModal.tsx:182 comment and UI copy ("Submit & Run AI Workflow", "AI Workflow Executed", "ADMISSIONS CANDIDATE ANALYSIS", AIAssistant header "Powered by Gemini 3.7") present deterministic client-side rules as AI. `applicationWorkflow.ts` calls no model. The counselor fallback (AIAssistantModal.tsx:54-65) silently shows canned advice under the same "Gemini" banner.
- **D-3** CLAUDE.md says to keep `firebase-blueprint.json` in sync; blueprint has no entries for `contactMessages` or `application_workflows` (only users, applications, enterpriseInquiries, researchNotes, workspaceLogs).
- **D-4** CLAUDE.md describes `server.ts` as the prod server; on this baseline prod is Vercel static + `api/*` serverless functions (`vercel.json`, `api/ai/*.ts`). The two paths share `api/_lib/aiHandlers.ts`.
- **D-5** Toast "Confirmation sent to {email}" (App.tsx:120), badge "DISPATCH QUEUED" (ApplyModal.tsx:261), and workflow `status:'DISPATCHED'` — no email is sent anywhere on the public path.
- **D-6** The RBAC commit (19232dc "Add role-based access control…") is on the current branch, not on `origin/main` 9779fd9 audited here; rules at this baseline have no role concept.

## Security findings

**PUB-1 — high — firestore.rules:28,35,42,49; all four forms**
Problem: Unauthenticated `create: if true` on four collections with zero field/type/size validation. Any client can bypass UI validation via the Firebase SDK/REST: arbitrary fields, `status:'accepted'`, `userId` spoofed to any uid, arbitrary `createdAt`, ~1 MiB docs, unlimited volume (spam, storage/read cost, admin notification flood via `AdminNotificationBell`). No CAPTCHA/App Check/rate limit.
Remediation: In rules, `request.resource.data.keys().hasOnly([...])`, type + `size()` bounds per field, `status == 'submitted'` (or forbid), `createdAt == request.time`, `userId == (request.auth == null ? 'guest' : request.auth.uid)`. Enable Firebase App Check (reCAPTCHA Enterprise/v3) and enforce for Firestore. Longer term: route public submissions through a rate-limited `/api/submit/*` function using Admin SDK and close client create.

**PUB-2 — high (cross-ref rules module) — firestore.rules:27,29,34,41,48**
Problem: Data submitted through these public forms is readable by *any* signed-in user (`applications`, `contactMessages`, `application_workflows`: `isSignedIn()`; `enterpriseInquiries`: any user with an email claim). `applications` update/delete allowed for any signed-in user with an email. If Firebase Auth allows open Google sign-in / email sign-up (it does via `googleSignIn`/`emailPasswordSignIn` helpers), anyone can read/modify/delete all applicant PII (name, email, phone).
Remediation: Restrict reads/updates to staff via custom claims or an `admins/{uid}` allow-list doc; applicants read only `resource.data.userId == request.auth.uid`. Owned by rules-module recon; listed here because it is the exposure surface of every public form.

**PUB-3 — medium — ApplyModal.tsx:173-176; EnterpriseContactModal.tsx:131-132; ContactPage.tsx:99-100; applicationWorkflow.ts:165-167**
Problem: Server-controlled fields set by client: `status`, `createdAt` (client clock ISO string, not `serverTimestamp()`), `userId` sentinel strings, `triggeredByUserId`. Admin sorting/aging and status are attacker-controllable and clock-skewed.
Remediation: Use `serverTimestamp()` and enforce `== request.time` in rules; enforce initial `status` in rules; drop `userId` for guests or enforce it in rules.

**PUB-4 — medium — applicationWorkflow.ts:155-168; RecentActivityPanel.tsx:107-113**
Problem: `application_workflows` is publicly creatable and rendered in the admin activity feed as "automated candidate welcome emails". Anyone can forge activity entries (arbitrary names, emails, `status:'DISPATCHED'`, `readinessScore`, 40-entry feed can be flooded to hide real events).
Remediation: Stop writing this from the client (it only duplicates `applications` data + a canned email). Either delete the collection write or move it server-side; set rules `create: if false` (or staff-only).

**PUB-5 — medium — workspace.ts:226/240 (sink) fed by EnterpriseInquiryModal.tsx:67 and applicant `email` fields**
Problem: `sendGmailMessage` interpolates `to` raw into the `To:` header. `workEmail`/`email` come from public, unvalidated Firestore docs (UI regex is client-only). A value like `x@y.z\r\nBcc: victims@…` injects headers when an admin clicks send → admin's Gmail used to send to attacker-chosen recipients. (Subject is base64-encoded, so it is safe.)
Remediation: In `sendGmailMessage`, reject `to` containing `\r`/`\n`/`,`/`;` and validate against a strict email regex; also enforce email shape in rules (`matches()`).

**PUB-6 — low — AIAssistantModal.tsx:34-42,155-158; api/_lib/aiHandlers.ts:18,44**
Problem: Unauthenticated Gemini proxy with no input length cap (client or server) and no rate limit; Enter key calls `handleAskCounselor()` even while `isLoading` (button `disabled` doesn't guard the key path), enabling parallel requests. Cost/abuse vector when `GEMINI_API_KEY` is set. User prompt concatenated into model prompt (prompt injection → off-brand advice), but output is rendered as React text — **no XSS**.
Remediation: Guard `if (isLoading) return;`; `maxLength` on input; server-side truncate (e.g. 1,000 chars), per-IP rate limit (Vercel Firewall rule or KV counter), validate `currentExperience/targetGoals` against allowed values.

**PUB-7 — info — admin exposure (App.tsx:18,182; Footer.tsx:86-90)**
`/admin`, `#admin`, `?page=admin` all reach AdminPage; gating is in-component only, and full admin code ships to every visitor (no `React.lazy`). Not a vuln by itself — enforcement must be rules (see PUB-2). Consider lazy-loading AdminPage and removing the public footer link.

No `dangerouslySetInnerHTML`, `innerHTML`, `localStorage`/`sessionStorage`, open redirects, or user-controlled `href`s found in this module. PII is not placed in URLs. The admin `mailto:` link (EnterpriseInquiryModal.tsx:97) is properly `encodeURIComponent`-ed.

## Bugs / data-integrity risks

**PUB-8 — high — ApplyModal.tsx:161-208**
UI always shows success: the `applications` write error is swallowed (178-180), the outer `catch` only logs, and `finally` unconditionally sets `status='success'` + confetti. If both writes fail (rules, offline, App Check later) the applicant sees "Application Submitted", a readiness score, and a "confirmation" — but no record exists. If only the first write fails, admins see a workflow log with no application (the two writes are not atomic).
Remediation: Await the `applications` write and show an error state on failure; move success to the `try` path only; make the workflow write best-effort *after* a successful application write (or remove it, see PUB-4).

**PUB-9 — medium — EnterpriseContactModal.tsx:139-146,168-188; ContactPage.tsx:102-122**
Same pattern: failures are reported as success (explicit comment "Still show success to provide seamless user experience"), with a "<24 hour response" promise. Lost leads are invisible to both sides; enterprise path also `console.info`s the full PII payload.
Remediation: Show an error with a fallback (mailto/phone); remove PII console logging.

**PUB-10 — medium — ApplyModal.tsx:24 + App.tsx:113-114,229-234**
`courseId` is `useState(selectedCourseId || COURSES[0].id)`, but ApplyModal is mounted once at App start (with `selectedCourseId` undefined) and only returns `null` when closed, so the initializer never re-runs. "Apply" from a specific course on ProgramsPage and "Enroll In Track" from the AI counselor always preselect `COURSES[0]`; applicants may submit for the wrong program.
Remediation: `useEffect(() => { if (isOpen) setCourseId(selectedCourseId ?? COURSES[0].id) }, [isOpen, selectedCourseId])`, or render `{isApplyOpen && <ApplyModal key={applyCourseId} …/>}`.

**PUB-11 — low — ApplyModal.tsx:229,312-315**
X button calls `onClose` without resetting `status`; reopening shows the previous success screen. "Close Protocol" resets status but not name/email/phone, so a second open pre-fills the prior applicant (shared-device PII leak, easy duplicate submissions). No dedupe on (email, courseId).
Remediation: Reset all form state on close (or unmount on close per PUB-10). Optional dedupe via deterministic doc id (e.g. hash(email+courseId)) with `create`-only rule.

**PUB-12 — low — applicationWorkflow.ts:34-91**
Readiness "score" is a constant per course (88–99; 99 for enterprise, 95 default) keyed on substring of a 3-value dropdown; shown to applicants as an "admissions" evaluation and stored as if meaningful. `'agentic-systems'` branch (42) is dead (no such course). `enterprise-custom` is in `COURSES` (mockData.ts:183) and therefore selectable in ApplyModal, creating an `applications` doc instead of an enterprise inquiry (App.tsx only redirects when opened via `handleOpenApplyWithCourse`).
Remediation: Decide whether to keep the score (see C-2); remove dead branch; filter `enterprise-custom` out of the ApplyModal `<select>`.

**PUB-13 — low — App.tsx:20-88**
Routing edge cases: (a) landing on `/?page=admin` or `/#programs` pushes `/admin` (86) — Back returns to `/?page=admin`, but `popstate` ignores query/hash and renders **home** with an admin URL; (b) unknown paths (`/foo`) render home and push `/home`, adding a history entry (Back → `/foo` → home → push again: Back-button trap-ish); (c) no 404 page; (d) `handleNavigate` and the effect both push — guarded by pathname equality, so no double entry (OK). Title handling is correct.
Remediation: Use `replaceState` in the effect (only `handleNavigate` should push); have `popstate` reuse `getInitialPage()`.

**PUB-14 — low (a11y) — ApplyModal, EnterpriseContactModal, AIAssistantModal, SearchModal**
No `role="dialog"`/`aria-modal`, no Escape-to-close, no focus trap (only Navbar mobile menu has these). Contact/enterprise fields lack `maxLength`.

## Marketing / content claims (info — for human review, not judged)

- **PUB-15 — info.** Faculty in `mockData.ts:255-300` ("Dr. Aris Thorne", "Sarah Chen, M.Sc.", "Marcus Vane", "Elena Rostova, Ph.D.") with degrees/bios and AI-generated `lh3.googleusercontent.com/aida-public/...` images; research "papers" with specific benchmark numbers (`mockData.ts:306-370`, e.g. "68.4% reduction in peak VRAM", "99.6% trajectory precision") presented as institute output. AboutPage.tsx:168 "publishing in top-tier AI conferences and advising Fortune 500 engineering teams". ContactFAQ.tsx:47 "AI Admissions Assistant and Admissions Committee review… 48 to 72 hours… official letter of acceptance"; ContactFAQ.tsx:71-75 "industry-recognized", "Blockchain-verifiable digital credential badges". Physical location "AI Innovation Hub, Colombo Tech Park" (ContactPage.tsx:378; ContactFAQ.tsx:34). "RESPONSE GUARANTEE: < 24 Hours" (EnterpriseContactModal.tsx:277-278). Contact success card claims "ENCRYPTION: AES-256-GCM" (ContactPage.tsx:196) — not true of any code path. Admin default enterprise reply promises "local GPU cluster" and "private GPU sandbox" (EnterpriseInquiryModal.tsx:48).
- **PUB-16 — low.** All imagery (logo, map, team, faculty) is hotlinked from `lh3.googleusercontent.com/aida-public/…` (AI Studio preview assets, mockData.ts:375-381) — may expire or be rate-limited; self-host in `public/`.

## Candidate decisions (options + recommendation)

- **C-1 Public submission architecture.** (a) Keep client `addDoc`, harden rules (hasOnly/types/sizes/serverTime) + App Check; (b) move all public writes to rate-limited Vercel `api/submit/*` using Admin SDK, set client `create: if false`; (c) (a) now, (b) later. **Recommend (c):** rules + App Check are small and close PUB-1/3 immediately; (b) is the proper fix for spam and for sending real confirmation emails.
- **C-2 Readiness score / "AI workflow".** (a) Remove score + "AI" framing from applicant UI, keep generated welcome text as a preview; (b) keep but label as "program fit guidance", not admissions evaluation; (c) replace with real evaluation server-side (`/api/ai/evaluate-application` exists but is unused). **Recommend (a)** for the applicant-facing UI; revisit (c) only as an admin-side tool.
- **C-3 Confirmation email.** (a) Stop claiming it was sent (copy change); (b) actually send via server (Gmail API with a service account / transactional email provider) after a successful write. **Recommend (a) now, (b) with C-1(b).**
- **C-4 `application_workflows` collection.** (a) Delete client write + close rules; (b) keep but staff-only create. **Recommend (a)** — it duplicates `applications` and is a forgery vector.
- **C-5 Admin page loading.** (a) `React.lazy` AdminPage + remove footer link; (b) leave as is. **Recommend (a)**, low effort, cuts public bundle.

## Open questions

1. Is Firebase Auth email/password sign-up enabled, and is Google sign-in open to any account? This decides whether PUB-2 is exploitable by the public today (likely critical if yes).
2. Is App Check configured in the Firebase project (console-only, not visible in repo)?
3. Are applicants ever told the readiness score is binding, and do admins use it for decisions?
4. Is any out-of-band process (Zapier, Firebase Extension "Trigger Email", Cloud Function) sending confirmation emails from `applications`/`application_workflows`? Nothing in the repo does.
5. Are the faculty, papers, location, credentials and "<24h guarantee" real? (Legal/marketing sign-off.)
6. Should `enterprise-custom` be selectable in the Apply form at all?
7. Does the RBAC work on the current branch (19232dc) change the rules for these collections? It is not on the audited baseline.
