# Institute Of AI — website

Marketing and admissions site: a static React SPA (Vite) on Vercel, with Firebase Auth + Firestore as the backend.

## Run locally

**Prerequisites:** Node.js (and Java + the Firebase CLI for the rules tests).

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev` → http://localhost:3000

No environment variables are needed; the Firebase web config lives in `firebase-applet-config.json`.

## Checks

- `npm run lint` — TypeScript check
- `npm test` — unit and characterization tests
- `npm run test:rules` — Firestore security rules tests (local emulator)

See [CLAUDE.md](CLAUDE.md) for architecture notes and [CAVALRY-TRACKER.md](CAVALRY-TRACKER.md) for the security/quality program.
