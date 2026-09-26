// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const getDocs = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: () => 'adminAuditLogs',
  query: (c: unknown) => c,
  orderBy: () => null,
  limit: () => null,
  getDocs: (...a: unknown[]) => getDocs(...a),
}));
vi.mock('../../src/lib/firebase', () => ({ db: {} }));
vi.mock('../../src/components/RecentActivityPanel', () => ({ RecentActivityPanel: () => null }));

import { AdminAuditTrailPanel } from '../../src/components/AdminAuditTrailPanel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function openSystemView() {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  render(<AdminAuditTrailPanel />);
  screen.getAllByRole('button').find((b) => /system/i.test(b.textContent || ''))!.click();
  await waitFor(() => expect(getDocs).toHaveBeenCalled());
}

describe('AdminAuditTrailPanel — Q2 (ADM-3)', () => {
  it('shows no fabricated entries when the audit log cannot be read', async () => {
    getDocs.mockRejectedValue(new Error('permission-denied'));
    await openSystemView();
    await waitFor(() => expect(screen.queryByText('Institutional Command Center Initialized')).toBeNull());
    expect(screen.queryByText('Admissions Pipeline Synced')).toBeNull();
  });

  it('renders real entries whose timestamp is a Firestore Timestamp', async () => {
    getDocs.mockResolvedValue({
      docs: [{ id: 'l1', data: () => ({ action: 'Real entry', entityType: 'application', details: 'd', actorEmail: 'officer@x.com', timestamp: { toDate: () => new Date('2026-09-26T03:00:00Z') } }) }],
    });
    await openSystemView();
    expect(await screen.findByText('Real entry')).toBeTruthy();
  });
});
