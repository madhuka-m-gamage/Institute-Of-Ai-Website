import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cavalry',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
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

const OWNER_EMAIL = 'madhuka.m.gamage@gmail.com';
const anon = () => env.unauthenticatedContext().firestore();
// Any internet user: Google sign-in or a self-created email/password account.
const stranger = () => env.authenticatedContext('stranger', { email: 'random@gmail.com', email_verified: true }).firestore();
const owner = () => env.authenticatedContext('owner', { email: OWNER_EMAIL, email_verified: true }).firestore();
const ownerUnverified = () => env.authenticatedContext('spoof', { email: OWNER_EMAIL, email_verified: false }).firestore();

// Stopgap hotfix: PII access restricted to the owner's verified email. Superseded by Charge Q1 (role model).
describe('STOPGAP rules: PII access is owner-only — FB-1/FB-2/ADM-1', () => {
  it('anonymous cannot read applications', () => assertFails(getDoc(doc(anon(), 'applications/app1'))));
  it('signed-in stranger cannot read applications', () => assertFails(getDocs(collection(stranger(), 'applications'))));
  it('signed-in stranger cannot read contact messages', () => assertFails(getDocs(collection(stranger(), 'contactMessages'))));
  it('signed-in stranger cannot read enterprise inquiries', () => assertFails(getDoc(doc(stranger(), 'enterpriseInquiries/inq1'))));
  it('signed-in stranger cannot read workflow events', () => assertFails(getDocs(collection(stranger(), 'application_workflows'))));
  it('signed-in stranger cannot update an application', () =>
    assertFails(updateDoc(doc(stranger(), 'applications/app1'), { status: 'accepted' })));
  it('signed-in stranger cannot delete an application', () => assertFails(deleteDoc(doc(stranger(), 'applications/app1'))));
  it('stranger cannot update enterprise inquiries', () =>
    assertFails(updateDoc(doc(stranger(), 'enterpriseInquiries/inq1'), { companyName: 'X' })));
  it('unverified account claiming the owner email is denied', () => assertFails(getDocs(collection(ownerUnverified(), 'applications'))));

  it('owner reads applications, inquiries, contact messages, workflows', async () => {
    await assertSucceeds(getDocs(collection(owner(), 'applications')));
    await assertSucceeds(getDocs(collection(owner(), 'enterpriseInquiries')));
    await assertSucceeds(getDocs(collection(owner(), 'contactMessages')));
    await assertSucceeds(getDocs(collection(owner(), 'application_workflows')));
  });
  it('owner updates and deletes applications', async () => {
    await assertSucceeds(updateDoc(doc(owner(), 'applications/app1'), { status: 'accepted' }));
    await assertSucceeds(deleteDoc(doc(owner(), 'applications/app1')));
  });
  it('owner updates enterprise inquiries and contact messages', async () => {
    await assertSucceeds(updateDoc(doc(owner(), 'enterpriseInquiries/inq1'), { companyName: 'X' }));
    await assertSucceeds(updateDoc(doc(owner(), 'contactMessages/msg1'), { read: true }));
  });
});

describe('CHARACTERIZATION rules: unvalidated public create — FB-3/ADM-2/PUB-1, flips in Charge Q1', () => {
  it('BUG: anonymous creates an application pre-set to accepted with arbitrary fields', () =>
    assertSucceeds(addDoc(collection(anon(), 'applications'), { status: 'accepted', decisionLetterSent: true, junk: 'x'.repeat(100_000) })));
  it('BUG: anonymous creates arbitrary enterprise inquiry', () =>
    assertSucceeds(addDoc(collection(anon(), 'enterpriseInquiries'), { anything: true })));
  it('BUG: anonymous creates arbitrary contact message', () =>
    assertSucceeds(addDoc(collection(anon(), 'contactMessages'), { anything: true })));
});

describe('CHARACTERIZATION rules: application_workflows — FB-4/ADM-6/PUB-4, flips in Charge Q7', () => {
  it('BUG: anonymous can plant workflow/activity events', () =>
    assertSucceeds(addDoc(collection(anon(), 'application_workflows'), { event: 'forged' })));
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
  it('STOPGAP: signed-in user cannot read other users', () => assertFails(getDoc(doc(stranger(), 'users/victim'))));
  it("cannot write someone else's user doc", () => assertFails(setDoc(doc(stranger(), 'users/victim'), { role: 'x' })));
});
