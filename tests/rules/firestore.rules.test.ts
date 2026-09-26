import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

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
    await setDoc(doc(db, 'users', 'super'), { uid: 'super', email: 'super@x.com', role: 'super_admin' });
    await setDoc(doc(db, 'users', 'officer'), { uid: 'officer', email: 'officer@x.com', role: 'admissions_officer' });
    await setDoc(doc(db, 'users', 'faculty'), { uid: 'faculty', email: 'faculty@x.com', role: 'lead_faculty' });
    await setDoc(doc(db, 'users', 'mentor'), { uid: 'mentor', email: 'mentor@x.com', role: 'curriculum_mentor' });
    await setDoc(doc(db, 'users', 'norole'), { uid: 'norole', email: 'norole@x.com' });
    await setDoc(doc(db, 'applications', 'app1'), { applicantName: 'A', email: 'a@x.com', status: 'submitted', userId: 'guest_applicant', courseId: 'c', createdAt: 'x' });
    await setDoc(doc(db, 'enterpriseInquiries', 'inq1'), { companyName: 'Co', workEmail: 'w@co.com', userId: 'guest_enterprise' });
    await setDoc(doc(db, 'contactMessages', 'msg1'), { email: 's@x.com', message: 'hi', userId: 'guest_contact' });
    await setDoc(doc(db, 'application_workflows', 'w1'), { a: 1 });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const as = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@x.com`, email_verified: true }).firestore();
// Any internet user who signs in (Google or email/password) but has no staff role.
const stranger = () => as('stranger');

const validApplication = (userId = 'guest_applicant') => ({
  fullName: 'Ada Lovelace', applicantName: 'Ada Lovelace', name: 'Ada Lovelace', candidateName: 'Ada Lovelace',
  email: 'ada@example.com', phone: '', courseId: 'ai-master', courseTitle: 'AI Master', background: 'Intermediate',
  experienceLevel: 'Intermediate', pythonProficiency: 'Intermediate', status: 'submitted', notes: 'Phone: ',
  userId, createdAt: '2026-09-26T00:00:00.000Z',
});
const validInquiry = () => ({
  companyName: 'Co', contactName: 'Pat', workEmail: 'pat@co.com', phone: '', jobTitle: '', teamSize: '15-40',
  primaryFocus: 'x', deliveryFormat: 'x', timeline: 'x', customRequirements: '', userId: 'guest_enterprise', createdAt: 'x',
});
const validContact = () => ({ name: 'Sam', email: 's@x.com', inquiryType: 'academic', message: 'hi', userId: 'guest_contact', createdAt: 'x' });

describe('Q1 rules: applicant data is staff-only (FB-1/FB-2/ADM-1)', () => {
  it('anonymous cannot read applications', () => assertFails(getDoc(doc(anon(), 'applications/app1'))));
  it('signed-in non-staff cannot read applications', () => assertFails(getDocs(collection(stranger(), 'applications'))));
  it('signed-in non-staff cannot read contact messages', () => assertFails(getDocs(collection(stranger(), 'contactMessages'))));
  it('signed-in non-staff cannot read enterprise inquiries', () => assertFails(getDoc(doc(stranger(), 'enterpriseInquiries/inq1'))));
  it('signed-in non-staff cannot read workflow events', () => assertFails(getDocs(collection(stranger(), 'application_workflows'))));
  it('signed-in non-staff cannot update or delete an application', async () => {
    await assertFails(updateDoc(doc(stranger(), 'applications/app1'), { status: 'accepted' }));
    await assertFails(deleteDoc(doc(stranger(), 'applications/app1')));
  });
  it('a user doc without a role grants nothing', () => assertFails(getDocs(collection(as('norole'), 'applications'))));

  it('every staff role can read applications', async () => {
    for (const uid of ['super', 'officer', 'faculty', 'mentor']) {
      await assertSucceeds(getDocs(collection(as(uid), 'applications')));
    }
  });
  it('super_admin and admissions_officer update applications; faculty and mentor cannot', async () => {
    await assertSucceeds(updateDoc(doc(as('super'), 'applications/app1'), { status: 'accepted' }));
    await assertSucceeds(updateDoc(doc(as('officer'), 'applications/app1'), { status: 'waitlisted' }));
    await assertFails(updateDoc(doc(as('faculty'), 'applications/app1'), { status: 'accepted' }));
    await assertFails(updateDoc(doc(as('mentor'), 'applications/app1'), { status: 'accepted' }));
  });
  it('only super_admin deletes applications', async () => {
    await assertFails(deleteDoc(doc(as('officer'), 'applications/app1')));
    await assertSucceeds(deleteDoc(doc(as('super'), 'applications/app1')));
  });
  it('super_admin and admissions_officer manage inquiries and contact messages; faculty cannot', async () => {
    await assertSucceeds(getDoc(doc(as('officer'), 'enterpriseInquiries/inq1')));
    await assertSucceeds(updateDoc(doc(as('super'), 'contactMessages/msg1'), { read: true }));
    await assertFails(getDoc(doc(as('faculty'), 'enterpriseInquiries/inq1')));
  });
});

describe('Q1 rules: public submissions are validated (FB-3/ADM-2/PUB-1)', () => {
  it('accepts the exact application the Apply form writes', () =>
    assertSucceeds(addDoc(collection(anon(), 'applications'), validApplication())));
  it('rejects an application pre-set to accepted', () =>
    assertFails(addDoc(collection(anon(), 'applications'), { ...validApplication(), status: 'accepted' })));
  it('rejects unknown fields', () =>
    assertFails(addDoc(collection(anon(), 'applications'), { ...validApplication(), decisionLetterSent: true })));
  it('rejects oversized fields', () =>
    assertFails(addDoc(collection(anon(), 'applications'), { ...validApplication(), notes: 'x'.repeat(100_000) })));
  it('rejects an anonymous application claiming another user id', () =>
    assertFails(addDoc(collection(anon(), 'applications'), validApplication('someone-else'))));
  it('accepts the exact enterprise inquiry the Enterprise form writes', () =>
    assertSucceeds(addDoc(collection(anon(), 'enterpriseInquiries'), validInquiry())));
  it('rejects an arbitrary enterprise inquiry', () =>
    assertFails(addDoc(collection(anon(), 'enterpriseInquiries'), { anything: true })));
  it('accepts the exact contact message the Contact page writes', () =>
    assertSucceeds(addDoc(collection(anon(), 'contactMessages'), validContact())));
  it('rejects a contact message with an unknown inquiry type', () =>
    assertFails(addDoc(collection(anon(), 'contactMessages'), { ...validContact(), inquiryType: 'spam' })));
});

describe('Q1 rules: users collection (FB-9/ADM-5)', () => {
  it('a user may create their own role-less profile', () =>
    assertSucceeds(setDoc(doc(stranger(), 'users/stranger'), { uid: 'stranger', email: 'stranger@x.com' })));
  it('a user cannot grant themselves a role on create', () =>
    assertFails(setDoc(doc(stranger(), 'users/stranger'), { role: 'super_admin' })));
  it('a user cannot change their own role', () =>
    assertFails(updateDoc(doc(as('officer'), 'users/officer'), { role: 'super_admin' })));
  it('non-staff cannot read other users', () => assertFails(getDoc(doc(stranger(), 'users/super'))));
  it('super_admin can assign roles', () =>
    assertSucceeds(updateDoc(doc(as('super'), 'users/norole'), { role: 'admissions_officer' })));
});

describe('Q7 rules: application_workflows is closed (FB-4/ADM-6/PUB-4)', () => {
  it('anonymous cannot plant workflow/activity events', () =>
    assertFails(addDoc(collection(anon(), 'application_workflows'), { event: 'forged' })));
  it('even staff cannot write or read it any more', async () => {
    await assertFails(addDoc(collection(as('super'), 'application_workflows'), { event: 'x' }));
    await assertFails(updateDoc(doc(as('super'), 'application_workflows/w1'), { a: 2 }));
    await assertFails(getDocs(collection(as('super'), 'application_workflows')));
  });
});

describe('Q2 rules: adminAuditLogs is a staff-only, unforgeable, append-only trail (FB-5/ADM-3/GWS-12)', () => {
  const entry = (actorEmail: string) => ({
    action: 'Updated applicant status to ACCEPTED', entityType: 'application', entityId: 'app1',
    details: 'Status transitioned to ACCEPTED.', actorEmail, timestamp: serverTimestamp(),
  });

  it('staff can append an entry stamped with their own email and the server time', () =>
    assertSucceeds(addDoc(collection(as('officer'), 'adminAuditLogs'), entry('officer@x.com'))));
  it('rejects an entry claiming another actor', () =>
    assertFails(addDoc(collection(as('officer'), 'adminAuditLogs'), entry('super@x.com'))));
  it('rejects a client-supplied timestamp', () =>
    assertFails(addDoc(collection(as('officer'), 'adminAuditLogs'), { ...entry('officer@x.com'), timestamp: '2026-01-01T00:00:00.000Z' })));
  it('rejects unknown fields', () =>
    assertFails(addDoc(collection(as('officer'), 'adminAuditLogs'), { ...entry('officer@x.com'), forged: true })));
  it('rejects oversized details', () =>
    assertFails(addDoc(collection(as('officer'), 'adminAuditLogs'), { ...entry('officer@x.com'), details: 'x'.repeat(5000) })));
  it('non-staff cannot write audit logs', () => assertFails(addDoc(collection(stranger(), 'adminAuditLogs'), entry('stranger@x.com'))));
  it('staff can read; non-staff cannot', async () => {
    await assertSucceeds(getDocs(collection(as('faculty'), 'adminAuditLogs')));
    await assertFails(getDocs(collection(stranger(), 'adminAuditLogs')));
  });
  it('audit logs are immutable and undeletable, even for super_admin', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'adminAuditLogs/l1'), { action: 'x' }));
    await assertFails(updateDoc(doc(as('super'), 'adminAuditLogs/l1'), { action: 'y' }));
    await assertFails(deleteDoc(doc(as('super'), 'adminAuditLogs/l1')));
  });
});
