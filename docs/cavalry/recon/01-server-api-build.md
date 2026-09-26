# Recon — Server, API & Build

Commit audited: `9779fd9` (origin/main). Read-only; nothing was built, installed or run.

## Scope (files read)

- `server.ts`, `api/_lib/aiHandlers.ts`, `api/ai/counselor.ts`, `api/ai/evaluate-application.ts`, `api/health.ts`
- `vercel.json`, `vite.config.ts`, `package.json`, `tsconfig.json`, `index.html`, `.env.example`, `.gitignore`, `metadata.json`, `README.md`, `CLAUDE.md`
- `bun.lock` (versions only), `firebase-applet-config.json` (shape only)
- Callers: `src/components/AIAssistantModal.tsx` (only `/api` consumer); grep of `src/` for `fetch(`, `import.meta.env`, `process.env`, `evaluate-application`, `dotenv`

## What it does (entry points, dependencies, dependents)

| Entry point | Prod (Vercel) | Dev (`npm run dev`) | Caller in `src/` |
|---|---|---|---|
| `GET /api/health` | `api/health.ts` | `server.ts:13` | none |
| `POST /api/ai/counselor` | `api/ai/counselor.ts` → `handleCounselorRequest` | `server.ts:18` → same handler | `AIAssistantModal.tsx:34` |
| `POST /api/ai/evaluate-application` | `api/ai/evaluate-application.ts` → `handleEvaluateApplicationRequest` | `server.ts:24` → same handler | **none** |
| SPA | Vercel static `dist/` + rewrite `/((?!api/).*)` → `/index.html` | Vite middleware | — |

- Handlers (`api/_lib/aiHandlers.ts`) lazily build a `GoogleGenAI` client from `process.env.GEMINI_API_KEY`; if it's unset they return canned 200 responses. With a key, they interpolate request fields verbatim into a prompt and call `gemini-3.7-flash`.
- Dev/prod parity is good: both runtimes call the same shared handlers. Only differences: Vercel functions check the method explicitly (405), Express returns its default 404 HTML; body limits differ (Express `express.json()` 100 KB vs Vercel ~4.5 MB).
- This module has no auth, no rate limit, no input validation, no CORS config and no security headers.
- Counselor response is rendered as a React text node (`AIAssistantModal.tsx:192`), not HTML-injected and not persisted. The client swallows all errors and shows its own canned fallback (`AIAssistantModal.tsx:55-66`).
- Nothing in `src/` stores any `/api` response in Firestore. Nothing trusts or stores `evaluate-application` output, because nothing calls it.
- Client bundle secrets: `vite.config.ts` has no `define`, and `src/` has no `VITE_*` or `import.meta.env` usage. Only the public Firebase web config is bundled, which is by design.

## Docs vs code mismatches

- **SRV-1 (low)** `CLAUDE.md:7,25` describes a "single Express server" serving prod. Production is Vercel: static `dist/` + `api/*` serverless functions + `vercel.json`, and `api/` and `vercel.json` aren't mentioned at all. `CLAUDE.md:21,25,33` place the routes "in server.ts", but they live in `api/_lib/aiHandlers.ts`. **Fix:** rewrite the overview/architecture paragraphs to describe Vercel prod vs Express dev.
- **SRV-2 (medium)** `CLAUDE.md:21` and `README.md:13` say to set `GEMINI_API_KEY` in `.env.local`, but nothing loads `.env.local` into the server's `process.env`. `server.ts` never imports `dotenv` (a declared dependency that nothing uses), and `tsx` does not auto-load env files. Vite's env loading only exposes `VITE_*` to client code, not `process.env` (confirm by running it). So a developer following the docs silently gets the canned fallbacks. **Fix:** `import "dotenv/config"` (with `path: ".env.local"`) at top of `server.ts`, or `tsx --env-file=.env.local server.ts`; or drop `dotenv` and correct the docs.
- **SRV-3 (low)** `CLAUDE.md:33` says the `/api/ai/*` routes are "used elsewhere in the UI". Only `/api/ai/counselor` is used; `/api/ai/evaluate-application` has zero callers. See SRV-5.
- **SRV-4 (info)** Assorted stale docs and metadata:
  - `CLAUDE.md:7` references `assets/.aistudio/`, which does not exist at this commit.
  - `README.md` is the stock AI Studio template, with a link to an AI Studio app and no Vercel/deploy info.
  - `.env.example:8-11` documents `APP_URL`, which nothing reads.
  - `package.json:2` names the package `react-example`.

  **Fix:** prune or refresh these.

## Security findings (server enforcement vs client trust)

