# Recon — Google Workspace Integration

Commit audited: `9779fd9` (origin/main). Read-only; nothing executed (no `node_modules` in worktree, so `tsc`/app not run — findings are from code reading).

## Scope (files read)

- `src/services/workspace.ts` (all)
- `src/lib/firebase.ts` (all — scopes, token cache, sign-in)
- `src/components/BulkEmailModal.tsx` (logic 1–441, footer/preview wiring 495–819)
- `src/components/EmailRichPreview.tsx` (props, body formatter, attachments)
- `src/components/WorkspaceAdminPanel.tsx` (state, handlers 44–210, drive/forms UI)
- `src/components/WorkspaceHubModal.tsx` (auth/log handlers 100–325)
- Cross-checked: `firestore.rules`, `firebase-blueprint.json`, `src/pages/AdminPage.tsx` (auth 166–256, bulk wiring 330–336, 1140–1160, 1441–1495), `ApplicationDetailModal.tsx` / `EnterpriseInquiryModal.tsx` (other `sendGmailMessage` callers), `ApplyModal.tsx` (application write), `pdfDocuments.ts` (attachment filenames).

## What it does (features, entry points, reachability)

| Feature | Entry point | Reachable? |
|---|---|---|
| Google sign-in requesting 15 Workspace scopes | `googleSignIn()` ← AdminPage "Sign in with Google" (`AdminPage.tsx:521`) | Yes — `/admin`, any Google account |
| Workspace tab: Drive list/search, Docs create, Gmail inbox (5 msgs) + send, Calendar list/create, Tasks list/create, Contacts list, Forms inspect | `WorkspaceAdminPanel` (`AdminPage.tsx:1442`, tab `workspace`) | Yes |
| Bulk decision email w/ generated PDF attachments + status sync | `BulkEmailModal` (`AdminPage.tsx:1156`, `1486`) | Yes (but crashes — GWS-2) |
| Single decision email | `ApplicationDetailModal.tsx:365` | Yes (out of module; same MIME builder) |
| Enterprise reply email | `EnterpriseInquiryModal.tsx:67` | Yes (out of module; same MIME builder) |
| `WorkspaceHubModal` (dup of panel + `workspaceLogs` activity log) | not imported anywhere | **Dead code** |
| `getGoogleDocDetails` | no callers | Dead |

Access token: module variable `cachedAccessToken` (`firebase.ts:76`) + React state in AdminPage. Memory only — not persisted. Lost on reload; `initAuth` then reports `''` (`firebase.ts:86-88`).

## OAuth scopes table (scope | used by | necessary?)

Declared `firebase.ts:55-71`, all added to the single `GoogleAuthProvider` with `prompt: 'select_account consent'` (`:50-52`) → every Google sign-in to `/admin` prompts for all 15, every time.

| Scope | Google class | Used by | Necessary? |
|---|---|---|---|
| `drive` | Restricted | nothing needs full Drive | **No** |
| `drive.readonly` | Restricted | `listDriveFiles` | No — `drive.metadata.readonly` suffices (names/links only); or drop feature |
| `drive.file` | Non-sensitive | — (Docs create uses Docs API) | Optional; redundant with `documents` |
| `forms.body.readonly` | Sensitive | `getFormDetails` | Only if Forms tab kept |
| `forms.responses.readonly` | Sensitive | `getFormResponses` (only count shown) | Only if Forms tab kept |
| `gmail.readonly` | Restricted | `listGmailMessages` (format=full, shows subject/from/snippet) | **No** — cosmetic inbox widget |
| `gmail.send` | Sensitive | all email sending | **Yes** (core) |
| `gmail.compose` | Restricted | nothing (no drafts) | **No** |
| `documents.readonly` | Sensitive | `getGoogleDocDetails` (dead) | No |
| `documents` | Sensitive | `createGoogleDoc` | Only if Docs tab kept |
| `tasks` | Sensitive | list/create tasks | Only if Tasks tab kept |
| `contacts` | Sensitive | nothing writes contacts | **No** |
| `contacts.readonly` | Sensitive | `listGoogleContacts` | Only if Contacts tab kept |
| `calendar.events` | Sensitive | `createCalendarEvent` (also covers read) | Only if Calendar tab kept |
| `calendar.readonly` | Sensitive | `listCalendarEvents` | No — covered by `calendar.events` |

Minimum for the core admissions function: `gmail.send` only.

## Docs vs code mismatches

