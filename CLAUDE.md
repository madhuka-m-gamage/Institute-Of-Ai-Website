# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Marketing + admissions site for "Institute Of AI" — a static React SPA (Vite) hosted on Vercel, with Firebase (Auth + Firestore) as the only backend for applications, enterprise inquiries, contact messages, and the admin console. Originally scaffolded in Google AI Studio (see `metadata.json`). Security/quality work is tracked in [CAVALRY-TRACKER.md](CAVALRY-TRACKER.md).

## Commands

```bash
npm run dev          # vite dev server on :3000
npm run build        # vite build → dist/ (what Vercel serves)
npm run preview      # serve the production build locally
npm run lint         # tsc --noEmit (note: @types/react isn't installed yet, so JSX props aren't type-checked)
npm test             # Vitest: tests/characterization + tests/unit
npm run test:rules   # Firestore rules tests against the local emulator (needs Java + firebase CLI; offline demo project)
npm run deploy:rules # deploy firestore.rules — production-affecting, owner go-ahead only
```

CI (`.github/workflows/ci.yml`) runs lint, `npm test`, the build, and the rules tests on every PR/push to `staging`/`main`; both jobs are required checks. Feature PRs squash-merge into `staging`; `staging` → `main` promotions use merge commits.

## Architecture

**Static SPA, no server code.** Vercel builds with `vite build` and serves `dist/`; `vercel.json` rewrites all paths to `index.html`. There are no API routes.

**Client-side routing without a router library.** [App.tsx](src/App.tsx) hand-rolls page routing over `window.history`/`popstate`: `getInitialPage()` resolves the current `Page` from pathname → legacy hash → `?page=` query param → default `home`; `handleNavigate` pushes state and updates `document.title`. Pages are conditionally rendered; only `AdminPage` is lazy-loaded (its own chunk behind `<Suspense>`).

**Firebase is the only backend datastore.** [src/lib/firebase.ts](src/lib/firebase.ts) initializes the app from `firebase-applet-config.json` (project `institute-of-ai-509800`, named database `ioai-website`) and exports `db`/`auth` plus auth helpers. Google sign-in requests identity only; `getGmailSendToken()` asks for `gmail.send` incrementally when an admin first sends mail. [firestore.rules](firestore.rules) is the real authorization boundary: staff roles live in `users/{uid}.role` (`super_admin`, `admissions_officer`, `lead_faculty`, `curriculum_mentor`); public forms may `create` only payloads matching an exact field list; `adminAuditLogs` is append-only with the actor and server timestamp enforced. `firebase-blueprint.json` documents entity schemas; keep it in sync when changing document shapes.

**Admissions workflow:** [src/services/applicationWorkflow.ts](src/services/applicationWorkflow.ts) is a deterministic, client-side engine (static rules keyed on `courseId`/experience) that writes to `application_workflows`.

**Gmail sending** ([src/services/workspace.ts](src/services/workspace.ts)): `sendGmailMessage` hand-builds the MIME message and calls the Gmail REST API with `fetch`. It accepts only a single plain recipient address (recipients come from public submissions) and encodes subjects/filenames per RFC 2047/2231.

**Admin audit trail:** write entries only through `logAdminAction()` in [src/services/auditLog.ts](src/services/auditLog.ts) — it sets the actor and server timestamp the rules require.

**`StudentApplication` has multiple optional name fields** (`fullName`, `applicantName`, `name`, `candidateName`) because records originate from different write paths. Always resolve display names via `getCandidateName()` in [src/types.ts](src/types.ts) rather than reading a field directly. The same file's `getApplicationTimestamp`/`formatApplicationDate` normalize Firestore `Timestamp` objects, epoch numbers, and ISO strings — use them instead of ad hoc date parsing.

**Admin console** ([src/pages/AdminPage.tsx](src/pages/AdminPage.tsx)) is a single page with its own tab state (`admissions | activity | users | audit`) composing components from `src/components/` (bulk email/status modals, CSV export via `src/services/csvExport.ts`, PDF generation via `src/services/pdfDocuments.ts`, audit trail, user management). It resolves the signed-in user's staff role from Firestore and fails closed; the UI gate mirrors, but does not replace, the rules.

**Styling:** Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js` — v4 uses CSS-based config in `src/index.css`). Dark theme is baked into the HTML shell (`<html class="dark">`, hardcoded `bg-[#031427]`/`text-[#d3e4fe]` on `<body>` in [index.html](index.html)) rather than toggled at runtime.

**Path alias:** `@/*` maps to the repo root (see `vite.config.ts` and `tsconfig.json`), not `src/`.
