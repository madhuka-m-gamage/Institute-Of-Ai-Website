import { describe, it, expect, vi, beforeEach } from 'vitest';

const { addDoc, auth } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  auth: { currentUser: { email: 'officer@x.com' } as { email: string } | null },
}));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => name,
  addDoc: (...a: unknown[]) => addDoc(...a),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));
vi.mock('../../src/lib/firebase', () => ({ db: {}, auth }));

import { logAdminAction } from '../../src/services/auditLog';

beforeEach(() => {
  addDoc.mockReset();
  auth.currentUser = { email: 'officer@x.com' };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('logAdminAction — Q2', () => {
  it('stamps the signed-in user as actor and the server time', async () => {
    addDoc.mockResolvedValue({ id: 'l1' });
    await logAdminAction({ action: 'A', entityType: 'application', entityId: 'app1', details: 'D' });
    expect(addDoc).toHaveBeenCalledWith('adminAuditLogs', {
      action: 'A', entityType: 'application', entityId: 'app1', details: 'D',
      actorEmail: 'officer@x.com', timestamp: 'SERVER_TIMESTAMP',
    });
  });

  it('drops undefined fields, which Firestore would reject (GWS-12)', async () => {
    addDoc.mockResolvedValue({ id: 'l1' });
    await logAdminAction({ action: 'A', entityType: 'application', details: 'D', newStatus: undefined });
    expect(addDoc.mock.calls[0][1]).not.toHaveProperty('newStatus');
  });

  it('does nothing when no one is signed in', async () => {
    auth.currentUser = null;
    await logAdminAction({ action: 'A', entityType: 'application', details: 'D' });
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('never throws — a failed audit write must not break the admin action', async () => {
    addDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(logAdminAction({ action: 'A', entityType: 'application', details: 'D' })).resolves.toBeUndefined();
  });
});