- CLAUDE.md says Workspace functions "throw on 401/403 with a reconnect message". True only for `listDriveFiles`, `listGmailMessages`, `listGoogleTasks`, `listGoogleContacts`, `listCalendarEvents`. `createGoogleDoc`, `createGoogleTask`, `createCalendarEvent`, `sendGmailMessage` throw generic errors; `getFormDetails`/`getFormResponses`/`getGoogleDocDetails` swallow errors and return `null`/`[]`.
- CLAUDE.md: "scopes declared in firebase.ts" — true, but omits that they're requested on *every* admin Google sign-in, not incrementally.
- `firebase-blueprint.json` documents `workspaceLogs` / `WorkspaceLog`; only writer is dead `WorkspaceHubModal`. Live panel logs nothing.
- `adminAuditLogs` (written by BulkEmailModal and 5 other components) is absent from both `firestore.rules` and `firebase-blueprint.json`.
- `sendGmailMessage` comment "RFC 2822 UTF-8 encoded subject" — it's RFC 2047, and not length-compliant (GWS-9).

## Security findings

**GWS-1 — high — `workspace.ts:224-226, 239-241, 256-258`; callers `BulkEmailModal.tsx:364`, `ApplicationDetailModal.tsx:365`, `EnterpriseInquiryModal.tsx:67`**
Header injection via recipient. `To: ${to}` is interpolated raw. `to` = `application.email` / `inquiry.workEmail`, which come from public unauthenticated `create` (`firestore.rules:28,35`, no field validation; client-side `ApplyModal` validation is bypassable via Firestore REST with the public config). A value like `x@a.com\r\nBcc: list@evil.com` or `a@x.com, b@y.com` makes the admin's Gmail send the decision letter + PDFs to attacker-chosen addresses (Gmail honours `Bcc`/comma lists in `raw`), and `\r\n\r\n` can terminate headers / forge MIME parts. Phishing-from-institution vector.
Fix: in `sendGmailMessage` reject `to` containing `\r`, `\n`, `,`, `;`, `<`, `>` and require a single strict addr-spec (`/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/`); also strip CR/LF from `att.filename`. Add `email` shape validation in `firestore.rules` for `applications`/`enterpriseInquiries` create (`request.resource.data.email.matches(...)`, size limit).

**GWS-2 — see Bugs (crash) — listed there.**

**GWS-3 — high (compliance/availability) — `firebase.ts:50-73`**
15 scopes incl. 5 **restricted** (`drive`, `drive.readonly`, `gmail.readonly`, `gmail.compose`, and Gmail read) requested from every Google sign-in, with forced `consent`. A production (external) OAuth app needs Google verification + an annual third-party security assessment (CASA) for restricted scopes; unverified → "Google hasn't verified this app" warning and 100-user cap; in Testing mode refresh/consent expires every 7 days and only listed test users can sign in. Any Google user who visits `/admin` (no role gate at this commit) is asked to hand over full Drive/Gmail-read to the app — large blast radius if the SPA is ever XSS'd, since the token is usable in-page.
Fix: request only `openid email profile` at sign-in; request `gmail.send` incrementally (`reauthenticateWithPopup`/`linkWithPopup` with a provider carrying only that scope) when an admin first sends mail. Drop `drive`, `drive.readonly`, `gmail.readonly`, `gmail.compose`, `contacts`, `documents.readonly`, `calendar.readonly` outright. Remove `prompt: consent`.

**GWS-4 — medium — `WorkspaceAdminPanel.tsx` (whole tab) / `AdminPage.tsx:1441`**
Workspace tab is available to any signed-in user (rules/UI treat `isSignedIn()` as admin at this commit — cross-ref auth module). It only acts on the user's own Google account, so no cross-tenant leak, but it is a general-purpose "send Gmail from this app" UI with arbitrary `emailTo` (no validation, same GWS-1 injection with self-supplied input). Low direct impact; mainly expands scope surface.
Fix: gate behind admin role; or remove non-admissions tabs (see D1).

**GWS-5 — low — `workspace.ts:61`**
Drive query injection: `name contains '${search}'` — a `'` or `\` breaks/alters the Drive `q` expression (own Drive only; causes 400s).
Fix: escape `\` and `'` (`search.replace(/[\\']/g, '\\$&')`).

**GWS-6 — low — `workspace.ts:131,151,116,91`**
`formId` / `docId` interpolated into URL path unencoded (`/`, `?`, `#` in user input alter the request path on googleapis.com).
Fix: `encodeURIComponent(formId)`.

