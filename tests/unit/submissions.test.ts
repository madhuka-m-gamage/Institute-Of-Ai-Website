import { describe, it, expect, vi, beforeEach } from 'vitest';

const { addDoc, auth } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  auth: { currentUser: null as null | { uid: string } },
}));
vi.mock('firebase/firestore', () => ({ collection: (_db: unknown, name: string) => name, addDoc: (...a: unknown[]) => addDoc(...a) }));
vi.mock('../../src/lib/firebase', () => ({ db: {}, auth }));

import { submitApplication, submitEnterpriseInquiry, submitContactMessage } from '../../src/site/services/submissions';

beforeEach(() => {
  addDoc.mockReset().mockResolvedValue({ id: 'x' });
  auth.currentUser = null;
});

describe('site submissions — Q8', () => {
  it('writes the application payload the rules expect, as a guest', async () => {
    await submitApplication({ name: ' Ada ', email: ' ada@x.com ', phone: '', courseId: 'c1', courseTitle: 'AI', experience: 'Beginner' });
    const [coll, data] = addDoc.mock.calls[0];
    expect(coll).toBe('applications');
    expect(Object.keys(data).sort()).toEqual(
      ['applicantName', 'background', 'candidateName', 'courseId', 'courseTitle', 'createdAt', 'email', 'experienceLevel', 'fullName', 'name', 'notes', 'phone', 'pythonProficiency', 'status', 'userId'].sort()
    );
    expect(data).toMatchObject({ fullName: 'Ada', email: 'ada@x.com', status: 'submitted', userId: 'guest_applicant' });
  });

  it('uses the signed-in uid when there is one', async () => {
    auth.currentUser = { uid: 'u1' };
    await submitContactMessage({ name: 'Sam', email: 's@x.com', inquiryType: 'academic', message: 'hello there' });
    expect(addDoc.mock.calls[0][1]).toMatchObject({ userId: 'u1' });
  });

  it('writes enterprise inquiries and contact messages to their collections', async () => {
    await submitEnterpriseInquiry({ companyName: 'Co', contactName: 'Pat', workEmail: 'p@co.com', teamSize: '15', primaryFocus: 'x', deliveryFormat: 'x', timeline: 'x' });
    await submitContactMessage({ name: 'Sam', email: 's@x.com', inquiryType: 'academic', message: 'hello there' });
    expect(addDoc.mock.calls.map((c) => c[0])).toEqual(['enterpriseInquiries', 'contactMessages']);
    expect(addDoc.mock.calls[0][1]).toMatchObject({ userId: 'guest_enterprise' });
    expect(addDoc.mock.calls[1][1]).toMatchObject({ userId: 'guest_contact' });
  });

  it('propagates write failures instead of swallowing them', async () => {
    addDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(submitContactMessage({ name: 'Sam', email: 's@x.com', inquiryType: 'academic', message: 'hello there' })).rejects.toThrow('permission-denied');
  });
});
