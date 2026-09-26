# Recon — Firebase Rules & Data Layer

Branch audited: origin/main @ 9779fd9 (read-only). Note: the role-based access commit (19232dc) is NOT on this branch; everything below reflects main.

## Scope (files read)

- `firestore.rules`, `firebase-blueprint.json`, `firebase-applet-config.json`
- `src/lib/firebase.ts`, `src/types.ts`
- Every Firestore call site in `src/` (grep for `collection(`, `doc(`, `addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `getDocs`, `getDoc*`, `onSnapshot`, `writeBatch`, `query(`): `ApplyModal.tsx`, `ContactPage.tsx`, `EnterpriseContactModal.tsx`, `applicationWorkflow.ts`, `AdminPage.tsx`, `ApplicationDetailModal.tsx`, `BulkStatusModal.tsx`, `BulkEmailModal.tsx`, `EnterpriseInquiryModal.tsx`, `CandidateExportModal.tsx`, `AdminAuditTrailPanel.tsx`, `RecentActivityPanel.tsx`, `AdminNotificationBell.tsx`, `WorkspaceHubModal.tsx`
- `src/services/workspace.ts` (only to check which OAuth scopes are actually used)
- Repo root for deploy config (`firebase.json`, `.firebaserc`: absent)

## What it does

- `firebase.ts` initialises Firebase from `firebase-applet-config.json`, uses a **named** Firestore database (`firestoreDatabaseId`), and exposes Google popup sign-in (15 Workspace scopes) and email/password sign-in. The Google OAuth access token is kept in a module variable (`cachedAccessToken`), in memory only. It is not written to localStorage or sessionStorage, so it is lost on reload.
- Public forms (`ApplyModal`, `ContactPage`, `EnterpriseContactModal`) and the deterministic workflow (`applicationWorkflow.ts`) write to Firestore unauthenticated.
- The admin console (`AdminPage`) shows everything to **any** authenticated Firebase user. No admin check exists anywhere in the client (`AdminPage.tsx:415` only checks `!user`), and there are no custom claims, role docs or allowlist in the rules. `UserManagementPanel` is a hardcoded in-memory mock that does not enforce anything.
- There is no `firebase.json` or `.firebaserc`, and no script or CI step deploys `firestore.rules`. Nothing in the repo shows which rules are live on the named database.

## Collection access matrix

| Collection | Client ops (file:line) | Rules allow | Mismatch |
|---|---|---|---|
| `applications` | create: `ApplyModal.tsx:161` (anon). list: `AdminPage.tsx:265`, `AdminNotificationBell.tsx:38-39` (onSnapshot). update: `ApplicationDetailModal.tsx:278,369`, `BulkStatusModal.tsx:45-66` (batch), `BulkEmailModal.tsx:285,381,406` (batch) | read: any signed-in. create: **anyone, no validation**. update/delete: signed-in AND (owner OR `token.email != null`), which in practice means any signed-in user with an email | Admin works only because the rules let every user in. Any Google account can read, modify or delete all applicant PII (FB-1, FB-2) |
| `enterpriseInquiries` | create: `EnterpriseContactModal.tsx:137,141`. list: `AdminPage.tsx:282`, `AdminNotificationBell.tsx:66-67` | read: owner OR `token.email != null`. create: anyone. update/delete: owner only | Reading is effectively open to any signed-in user. Admins cannot update inquiries (the client doesn't try to) |
| `contactMessages` | create: `ContactPage.tsx:94`. list: `AdminPage.tsx:291`, `AdminNotificationBell.tsx:92-93` | read: any signed-in. create: anyone. update/delete: owner | Read is open to any signed-in user (FB-1) |
| `application_workflows` | create: `applicationWorkflow.ts:155` (anon). list: `RecentActivityPanel.tsx:108-109` | read: any signed-in. create: `if true`, no validation | Anyone can inject fake "activity" into the admin feed. PII is readable by any signed-in user (FB-4) |
| `adminAuditLogs` | create: `ApplicationDetailModal.tsx:282,378`, `BulkStatusModal.tsx:70`, `BulkEmailModal.tsx:415`, `EnterpriseInquiryModal.tsx:71`, `CandidateExportModal.tsx:126`. list: `AdminAuditTrailPanel.tsx:30-31`, `RecentActivityPanel.tsx:84-96` | **No rule, so default deny** for read and write | **Audit trail fails silently in prod.** Writes are wrapped in try/catch + `console.warn`. `AdminAuditTrailPanel.tsx:35-55` shows fabricated seed entries on failure (FB-5) |
| `workspaceLogs` | create: `WorkspaceHubModal.tsx:163`. list (where userId==uid): `:178` | owner-scoped create/read | Consistent, but `WorkspaceHubModal` is never mounted (dead code) |
| `users` | none | read: any signed-in. write: owner | Unused by the client. A user can write their own `role` field (FB-9) |
| `researchNotes` | none | owner-scoped | Unused (rule and blueprint only) |
| `test/connection` | `firebase.ts:156` `testConnection()` (never called) | default deny | Dead code |

## Docs vs code mismatches

- **DOC-1.** CLAUDE.md says `applications`, `enterpriseInquiries` and `contactMessages` "require sign-in for read/update". That is true, but it hides the real problem: sign-in is open to the whole internet, so signed-in does not mean admin. CLAUDE.md also doesn't list `application_workflows`, which is publicly writable, or `adminAuditLogs`, which is denied.
- **DOC-2.** CLAUDE.md says `applicationWorkflow.ts` "writes an audit doc to `application_workflows`". The write only succeeds because the rules allow unauthenticated `create: if true` (`firestore.rules:47-51`). The "audit" record is therefore spoofable.
- **DOC-3.** Blueprint drift (`firebase-blueprint.json`):
  - `Application.status` enum lists `reviewing`. Code uses `under_review` and `waitlisted` (`types.ts:76`).
  - The blueprint requires `applicantName` and `userId`. Code writes `fullName`, `name`, `candidateName`, `courseTitle`, `phone`, `background`, `experienceLevel`, `pythonProficiency`, `reviewedAt`, `reviewedBy`, `decisionLetterSent`, `lastDecision*` and `lastAttachedFiles`, none of which are in the blueprint.
  - `contactMessages`, `application_workflows` and `adminAuditLogs` are missing from the blueprint entirely.
  - None of the blueprint's `maxLength` or `enum` constraints are enforced in the rules.
- **DOC-4.** CLAUDE.md implies there is a working rules deployment. There is no `firebase.json`, so `firebase deploy --only firestore:rules` cannot target the named database from this repo. The rules file may not match what is live.
- **DOC-5.** `EnterpriseInquiry.userId` and the blueprint suggest owner semantics. In practice anonymous creates store the literal sentinels `'guest_applicant'`, `'guest_contact'` and `'guest_enterprise'` (`ApplyModal.tsx:176`, `ContactPage.tsx:99`, `EnterpriseContactModal.tsx:130`).

## Security findings (server enforcement vs client trust)

- **FB-1 — critical — `firestore.rules:24,30,35,42,49`; `AdminPage.tsx:415`.**
  - Problem: authorization is only `isSignedIn()` or `request.auth.token.email != null`. Anyone can sign in with any Google account (the console's own Google button), and anyone can create an email/password account through the Identity Toolkit `accounts:signUp` REST endpoint with the public apiKey if that provider is enabled. The UI not exposing sign-up does not prevent this. Once signed in, a user can list all `applications` (name, email, phone, goals, notes), `contactMessages`, `enterpriseInquiries`, `application_workflows` and `users`. The client treats every signed-in user as admin.
  - Fix: add an `isAdmin()` helper based on a custom claim (`request.auth.token.admin == true`) or on `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` with the admins collection writable only via the Admin SDK. Gate every read, update and delete on it. Mirror the check in the client for UX only.
- **FB-2 — critical — `firestore.rules:31`.**
  - Problem: `applications` update/delete allows `request.auth.token.email != null`, so any signed-in user can change `status` to `accepted`, overwrite notes, or delete every application.
  - Fix: use `allow update, delete: if isAdmin();`. If applicants should edit their own drafts, add a narrow owner-update rule using `affectedKeys().hasOnly([...])` that excludes status and review fields.
- **FB-3 — high — `firestore.rules:30,37,43,50`.**
  - Problem: the public `create: if true` rules have no schema validation. Attackers can:
    - set `status: 'accepted'`, `reviewedBy`, `decisionLetterSent` and similar fields on create
    - choose document IDs via `setDoc`
    - write fields of any type (for example a numeric `fullName`, see FB-12)
    - write documents up to 1 MB
    - set arbitrary future `createdAt` values that pin their record to the top of the admin list (`getApplicationTimestamp` sort)
    - flood the collections without limit (no App Check; `recaptchaSiteKey` is empty)
  - Fix: on create, enforce `request.resource.data.keys().hasOnly([...])`, per-field `is string` and `.size() <=` limits taken from the blueprint, `status == 'submitted'`, no review fields, `createdAt == request.time` (switch the client to `serverTimestamp()`), and `userId == request.auth.uid || userId == 'guest_*'`. Enable Firebase App Check (reCAPTCHA Enterprise) for Firestore.
- **FB-4 — high — `firestore.rules:47-51`; `applicationWorkflow.ts:155-169`; `RecentActivityPanel.tsx:108`.**
  - Problem: `application_workflows` accepts unauthenticated arbitrary writes, and those writes render in the admin activity feed. Attackers can plant fake "DISPATCHED" events, phishing text in `generatedEmailBody`, or spoofed names. The collection also holds applicant PII that any signed-in user can read.
  - Fix: either drop the client write (it duplicates the application record) or validate it strictly (same keys and limits as FB-3, `status == 'DISPATCHED'`, `sentAt == request.time`). Restrict read to `isAdmin()`.
- **FB-5 — high (integrity/compliance) — no rule for `adminAuditLogs`; `AdminAuditTrailPanel.tsx:35-55`.**
  - Problem: every audit write and read is denied by the default-deny rule. Failures are swallowed, and the Audit tab displays two fabricated "seed" entries (`system@`, `admissions@instituteofai.com`), so the console appears to have a working audit trail when it does not.
  - Fix: add `match /adminAuditLogs/{id} { allow create: if isAdmin() && request.resource.data.actorEmail == request.auth.token.email && request.resource.data.timestamp == request.time; allow read: if isAdmin(); allow update, delete: if false; }`. Remove the fake fallback entries and show an error instead.
- **FB-6 — high — `firebase.ts:55-73`.**
  - Problem: the console requests 15 Google scopes, including full `drive` (read/write/delete all Drive files), `gmail.readonly` (read the entire mailbox), `contacts` (write), `documents` (write) and `gmail.compose`. `prompt: 'select_account consent'` forces the consent screen on every sign-in.
  - Code actually uses: Drive `files` list, Docs create/read/batchUpdate, Forms get, Gmail list/get/send, Tasks, People connections list, and Calendar events (`workspace.ts:59-390`). Full `drive`, `contacts` (write) and `gmail.compose` are not needed. `drive`, `drive.readonly`, `drive.file` and `contacts` + `contacts.readonly` are redundant pairs.
  - The token lives in the SPA's JS heap, so any XSS gives full mailbox and Drive access. Restricted scopes also require Google verification and a CASA assessment for an external app.
  - Fix: reduce the scope list to the minimal set (`drive.file`, `documents`, `forms.body.readonly`, `gmail.send`, `gmail.readonly` only if inbox reading is truly needed, `tasks`, `contacts.readonly`, `calendar.events`). Request them incrementally, only when the Workspace tab is used, not at console login. Drop `consent` from `prompt`.
- **FB-7 — medium — no `firebase.json` / `.firebaserc`.**
  - Problem: the rules are not deployable from the repo, and the database is a named DB (`ai-studio-...`) that was likely provisioned and managed by AI Studio. The live rules are unknown and may differ from this file, looser or stricter.
  - Fix: add `firebase.json` with `"firestore": [{"database": "<id>", "rules": "firestore.rules"}]`, pull the live rules and diff them, and deploy through a reviewed step.
- **FB-8 — medium — `firebase.ts:111-122`; Firebase console config.**
  - Problem: email/password sign-in is enabled for the console, and email-enumeration and open sign-up depend on project settings. `createUserWithEmailAndPassword` is imported but unused.
  - Fix: after FB-1, disable public sign-up (Identity Platform "allow user sign-up" off, or a blocking function), or disable email/password entirely if staff use Google Workspace. Remove the unused import.
- **FB-9 — low — `firestore.rules:20-23`.**
  - Problem: `users/{uid}` lets the owner write any field, including `role` (present in the blueprint), and any signed-in user can read every profile. This is latent today, but it becomes privilege escalation if `role` is ever used for authorization.
  - Fix: never authorize on user-writable docs. Restrict owner writes to profile fields and reads to the owner or `isAdmin()`.
- **FB-10 — low — `firebase-applet-config.json`.**
  - `apiKey`, `appId`, `projectId`, `authDomain`, `messagingSenderId` and `oAuthClientId` are public by design; they identify the project and are not secrets.
  - Concerns:
    - The project is an auto-generated `gen-lang-client-*` AI Studio project. Ownership and billing should be confirmed.
    - The apiKey should be restricted in GCP (HTTP referrers limited to the prod domains, API restrictions limited to Identity Toolkit, Firestore, etc.) so it cannot be used for other enabled APIs, such as the Gemini API on the same project.
    - `recaptchaSiteKey` is empty, so App Check is off.
  - Fix: apply the key restrictions and enable App Check.
- **FB-11 — low — `firebase.ts:133-152`.**
  - Problem: `handleFirestoreError` serialises the user's uid, email and provider emails into a thrown `Error` message and `console.error`. That is PII in logs and potentially in error-reporting tools.
  - Fix: log the code and path only.

## Bugs / data-integrity risks

- **FB-12 — medium — `types.ts:106-112`; `AdminPage.tsx:268`.**
  - Problem: `getCandidateName` calls `.trim()` on the first truthy name field without a type check. A single public application with `fullName: 123` or `fullName: {}` (possible via FB-3) throws inside `appSnap.docs.map`. The whole `applications` load then fails, and the error is swallowed by a `console.warn` at `:278`. One poisoned doc hides every application from admins.
  - Fix: coerce with `typeof v === 'string'`. Also validate types in the rules (FB-3).
- **FB-13 — low — `types.ts:114`.**
  - Problem: if `fullName` is the literal string `"undefined"` or `"null"` (legacy bad writes), the function skips to deriving a name from the email instead of trying `applicantName`, `name` and `candidateName`.
  - Fix: filter each alias individually before choosing one.
- **FB-14 — low — `types.ts:137-160`.**
  - Problem: numeric timestamps are assumed to be milliseconds; epoch seconds would render as 1970. Any `createdAt` from the client is trusted (future dates sort first and show a positive date).
  - Fix: treat values below 1e12 as seconds, clamp future dates, and use `serverTimestamp()` on writes.
- **FB-15 — low — `AdminPage.tsx:390` (CSV export).**
  - Problem: `(a.createdAt || '').replace` throws if `createdAt` is a Firestore `Timestamp`.
  - Fix: use `formatApplicationDate` or an ISO conversion helper. (CSV formula-injection escaping belongs to the export module, but the source data is attacker-controlled; see FB-3.)
- **FB-16 — medium — `BulkEmailModal.tsx:364,381,403-409`.**
  - Problem: emails are sent one by one via Gmail, and the Firestore batch is committed only after the loop. If the tab closes mid-loop or the commit fails (swallowed with `console.warn`), candidates have received decision emails but `decisionLetterSent` and `status` are never persisted, so a re-run double-sends.
  - Fix: commit per recipient (or in small batches) right after each send, and surface commit failures.
- **FB-17 — low — `AdminNotificationBell.tsx:38,66,92`.**
  - Problem: `query(collection, limit(20))` has no `orderBy`, so the bell shows an arbitrary 20 docs rather than the newest. It also opens three realtime listeners on PII collections for any signed-in user.
  - Fix: add `orderBy('createdAt','desc')` once `createdAt` is a server timestamp.
- **FB-18 — info.** Dead code: `WorkspaceHubModal.tsx` (never mounted), `testConnection()`, and unused imports (`updateDoc`/`deleteDoc` in AdminPage, `updateDoc`/`writeBatch` in AdminNotificationBell, `updateDoc` in EnterpriseInquiryModal and BulkEmailModal).
- **FB-19 — low — `firebase.ts:78-94`.**
  - Problem: `initAuth` hands `''` as the token after any reload. The Workspace and Gmail features then fail until the user signs in with Google again, and the admin sees the "token missing" toast. When the state change fires during an in-flight sign-in (`isSigningIn`), the callback is skipped and AdminPage relies on its manual `setUser`. This is fragile but works today.
  - Fix: acceptable to keep the token in memory only. Show an explicit "reconnect Google" state instead of an empty token.

## Candidate decisions

1. **Admin identity model (FB-1/2/5/9).**
   - Options:
     - (a) Custom claim `admin: true` set via Admin SDK script
     - (b) `admins/{uid}` allowlist doc checked with `exists()`
     - (c) hardcoded email allowlist in the rules with `email_verified == true`
   - **Recommendation: (a)**, with (b) acceptable if there is no server-side tooling. Avoid (c) except as a stopgap. (c) is the fastest emergency patch and can ship today.
2. **Public submission hardening (FB-3/4).**
   - Options:
     - (a) Strict rules validation plus App Check
     - (b) Move public writes behind the Vercel `/api` with server-side validation and rate limiting, and deny client create
   - **Recommendation: (a) now, and consider (b) later** if spam appears.
3. **`application_workflows` (FB-4).** Options: (a) delete the client write, or (b) keep it with strict validation. **Recommendation: (a).** It duplicates the application and is spoofable.
4. **Workspace OAuth scopes (FB-6).** Decide which Workspace features are actually required in prod. **Recommendation:** minimal, incremental scopes, and drop full `drive` and `gmail.readonly` unless inbox reading is a real requirement.
5. **Rules source of truth (FB-7).** Keep AI Studio as the manager of the rules, or take ownership with `firebase.json` and a reviewed deploy. **Recommendation: take ownership in the repo.**
6. **Email/password auth (FB-8).** Keep it with sign-up disabled, or remove it. **Recommendation:** Google-only if all staff have Google accounts.

## Open questions

- What rules are actually live on database `ai-studio-instituteofaiweb-...`? Is the email/password provider enabled, and is public sign-up allowed? (Cannot be verified read-only without console access.)
- Has any non-staff account already signed in? The Auth user list should be reviewed, since past exposure of applicant PII is possible.
- Are there existing prod docs with non-string name fields or Timestamp `createdAt`, which would trigger FB-12 or FB-15?
- Is the `gen-lang-client-0216460614` GCP project owned by the institute's org account, and is the apiKey restricted?
- Is the Google OAuth consent screen in "Testing" or "In production", and is it verified for restricted scopes?