**GWS-7 — low — `BulkEmailModal.tsx:187-193, 303-315`**
Template substitution uses `String.replace(regex, value)` with applicant-controlled `name`/`course`/`email` as the replacement string → `$&`, `` $` ``, `$'`, `$1` patterns are expanded (applicant can splice template text into their own letter). Cosmetic but applicant-controlled.
Fix: use replacer functions `() => name`. Extract one shared `interpolate()` (duplicated 2x in this file).

**GWS-8 — info — `firebase.ts:76, 124-126`**
Token held in memory only (good — not in localStorage). No expiry tracking; Firebase does not refresh Google access tokens (~1h). No Drive files are created with sharing permissions (no `permissions` calls anywhere); Docs created are private to the admin. No `dangerouslySetInnerHTML`/`srcDoc` in module — `EmailRichPreview` renders applicant data as React text (no XSS). Drive `webViewLink` hrefs come from Google.

## Bugs / data-integrity risks

**GWS-2 — high — `BulkEmailModal.tsx:761-769` → `EmailRichPreview.tsx:17-18, 83, 228`**
Prop mismatch: BulkEmailModal passes `body=` and no `recipientEmail`; component expects `bodyText` (required) and `recipientEmail`. `formatBodyContent(undefined)` → `text.split` TypeError on first render with ≥1 recipient (modal only opens with a selection). No ErrorBoundary exists in `src/` → the whole admin SPA unmounts (blank page). Bulk email is effectively unusable. `npm run lint` (tsc) should flag this; indicates lint isn't gating merges.
Fix: pass `bodyText={interpolatedPreview.body}` and `recipientEmail={interpolatedPreview.email}`; add a top-level ErrorBoundary; run `tsc --noEmit` in CI.

**GWS-10 — high — `AdminPage.tsx:1489` + `BulkEmailModal.tsx:84-92`**
`selectedApplications={applications.filter(...)}` is a new array each parent render; the modal's effect on `[isOpen, selectedApplications]` then resets `recipientList`, `sendLogs`, `isDone`, **`isSending=false`** on every AdminPage re-render. During the send loop any parent re-render (toast, notification bell, `onBulkCompleted`) re-enables the Dispatch button → second click starts a parallel loop → **duplicate emails**. After completion, `onBulkCompleted` updates `applications` → effect wipes the result log. Manual recipient removals are also reverted.
Fix: reset only on `isOpen` false→true transition (depend on `isOpen` only, or `useMemo` the filtered array in AdminPage keyed on `selectedAppIds`); guard dispatch with a ref (`sendingRef.current`).

**GWS-11 — medium — `BulkEmailModal.tsx:285-410`**
Send-then-record ordering with one deferred `writeBatch`: emails go out immediately but Firestore updates are committed only after the whole loop; commit failure is `console.warn`'d and `onBulkCompleted(updatedApps)` still marks them sent/status-changed in UI. Tab close mid-loop → N emails sent, 0 recorded. No idempotency: nothing checks `decisionLetterSent`/`lastDecisionStatus` before sending, recipients not deduped by email, Dispatch stays enabled after `isDone` → re-click re-sends to everyone. Batch >500 ops will fail wholesale.
Fix: per-recipient `updateDoc` right after each successful send (or chunked batches ≤500); skip/confirm recipients already sent the same `lastDecisionStatus`; dedupe by lowercase email; disable Dispatch after `isDone`; surface commit errors as a toast.

**GWS-12 — medium — `BulkEmailModal.tsx:415-424`; rules**
`adminAuditLogs` has no rule → default-deny (`firestore.rules:6-8`); every audit write fails silently (also in 5 other components). Additionally `newStatus: undefined` when `syncStatus==='keep'` would be rejected by Firestore even if allowed (no `ignoreUndefinedProperties`). Audit trail for mass email is effectively nonexistent. Also `details` stores the full recipient email list (PII growth).
Fix: add an admin-only `create` rule for `adminAuditLogs` (and read for admins); omit undefined fields; store recipient IDs/count rather than raw emails.

**GWS-13 — medium — `BulkEmailModal.tsx:288-400`; `firebase.ts:124`**
No token-expiry / rate-limit handling in the loop. After ~1h or on reload (token `''` → early return with toast, OK) an expired token makes every remaining send fail with a raw Gmail error; no "reconnect & retry failed only" path, and BulkEmailModal/WorkspaceAdminPanel have no reconnect button (only detail modals do via `onConnectGoogle`). 300 ms fixed delay, no 429/`rateLimitExceeded` backoff; Gmail daily caps (≈500 consumer / 2000 Workspace) not considered. Email/password-signed-in admins never have a token.
Fix: store token issue time, prompt re-auth when >55 min; on 401 stop loop and offer "retry failed"; exponential backoff on 429/403-rateLimit; pass `onConnectGoogle` into both components.