- **SRV-5 (high)** Anyone can use both Gemini endpoints as a free general-purpose Gemini proxy billed to the owner's key ("ignore the above, write me …"). (`api/ai/counselor.ts:3`, `api/ai/evaluate-application.ts:3`, `api/_lib/aiHandlers.ts:18,37-53,70,87-97`)
  - Both endpoints are anonymous and have no rate limit.
  - They insert arbitrary user strings into the model prompt with no length cap and return the raw model text. The fields are `prompt`, `currentExperience`, `targetGoals`, `applicantName`, `courseTitle`, `experience` and `notes`.
  - Vercel accepts bodies up to about 4.5 MB, so one request can carry about 1M tokens of input.
  - `evaluate-application` is dead code but still deployed, which doubles the exposed surface.
  - The cost impact only exists when `GEMINI_API_KEY` is set in Vercel (see Open questions).

  **Fix:**
  - (a) Delete `api/ai/evaluate-application.ts`, its `server.ts` route and its handler.
  - (b) On the counselor endpoint:
    - Require `typeof === "string"` for each field and enforce hard length caps (e.g. 500–1000 chars per field).
    - Set `maxOutputTokens`.
    - Add rate limiting: a Vercel Firewall rate-limit rule on `/api/ai/*`, or an Upstash/KV per-IP counter.
    - Set a GCP quota/budget alert on the Gemini key.
  - (c) Optionally require a Firebase App Check or reCAPTCHA token.
- **SRV-6 (medium)** `api/_lib/aiHandlers.ts:64,108` returns `err.message` from the Gemini SDK verbatim to anonymous callers. That message can reveal quota status, key validity, model-not-found errors and upstream request details. **Fix:** log the error server-side and return a generic `{ error: "Counselor unavailable" }`.
- **SRV-7 (medium)** There are no security headers in `vercel.json` (whole file) or `server.ts`. Missing: CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`; only Vercel's default HSTS applies.
  - The same SPA hosts the admin console, which uses Google sign-in with broad Workspace scopes, so `/admin` can be clickjacked.
  - Express also leaves `x-powered-by` enabled.

  **Fix:**
  - Add a `headers` block in `vercel.json` for `/(.*)` with `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.
  - Then add a CSP in report-only mode first. It must allow `fonts.googleapis.com`, `fonts.gstatic.com`, `lh3.googleusercontent.com`, Firebase/`*.googleapis.com`, `apis.google.com`, and `*.firebaseapp.com` frames for the auth popup.
- **SRV-8 (low)** `npm run build` (`package.json:7`) also writes `dist/server.cjs` and `dist/server.cjs.map` into `dist/`, which is Vercel's static output directory for Vite.
  - Both files are publicly downloadable at `/server.cjs` and `/server.cjs.map`, because Vercel serves files from the filesystem before applying the rewrite.
  - They contain server source (no secrets at this commit), but it is unintended exposure and wasted build time.

  **Fix:** split the scripts so `build` = `vite build` (what Vercel runs) and a separate `build:server` runs esbuild into a path outside `dist/` (e.g. `server-dist/`). Alternatively, set Vercel's build command to `vite build`.
- **SRV-9 (low)** `server.ts:8,44` binds `0.0.0.0` with Vite dev middleware in dev, which exposes the dev server (and the source files Vite serves) to the LAN. `PORT` is hard-coded and ignores `process.env.PORT`. **Fix:** bind `127.0.0.1` in dev unless the developer opts in, and use `const PORT = Number(process.env.PORT) || 3000`.
- **SRV-10 (info)** Neither runtime sets CORS headers. Browsers must send a preflight before cross-origin JSON POSTs, and without CORS headers those requests fail, which is the desired default. It does nothing against scripted abuse (SRV-5). No change is needed; do not add `Access-Control-Allow-Origin: *`.
- **SRV-11 (info)** Secrets handling:
  - `.gitignore:6-7` correctly ignores `.env*` except `.env.example`, and ignores `.vercel`.
  - The committed `firebase-applet-config.json` holds the public Firebase web API key. That is expected for Firebase: security relies on `firestore.rules` and on the key's API restrictions in GCP (see Open questions).
  - `metadata.json` declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, which is AI Studio metadata only.

## Bugs / data-integrity / cost risks

- **SRV-12 (medium)** `npm start` (`package.json:9`) runs `node dist/server.cjs` without `NODE_ENV=production`, so `server.ts:30` takes the dev branch.
  - It boots a Vite dev server from source, which needs devDependencies and serves unbundled code.
  - Express's default error handler also includes stack traces in error responses.
  - `CLAUDE.md:14` calls this "run the production build".

  **Fix:** `"start": "NODE_ENV=production node dist/server.cjs"` (or use cross-env). Alternatively, decide the Express prod path is unsupported and remove it (see Decision D2).
