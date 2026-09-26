# Cavalry Fortify — Characterization Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin down what the risky code paths flagged by Recon *currently do* (including bugs), so each Charge fix can prove it changed exactly what it meant to change.

**Architecture:** Vitest (matches the existing Vite toolchain) for unit + component characterization tests under `tests/characterization/`; Firestore security rules characterized against the local emulator with `@firebase/rules-unit-testing` under `tests/rules/`, run via `firebase emulators:exec` using a test-only `firebase.test.json` (the real `firebase.json` arrives with commit `19232dc` in Charge Q1 — avoid a conflict).

**Tech Stack:** Vitest, jsdom, @testing-library/react, @firebase/rules-unit-testing, Firebase CLI emulator (Java 25 present).

**Spec:** `CAVALRY-TRACKER.md` (Resolved decisions + Follow-up backlog Q1–Q13) and `docs/cavalry/recon/01..05-*.md`.

## Global Constraints

- **Tests only.** No change to any file under `src/`, `api/`, `server.ts`, `firestore.rules`. If a test can't be written without changing app code, record it as "not covered" in the tracker instead.
- Characterization, not correctness: assertions pin *current* behavior, including bugs. Each `describe` names the finding ID and the Charge queue item (`Qn`) that is expected to flip it.
- If a test's first run contradicts the assertion, re-read the code, confirm the observed behavior is real, and pin the observed behavior (note it). Never edit app code to make a test pass.
- No network: rules tests use project id `demo-cavalry` (offline demo project); Gmail `fetch` is stubbed.
- Don't create `package-lock.json` yet (npm-only standardization is Charge Q13): install with `--no-package-lock`.

## File structure

- Create `vitest.config.ts` — Vitest config (React plugin, `@` alias, node default env).
- Create `firebase.test.json` — emulator-only config for rules tests.
- Create `tests/characterization/types.test.ts` — `getCandidateName`, `getApplicationTimestamp` (FB-12/13/14 → Q9).
- Create `tests/characterization/csvExport.test.ts` — formula injection, Timestamp dates (ADM-7 → Q10, FB-15 → Q9).
- Create `tests/characterization/gmailMime.test.ts` — `sendGmailMessage` raw MIME (GWS-1/9 → Q3).
- Create `tests/characterization/applyModal.test.tsx` — success-on-failure, workflow write, course preselect (PUB-8/10, PUB-4 → Q7/Q8).
- Create `tests/characterization/emailRichPreview.test.tsx` — crash with BulkEmailModal's props (GWS-2 → Q5).
- Create `tests/rules/firestore.rules.test.ts` — origin/main rules matrix (FB-1..5/9, ADM-1..3/5/6 → Q1, Q2, Q7).
- Modify `package.json` — devDeps + `test`, `test:rules` scripts.

---

### Task 1: Test harness

**Files:** Create `vitest.config.ts`, `firebase.test.json`; Modify `package.json`.

- [ ] **Step 1: Install dev deps**

Run: `npm install --no-package-lock --no-audit --no-fund -D vitest jsdom @testing-library/react @testing-library/dom @firebase/rules-unit-testing`

- [ ] **Step 2: Config files**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: { include: ['tests/**/*.test.{ts,tsx}'], environment: 'node' },
});
```

`firebase.test.json`:
```json
{ "emulators": { "firestore": { "host": "127.0.0.1", "port": 8080 }, "ui": { "enabled": false } } }
```

`package.json` scripts:
```json
"test": "vitest run tests/characterization",
"test:rules": "firebase --config firebase.test.json --project demo-cavalry emulators:exec --only firestore \"vitest run tests/rules\""
```

- [ ] **Step 3:** `npm test` → "No test files found" (expected, exit non-zero is fine at this step). Commit with Task 2.

### Task 2: Pure helpers (types.ts, csvExport.ts)

**Files:** Create `tests/characterization/types.test.ts`, `tests/characterization/csvExport.test.ts`.

- [ ] **Step 1: types.test.ts**
```ts
import { describe, it, expect } from 'vitest';
import { getCandidateName, getApplicationTimestamp } from '../../src/types';

