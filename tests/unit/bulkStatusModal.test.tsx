// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { batches, commit, runTransaction, remoteNotes } = vi.hoisted(() => ({
  batches: [] as { ref: string; data: Record<string, unknown> }[][],
  commit: vi.fn(),
  runTransaction: vi.fn(),
  remoteNotes: {} as Record<string, string>,
}));

vi.mock('../../src/lib/firebase', () => ({ db: {} }));
vi.mock('../../src/admin/services/auditLog', () => ({ logAdminAction: vi.fn(async () => undefined) }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, coll: string, id: string) => `${coll}/${id}`,
  writeBatch: () => {
    const ops: { ref: string; data: Record<string, unknown> }[] = [];
    batches.push(ops);
    return { update: (ref: string, data: Record<string, unknown>) => ops.push({ ref, data }), commit: () => commit(ops) };
  },
  runTransaction: (_db: unknown, fn: (tx: unknown) => Promise<void>) => runTransaction(fn),
}));

import { BulkStatusModal } from '../../src/admin/components/BulkStatusModal';
import type { StudentApplication } from '../../src/types';

const apps = (n: number): StudentApplication[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `a${i}`, fullName: `N${i}`, email: `n${i}@x.com`, courseId: 'c', courseTitle: 'C', status: 'submitted', notes: 'stale copy',
  }));

const setup = (selected: StudentApplication[]) => {
  const onBulkUpdated = vi.fn();
  const onAddToast = vi.fn();
  render(
    <BulkStatusModal isOpen onClose={() => {}} selectedApplications={selected} currentAdminEmail="o@x.com" onBulkUpdated={onBulkUpdated} onAddToast={onAddToast} />
  );
  return { onBulkUpdated, onAddToast };
};
const apply = () => fireEvent.click(screen.getByRole('button', { name: /Update \d+ Candidate/ }));

beforeEach(() => {
  batches.length = 0;
  commit.mockReset().mockResolvedValue(undefined);
  for (const k of Object.keys(remoteNotes)) delete remoteNotes[k];
  runTransaction.mockReset().mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      get: async (ref: string) => ({ exists: () => true, data: () => ({ notes: remoteNotes[ref] ?? '' }) }),
      update: (ref: string, data: { notes?: string }) => { if (data.notes !== undefined) remoteNotes[ref] = data.notes; },
    };
    await fn(tx);
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BulkStatusModal — Q11 (ADM-10)', () => {
  it('splits more than 500 updates into batches Firestore accepts', async () => {
    const { onBulkUpdated } = setup(apps(1001));
    apply();
    await waitFor(() => expect(onBulkUpdated).toHaveBeenCalled());
    expect(batches.map((b) => b.length)).toEqual([500, 500, 1]);
    expect(onBulkUpdated.mock.calls[0][0]).toHaveLength(1001);
  });

  it('does not write notes when no batch note is given', async () => {
    const { onBulkUpdated } = setup(apps(2));
    apply();
    await waitFor(() => expect(onBulkUpdated).toHaveBeenCalled());
    for (const op of batches.flat()) expect(op.data).not.toHaveProperty('notes');
  });

  it('appends a batch note to the current stored notes, not the stale local copy', async () => {
    remoteNotes['applications/a0'] = 'edited by another admin';
    const { onBulkUpdated } = setup(apps(1));
    fireEvent.change(screen.getByPlaceholderText(/Bulk approved/), { target: { value: 'Round 1' } });
    apply();
    await waitFor(() => expect(onBulkUpdated).toHaveBeenCalled());
    expect(remoteNotes['applications/a0']).toBe('edited by another admin\n\n[Batch Update]: Round 1');
  });

  it('reports a partial failure and only passes back the records that were saved', async () => {
    commit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('quota'));
    const { onBulkUpdated, onAddToast } = setup(apps(600));
    apply();
    await waitFor(() => expect(onAddToast).toHaveBeenCalled());
    expect(onBulkUpdated.mock.calls[0][0]).toHaveLength(500);
    const [title, message, type] = onAddToast.mock.calls.at(-1)!;
    expect(type).toBe('error');
    expect(`${title} ${message}`).toMatch(/500 of 600/);
  });
});
