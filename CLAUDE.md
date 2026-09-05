# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Marketing + admissions site for "Institute Of AI" — a React SPA (Vite) served by a thin Express server that also exposes two Gemini-backed API routes. Originally scaffolded in Google AI Studio (see `metadata.json`, `assets/.aistudio/`); Firebase (Auth + Firestore) is the backend for applications, enterprise inquiries, and the admin console.

## Commands

```bash
npm run dev      # tsx server.ts — Express + Vite middleware (dev mode), serves on :3000
npm run build    # vite build (client) + esbuild bundles server.ts to dist/server.cjs
npm start        # node dist/server.cjs — run the production build
npm run lint     # tsc --noEmit — this is the only "lint"/typecheck step, there is no separate test suite or linter config
npm run clean    # rm -rf dist server.cjs
```

There are no unit/e2e tests in this repo. `npm run lint` (tsc --noEmit) is the only automated check — run it after making changes.

`GEMINI_API_KEY` is optional: both `/api/ai/*` routes in [server.ts](server.ts) fall back to hardcoded deterministic responses when it's unset, so the app is fully functional without it. Set it in `.env.local` (see [.env.example](.env.example)) to exercise real Gemini calls.

## Architecture

**Single Express server, two roles.** [server.ts](server.ts) runs Vite in middleware mode in development and serves the static `dist/` build in production (gated on `NODE_ENV`). It also hosts two POST JSON endpoints (`/api/ai/counselor`, `/api/ai/evaluate-application`) that call Gemini (`gemini-3.7-flash`) via `@google/genai`, each with a canned fallback when no API key is configured.

**Client-side routing without a router library.** [App.tsx](src/App.tsx) hand-rolls page routing over `window.history`/`popstate`: `getInitialPage()` resolves the current `Page` from pathname → legacy hash → `?page=` query param → default `home`; `handleNavigate` pushes state and updates `document.title`. Pages are plain conditionally-rendered components (`home | about | programs | research | contact | admin`), not lazy-loaded or split by route.

**Firebase is the only backend datastore.** [src/lib/firebase.ts](src/lib/firebase.ts) initializes the app from `firebase-applet-config.json` (a config file, not `.env`) and exports `db`/`auth` plus auth helpers (Google popup sign-in with full Workspace scopes, email/password, `initAuth`). [firestore.rules](firestore.rules) defaults to deny-all, then opens narrow per-collection rules — notably `applications`, `enterpriseInquiries`, and `contactMessages` allow unauthenticated `create` (public submission forms) but require sign-in for read/update. `firebase-blueprint.json` documents the intended entity schemas per collection; keep it in sync when changing Firestore document shapes.

**Two parallel "workflow" layers, don't confuse them:**
- [src/services/applicationWorkflow.ts](src/services/applicationWorkflow.ts) is a zero-API-key, fully deterministic admissions engine: it generates a readiness score, recommendations, and a confirmation email body from static rules keyed on `courseId`/experience text, then writes an audit doc to `application_workflows`. This runs client-side and does not call Gemini or the Express API routes.
- [server.ts](server.ts)'s `/api/ai/*` routes are a separate, optional Gemini-backed path used elsewhere in the UI (e.g. the AI counselor modal) for freeform advice; they are not wired into `applicationWorkflow.ts`.

**Google Workspace integration is a thin REST wrapper.** [src/services/workspace.ts](src/services/workspace.ts) calls Drive/Docs/Forms/Gmail/Tasks/Contacts/Calendar REST APIs directly with `fetch` using the OAuth access token obtained from Firebase's `GoogleAuthProvider` (scopes declared in `firebase.ts`). There is no Google API client library — every function builds its own request and throws on 401/403 with a "reconnect your account" message. `sendGmailMessage` hand-builds RFC 2822/MIME messages (including multipart attachments) and base64url-encodes them for the Gmail API.

**`StudentApplication` has multiple optional name fields** (`fullName`, `applicantName`, `name`, `candidateName`) because records originate from different write paths (public form vs. admin-created vs. legacy). Always resolve display names via `getCandidateName()` in [src/types.ts](src/types.ts) rather than reading a field directly — it falls back through the aliases and then derives a name from the email local-part. The same file's `getApplicationTimestamp`/`formatApplicationDate` similarly normalize Firestore `Timestamp` objects, epoch numbers, and ISO strings — use them instead of ad hoc date parsing.

**Admin console** ([src/pages/AdminPage.tsx](src/pages/AdminPage.tsx), 1500+ lines) is a single page with its own tab state (`admissions | activity | workspace | users | audit`) composing many dedicated components from `src/components/` (bulk email/status modals, CSV export via `src/services/csvExport.ts`, PDF generation via `src/services/pdfDocuments.ts`, audit trail, user management, workspace hub). Auth gating is done in-component via `initAuth`/`googleSignIn`/`emailPasswordSignIn`, not a route guard.

**Styling:** Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js` — v4 uses CSS-based config in `src/index.css`). Dark theme is baked into the HTML shell (`<html class="dark">`, hardcoded `bg-[#031427]`/`text-[#d3e4fe]` on `<body>` in [index.html](index.html)) rather than toggled at runtime.

**Path alias:** `@/*` maps to the repo root (see `vite.config.ts` and `tsconfig.json`), not `src/`.