describe('CHARACTERIZATION getCandidateName — FB-12/FB-13, flips in Charge Q9', () => {
  it('prefers fullName over aliases', () => {
    expect(getCandidateName({ fullName: 'Ada', name: 'Bob' })).toBe('Ada');
  });
  it('derives a name from the email local-part when names are empty', () => {
    expect(getCandidateName({ email: 'jane.doe42@x.com' })).toBe('Jane Doe');
  });
  it('BUG FB-12: throws on a non-string name (one bad public doc breaks the admin list)', () => {
    expect(() => getCandidateName({ fullName: 123 as any })).toThrow(TypeError);
  });
  it('BUG FB-13: literal "undefined" in fullName skips valid alias fields', () => {
    expect(getCandidateName({ fullName: 'undefined', applicantName: 'Real Name', email: 'x@y.com' })).toBe('Candidate');
  });
});

describe('CHARACTERIZATION getApplicationTimestamp — FB-14, flips in Charge Q9', () => {
  it('handles Firestore Timestamp-like objects', () => {
    expect(getApplicationTimestamp({ createdAt: { seconds: 10, nanoseconds: 5e6 } })).toBe(10005);
  });
  it('parses ISO strings', () => {
    expect(getApplicationTimestamp({ createdAt: '2026-01-01T00:00:00.000Z' })).toBe(Date.UTC(2026, 0, 1));
  });
  it('BUG FB-14: numbers are assumed to be milliseconds (epoch seconds pass through unscaled)', () => {
    expect(getApplicationTimestamp({ createdAt: 1_700_000_000 })).toBe(1_700_000_000);
  });
  it('trusts a client-supplied future date', () => {
    expect(getApplicationTimestamp({ createdAt: '2099-01-01T00:00:00Z' })).toBe(Date.UTC(2099, 0, 1));
  });
});
```
Note: FB-13 expectation — `'undefined'` is truthy so the `||` chain stops at fullName, the check rejects it, then falls to email → `'X'` is <2 chars → `'Candidate'`. Confirm on first run.

- [ ] **Step 2: csvExport.test.ts**
```ts
import { describe, it, expect } from 'vitest';
import { escapeCsvCell, formatCsvDate, generateCandidateCsv } from '../../src/services/csvExport';

describe('CHARACTERIZATION CSV formula injection — ADM-7, flips in Charge Q10', () => {
  it('quotes and doubles quotes (RFC 4180)', () => {
    expect(escapeCsvCell('a "b", c')).toBe('"a ""b"", c"');
  });
  it.each(['=HYPERLINK("http://evil")', '+1+1', '-2+3', '@SUM(A1)'])('BUG: leaves leading formula char in %s', (v) => {
    expect(escapeCsvCell(v).startsWith(`"${v[0]}`)).toBe(true);
  });
  it('BUG: applicant-supplied formula reaches the generated CSV verbatim', () => {
    const { csvString } = generateCandidateCsv([{ id: 'a1', fullName: '=cmd|"/c calc"!A1', email: 'e@x.com', courseId: 'c', status: 'submitted' } as any]);
    expect(csvString).toContain('"=cmd|""/c calc""!A1"');
  });
});