**GWS-9 — low — `workspace.ts:219, 256-260`**
MIME correctness: whole subject in one RFC 2047 encoded-word (spec max 75 chars; long subjects violate — Gmail tolerates, other MUAs may not); attachment base64 not wrapped at 76 chars (RFC 2045); filenames not RFC 2231-encoded; body sent `8bit` with bare `\n` line endings and no 998-char line limit. `btoa(unescape(encodeURIComponent(...)))` over multi-MB strings is slow/memory-heavy; JSON `raw` path is limited by Gmail request-size limits (large attachments need the `/upload` media endpoint).
Fix: split encoded-words ≤75 chars; wrap base64 at 76; normalize body to CRLF and use `quoted-printable` or `base64` for body; consider `TextEncoder`-based base64url.

**GWS-14 — low — `WorkspaceAdminPanel.tsx:826-830`**
`getFormDetails` returns `null` on any error, then `f.title` throws TypeError; toast shows "Cannot read properties of null" instead of the API error. Same swallowing in `getFormResponses`.
Fix: let `getForm*` throw (with 401/403 message like the list functions) and handle in caller.

**GWS-15 — low — `workspace.ts:90-107`**
`createGoogleDoc` ignores the `batchUpdate` response — content insertion failure reports success with an empty doc.
Fix: check `res.ok`, throw.

**GWS-16 — low — `workspace.ts:57-74, 164-199, 293-351`**
No pagination (Drive 20, Gmail 10→5, Tasks default 20, Contacts 20, Calendar 10); `listGmailMessages` fetches `format=full` bodies but only uses headers/snippet.
Fix: `format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, or remove the feature (D1).

**GWS-17 — info — `src/components/WorkspaceHubModal.tsx` (988 lines), `workspace.ts:113-125`**
Dead code: `WorkspaceHubModal` is imported nowhere; `getGoogleDocDetails` has no callers. HubModal also registers a second `initAuth` listener and would be the only writer of `workspaceLogs`.
Fix: delete both (and the `workspaceLogs` rule/blueprint entry if logging isn't revived).

## Candidate decisions (options + recommendation)

**D1 — Scope of the Workspace tab.**
(a) Keep all 7 tabs, trim scopes to least-privilege per tab (~8 scopes, still sensitive, verification needed). (b) Remove the Workspace tab entirely; keep only admissions email (`gmail.send`). (c) Keep Docs/Calendar/Tasks, drop Gmail-inbox/Drive/Contacts/Forms.
**Recommend (b)** — the tab is a generic Google client unrelated to admissions and drives all restricted scopes; `gmail.send` alone keeps the product's core flows.

**D2 — How to send admissions mail.**
(a) Keep per-admin Gmail API from the browser (needs sensitive-scope verification, token expiry UX, per-admin quotas). (b) Server-side send (Vercel function + transactional provider or Workspace service account with domain-wide delegation for `admissions@`), triggered by an admin-authenticated API call; Firestore update + send done idempotently server-side.
**Recommend (b) medium-term; (a) with GWS-1/2/10/11 fixes short-term.** (b) eliminates browser-held Google tokens, restricted-scope verification, and the send-then-record race.

**D3 — Scope request timing.** (a) All at sign-in (current). (b) Incremental: basic sign-in, request `gmail.send` on first send. **Recommend (b).**

**D4 — Audit logging.** (a) Fix `adminAuditLogs` rules (admin-only create, no update/delete). (b) Write audit server-side only. **Recommend (a) now, (b) if D2(b) adopted.**

## Open questions

1. Is the OAuth consent screen in Testing or Production, and Internal (Workspace org) or External? Internal-only would avoid verification and the 100-user cap — affects GWS-3 severity.
2. Do admins use a Workspace domain account (e.g. `@instituteofai.com`) or personal Gmail? Determines send quotas and whether a service account (D2b) is possible.
3. Are the Drive/Contacts/Tasks/Calendar/Forms tabs actually used by staff, or AI Studio scaffold leftovers?
4. Has bulk email ever worked in production? GWS-2 suggests it crashes on open — confirm with a quick manual test before Fortify writes characterization tests.
5. Does the later RBAC commit (`19232dc`, not on this worktree's base) add rules for `adminAuditLogs` or gate the Workspace tab? Re-check GWS-4/GWS-12 against it.
6. Expected maximum bulk batch size (affects 500-op batch limit and Gmail daily cap).