- **SRV-13 (medium)** In `api/_lib/aiHandlers.ts:59`, `prompt.toLowerCase()` runs *after* the paid Gemini call. A non-string truthy `prompt` (number, object or array) throws, which returns a 500 with the leaked error message after the tokens are already spent. Because fields go into the prompt through template strings, objects also become `[object Object]`. **Fix:** validate types before the call (part of SRV-5).
- **SRV-14 (low)** `api/_lib/aiHandlers.ts:77,103`: `evaluate-application` returns a hard-coded `score` of 95 or 96 regardless of input, and falls back to "Profile approved with distinction." That fake score would mislead if anyone ever wired it into admissions. This supports deleting the endpoint (SRV-5).
- **SRV-15 (low)** Failures are invisible (`api/_lib/aiHandlers.ts:21-35`, `AIAssistantModal.tsx:55-66`).
  - With no key, the server returns a canned 200.
  - On any error, including an invalid model name, the client shows the same canned text.
  - A misconfiguration in prod would therefore never surface.
  - Whether `gemini-3.7-flash` is a valid model id could not be verified offline.

  **Fix:** return a flag (e.g. `source: "fallback" | "gemini"`) and log it; call `/api/ai/counselor` once after each deploy to confirm real responses.
- **SRV-16 (low)** The `api/*.ts` functions have no `maxDuration` or region config, and Gemini latency counts against function duration. The counselor response shape is also inconsistent: it returns `keyFocusAreas` only in fallback mode. **Fix:** set `export const config = { maxDuration: 30 }` (or a `functions` entry in `vercel.json`), and set `maxOutputTokens` on the call.
- **SRV-17 (low)** Dependency hygiene in `package.json:12-24`:
  - Build tooling (`vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`) is listed in `dependencies`, and `vite` appears in both `dependencies` and `devDependencies`.
  - `dotenv` is unused (or needed — see SRV-2), and `autoprefixer` is unused (Tailwind v4 runs via the Vite plugin).
  - `bun.lock` is the only lockfile, while `.gitignore` ignores `package-lock.json` and all docs say `npm`. Vercel picks the installer from the lockfile, so a local `npm install` resolves different versions than prod.

  **Fix:** move build tools to devDependencies (the dev path in `server.ts` still works with devDependencies), remove duplicate and unused packages, and pick one package manager and commit its lockfile.
- **SRV-18 (info)** The `vercel.json:3` rewrite regex `/((?!api/).*)` does not exclude bare `/api`, which rewrites to `index.html` (harmless). `vercel.json` declares no `framework`, `outputDirectory` or `buildCommand`, so a correct deploy depends on Vercel auto-detecting Vite → `dist`. **Fix:** declare `"framework": "vite"`, `"outputDirectory": "dist"` and `"buildCommand": "vite build"` explicitly, which also resolves SRV-8.
- **SRV-19 (info)** `index.html:13-15,24,31` hot-links the favicon and OG images from `lh3.googleusercontent.com/aida-public/...`. These are AI Studio-generated URLs and may expire. **Fix:** copy the images into `public/`.

## Candidate decisions (items needing a human call)

- **D1: keep, harden, or remove the Gemini endpoints?**
  - Options:
    - (a) Remove both AI routes and the modal's network call; the client already has a deterministic fallback.
    - (b) Keep only the counselor endpoint, delete evaluate-application, and add validation, length caps, a Vercel Firewall rate limit and a GCP budget alert.
    - (c) Do (b) and also gate the endpoint with App Check or reCAPTCHA.
  - **Recommend (b)** now, and (c) if abuse is observed. Delete evaluate-application whichever option is chosen.
- **D2: is the Express `npm start` production path supported?**
  - Options:
    - (a) Drop it: Express becomes dev-only, `build` = `vite build`, and the esbuild step goes away.
    - (b) Keep it for non-Vercel hosting, and fix `NODE_ENV` and the output location.
  - **Recommend (a)**: it is the simplest, it removes SRV-8 and SRV-12, and it eliminates the risk of dev/prod drift.
- **D3: how strict should the security headers / CSP be?**
  - Options: basic headers only, or a full CSP.
  - **Recommend** basic headers plus `frame-ancestors 'none'` immediately. Ship the CSP as `Content-Security-Policy-Report-Only` first, because Firebase auth popups and Google Fonts need allow-listing.
- **D4: which package manager, npm or bun?**
  - **Recommend** whichever one Vercel's deploy logs show it actually uses, then align the docs and lockfile to it.

## Open questions (things you could not determine from code)

1. Is `GEMINI_API_KEY` set in the Vercel project (Production/Preview)? If not, SRV-5 costs nothing today (callers get canned responses), but it becomes a live cost risk as soon as the key is set.
2. Is `gemini-3.7-flash` a valid model id for the `@google/genai` 2.14 SDK and the key's GCP project? This could not be verified offline.
3. What are the Vercel project settings? The repo does not show the build command, output directory, install command, Node version, Firewall/rate-limit rules or Deployment Protection on previews.
4. Is the Firebase web API key in `firebase-applet-config.json` restricted in GCP (HTTP referrers plus an API allow-list)? Is the Gemini key in the same GCP project, and does it have a budget alert?
5. Does anyone run `vercel dev` instead of `npm run dev`? `vercel dev` may load `.env.local` itself, which would change how SRV-2 plays out.