describe('CHARACTERIZATION CSV dates — FB-15, flips in Charge Q9', () => {
  it('formats ISO dates as UTC "YYYY-MM-DD HH:MM:SS"', () => {
    expect(formatCsvDate('2026-01-02T03:04:05.000Z')).toBe('2026-01-02 03:04:05');
  });
  it('current behavior with a Firestore Timestamp createdAt', () => {
    const ts = { seconds: 1, nanoseconds: 0, toDate: () => new Date(1000) };
    // Pin whatever generateCandidateCsv does today (throw or "[object Object]").
    let outcome: string;
    try { outcome = generateCandidateCsv([{ id: 't', email: 'e@x.com', createdAt: ts } as any]).csvString.includes('[object Object]') ? 'object-string' : 'other'; }
    catch { outcome = 'throws'; }
    expect(outcome).toMatchInlineSnapshot();
  });
});
```

- [ ] **Step 3:** `npm test` → all pass (inline snapshot gets written on first run — inspect it, it is the pinned behavior). If an assertion fails, re-read the code and pin the observed value per Global Constraints.
- [ ] **Step 4: Commit** `git add vitest.config.ts firebase.test.json package.json tests/characterization && git commit -m "test: characterization harness + helper tests (Cavalry fortify)"`

### Task 3: Gmail MIME construction

**Files:** Create `tests/characterization/gmailMime.test.ts`.

- [ ] **Step 1**
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendGmailMessage } from '../../src/services/workspace';

function captureRaw() {
  const fetchMock = vi.fn(async () => new Response('{"id":"m1"}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return () => {
    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    const b64 = body.raw.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(b64)));
  };
}
afterEach(() => vi.unstubAllGlobals());

describe('CHARACTERIZATION sendGmailMessage MIME — GWS-1/GWS-9, flips in Charge Q3', () => {
  it('builds a plain-text message with RFC 2047 subject', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'Hi', 'Body');
    const mime = raw();
    expect(mime).toContain('To: a@b.com\r\n');
    expect(mime).toMatch(/Subject: =\?utf-8\?B\?SGk=\?=/);
  });
  it('BUG GWS-1: CRLF in recipient injects a Bcc header', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'victim@x.com\r\nBcc: attacker@evil.com', 'S', 'B');
    expect(raw()).toContain('\r\nBcc: attacker@evil.com\r\n');
  });
  it('BUG GWS-1: comma-separated recipient list passes through', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@x.com, attacker@evil.com', 'S', 'B');
    expect(raw()).toContain('To: a@x.com, attacker@evil.com\r\n');
  });
  it('BUG GWS-9: attachment filename is not encoded (quote breaks header)', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'S', 'B', [{ filename: 'x".pdf', mimeType: 'application/pdf', dataBase64: 'QQ==' }]);
    expect(raw()).toContain('filename="x".pdf"');
  });
  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
    await expect(sendGmailMessage('tok', 'a@b.com', 'S', 'B')).rejects.toThrow('Gmail API error (401): nope');
  });
});
```
- [ ] **Step 2:** `npm test` → pass. **Step 3:** commit `test: characterize Gmail MIME construction`.

### Task 4: Component characterization (ApplyModal, EmailRichPreview)

**Files:** Create `tests/characterization/applyModal.test.tsx`, `tests/characterization/emailRichPreview.test.tsx`.

- [ ] **Step 1: applyModal.test.tsx**
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const addDoc = vi.fn();
vi.mock('firebase/firestore', () => ({ collection: (_db: unknown, name: string) => name, addDoc: (...a: unknown[]) => addDoc(...a) }));
vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { ApplyModal } from '../../src/components/ApplyModal';
import { COURSES } from '../../src/data/mockData';

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('e.g. Alex Mercer'), { target: { value: 'Ada Lovelace' } });
  fireEvent.change(screen.getByPlaceholderText('alex@organization.com'), { target: { value: 'ada@example.com' } });
  fireEvent.submit(screen.getByPlaceholderText('alex@organization.com').closest('form')!);
}

beforeEach(() => { addDoc.mockReset(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('CHARACTERIZATION ApplyModal submit — PUB-8, flips in Charge Q8', () => {
  it('writes the application (client-set status/createdAt/userId) then a workflow doc', async () => {
    addDoc.mockResolvedValue({ id: 'x' });
    render(<ApplyModal isOpen onClose={() => {}} />);
    fillAndSubmit();
    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(2));
    const [appColl, appData] = addDoc.mock.calls[0];
    expect(appColl).toBe('applications');
    expect(appData).toMatchObject({ status: 'submitted', userId: 'guest_applicant', email: 'ada@example.com' });
    expect(typeof appData.createdAt).toBe('string');
    expect(addDoc.mock.calls[1][0]).toBe('application_workflows'); // PUB-4, flips in Q7
  });
  it('BUG PUB-8: shows success even when every Firestore write fails', async () => {
    addDoc.mockRejectedValue(new Error('permission-denied'));
    render(<ApplyModal isOpen onClose={() => {}} />);
    fillAndSubmit();
    expect(await screen.findByText('Application Submitted & AI Workflow Executed')).toBeTruthy();
  });
});

describe('CHARACTERIZATION ApplyModal course preselect — PUB-10, flips in Charge Q8', () => {
  it('BUG: selectedCourseId changes after mount are ignored', () => {
    const { rerender } = render(<ApplyModal isOpen={false} onClose={() => {}} selectedCourseId={COURSES[0].id} />);
    rerender(<ApplyModal isOpen onClose={() => {}} selectedCourseId={COURSES[1].id} />);
    expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe(COURSES[0].id);
  });
});
```
Note: if `processApplicationWorkflow` catches its own addDoc failure, the PUB-8 path still reaches `finally`. Confirm on first run.

- [ ] **Step 2: emailRichPreview.test.tsx**
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EmailRichPreview } from '../../src/components/EmailRichPreview';

afterEach(cleanup);

describe('CHARACTERIZATION EmailRichPreview with BulkEmailModal props — GWS-2, flips in Charge Q5', () => {
  it('renders with the declared bodyText prop', () => {
    const { getByText } = render(<EmailRichPreview subject="S" bodyText="Hello there" recipientEmail="a@b.com" recipientName="A" status="submitted" courseTitle="C" />);
    expect(getByText(/Hello there/)).toBeTruthy();
  });
  it('BUG GWS-2: throws when given `body` (as BulkEmailModal.tsx:762 passes it)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const props: any = { subject: 'S', body: 'Hello', recipientName: 'A', status: 'submitted', courseTitle: 'C' };
    expect(() => render(<EmailRichPreview {...props} />)).toThrow(TypeError);
  });
});
```
- [ ] **Step 3:** `npm test` → pass. **Step 4:** commit `test: characterize ApplyModal and EmailRichPreview`.

### Task 5: Firestore rules (origin/main)

**Files:** Create `tests/rules/firestore.rules.test.ts`.

- [ ] **Step 1**
```ts
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-cavalry', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'applications', 'app1'), { applicantName: 'A', email: 'a@x.com', status: 'submitted', userId: 'guest_applicant' });
    await setDoc(doc(db, 'enterpriseInquiries', 'inq1'), { companyName: 'Co', workEmail: 'w@co.com', userId: 'guest_enterprise' });
    await setDoc(doc(db, 'contactMessages', 'msg1'), { email: 's@x.com', message: 'hi', userId: 'guest_contact' });
    await setDoc(doc(db, 'users', 'victim'), { email: 'v@x.com' });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
// Any internet user: Google sign-in or self-created email/password account.
const stranger = () => env.authenticatedContext('stranger', { email: 'random@gmail.com' }).firestore();

describe('CHARACTERIZATION rules: admin = anyone signed in — FB-1/FB-2/ADM-1, flips in Charge Q1', () => {
  it('anonymous cannot read applications', () => assertFails(getDoc(doc(anon(), 'applications/app1'))));
  it('BUG: any signed-in stranger reads all applications', () => assertSucceeds(getDocs(collection(stranger(), 'applications'))));
  it('BUG: any signed-in stranger reads contact messages', () => assertSucceeds(getDocs(collection(stranger(), 'contactMessages'))));
  it('BUG: stranger with email reads enterprise inquiries', () => assertSucceeds(getDoc(doc(stranger(), 'enterpriseInquiries/inq1'))));
  it('BUG: stranger with email accepts an application', () => assertSucceeds(updateDoc(doc(stranger(), 'applications/app1'), { status: 'accepted' })));
  it('BUG: stranger with email deletes an application', () => assertSucceeds(deleteDoc(doc(stranger(), 'applications/app1'))));
  it('stranger cannot update enterprise inquiries they do not own', () => assertFails(updateDoc(doc(stranger(), 'enterpriseInquiries/inq1'), { companyName: 'X' })));
});

describe('CHARACTERIZATION rules: unvalidated public create — FB-3/ADM-2/PUB-1, flips in Charge Q1', () => {
  it('BUG: anonymous creates an application pre-set to accepted with arbitrary fields', () =>
    assertSucceeds(addDoc(collection(anon(), 'applications'), { status: 'accepted', decisionLetterSent: true, junk: 'x'.repeat(100_000) })));
  it('BUG: anonymous creates arbitrary enterprise inquiry', () => assertSucceeds(addDoc(collection(anon(), 'enterpriseInquiries'), { anything: true })));
  it('BUG: anonymous creates arbitrary contact message', () => assertSucceeds(addDoc(collection(anon(), 'contactMessages'), { anything: true })));
});

describe('CHARACTERIZATION rules: application_workflows — FB-4/ADM-6/PUB-4, flips in Charge Q7', () => {
  it('BUG: anonymous can plant workflow/activity events', () => assertSucceeds(addDoc(collection(anon(), 'application_workflows'), { event: 'forged' })));
  it('workflow docs are immutable', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'application_workflows/w1'), { a: 1 }));
    await assertFails(updateDoc(doc(stranger(), 'application_workflows/w1'), { a: 2 }));
  });
});

describe('CHARACTERIZATION rules: adminAuditLogs has no rule — FB-5/ADM-3, flips in Charge Q2', () => {
  it('BUG: even a signed-in user cannot write audit logs (writes silently fail in app)', () =>
    assertFails(addDoc(collection(stranger(), 'adminAuditLogs'), { action: 'x' })));
  it('audit logs are unreadable', () => assertFails(getDocs(collection(stranger(), 'adminAuditLogs'))));
});

describe('CHARACTERIZATION rules: users collection — FB-9/ADM-5, flips in Charge Q1', () => {
  it('BUG: user can grant themselves a role field', () =>
    assertSucceeds(setDoc(doc(stranger(), 'users/stranger'), { role: 'super_admin' })));
  it('BUG: any signed-in user reads other users', () => assertSucceeds(getDoc(doc(stranger(), 'users/victim'))));
  it('cannot write someone else\'s user doc', () => assertFails(setDoc(doc(stranger(), 'users/victim'), { role: 'x' })));
});
```
- [ ] **Step 2:** `npm run test:rules` → all pass. **Step 3:** commit `test: characterize origin/main Firestore rules`.

### Task 6: Tracker handoff

- [ ] Update `CAVALRY-TRACKER.md`: Fortify row `done`; add "Characterization coverage" section (test file → findings → Q item → how to run); backlog rows for (a) `@types/react` missing + non-strict tsconfig ⇒ `npm run lint` does not type-check JSX props (found in fortify), (b) paths not covered (AdminPage auth gating UI, BulkEmailModal send loop GWS-10/11, BulkStatusModal ADM-10, PDF letters ADM-11..14 — too coupled to test without app changes; Charge must add tests test-first when it touches them).
- [ ] Commit `docs: Cavalry fortify coverage + handoff`.

## Self-review

- Spec coverage: Q1 (rules), Q2 (audit rules), Q3 (MIME), Q5 (GWS-2 crash), Q7 (workflow write + rules), Q8 (ApplyModal), Q9 (helpers), Q10 (CSV). Not covered by design: Q4 (scope removal — deletion, nothing to pin beyond reachability), Q6 (route removal), Q11 (tightly coupled modals), Q12/Q13 (config) — noted in Task 6.
- No placeholders; `toMatchInlineSnapshot()` in Task 2 is intentional (records observed behavior on first run).
