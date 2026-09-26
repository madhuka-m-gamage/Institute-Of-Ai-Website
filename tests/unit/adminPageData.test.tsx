// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const { getDocs, queries } = vi.hoisted(() => ({
  getDocs: vi.fn(),
  queries: [] as { name: string; constraints: unknown[] }[],
}));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  FIRESTORE_DATABASE_ID: 'ioai-website',
  initAuth: (onSuccess: (u: unknown, t: string) => void) => {
    onSuccess({ uid: 'owner', email: 'owner@x.com', displayName: 'Owner' }, '');
    return () => {};
  },
  googleSignIn: vi.fn(),
  emailPasswordSignIn: vi.fn(),
  logout: vi.fn(),
  getGmailSendToken: vi.fn(),
  clearGmailSendToken: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  orderBy: (field: string, dir: string) => ({ orderBy: [field, dir] }),
  limit: (n: number) => ({ limit: n }),
  query: (coll: { name: string }, ...constraints: unknown[]) => {
    queries.push({ name: coll.name, constraints });
    return coll;
  },
  getDocs: (q: { name: string }) => getDocs(q.name),
  getDoc: async () => ({ exists: () => true, data: () => ({ role: 'super_admin' }) }),
  onSnapshot: () => () => {},
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  where: vi.fn(),
  deleteField: vi.fn(),
  serverTimestamp: vi.fn(),
}));

import { AdminPage } from '../../src/admin/AdminPage';

const snap = (docs: { id: string; data: any }[]) => ({ docs: docs.map((d) => ({ id: d.id, data: () => d.data })) });

beforeEach(() => {
  queries.length = 0;
  getDocs.mockReset().mockImplementation(async () => snap([]));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AdminPage data load — Q9 (ADM-8/FB-12)', () => {
  it('loads each collection newest-first with a limit, instead of the whole collection', async () => {
    render(<AdminPage />);
    await waitFor(() => expect(getDocs).toHaveBeenCalledTimes(3));
    expect(getDocs.mock.calls.map((c) => c[0]).sort()).toEqual(['applications', 'contactMessages', 'enterpriseInquiries']);
    // The notification bell queries the same collections (limit 20); the page's own loads use a larger limit.
    const loads = queries.filter((q) => (q.constraints[1] as { limit: number }).limit > 20);
    expect(loads.map((q) => q.name).sort()).toEqual(['applications', 'contactMessages', 'enterpriseInquiries']);
    for (const q of loads) expect(q.constraints[0]).toEqual({ orderBy: ['createdAt', 'desc'] });
  });

  it('reports a failed load instead of claiming the sync completed', async () => {
    getDocs.mockImplementation(async (name: string) => {
      if (name === 'enterpriseInquiries') throw new Error('permission-denied');
      return snap([]);
    });
    render(<AdminPage />);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringMatching(/enterprise inquiries/i));
    expect(screen.queryByText(/Live sync complete/i)).toBeNull();
  });

  it('still lists applications when one document has a malformed name', async () => {
    getDocs.mockImplementation(async (name: string) =>
      name === 'applications'
        ? snap([
            { id: 'bad', data: { fullName: 123, email: 'bad@x.com', courseTitle: 'AI', status: 'submitted' } },
            { id: 'ok', data: { fullName: 'Grace Hopper', email: 'g@x.com', courseTitle: 'AI', status: 'submitted' } },
          ])
        : snap([])
    );
    render(<AdminPage />);
    expect((await screen.findAllByText('Grace Hopper')).length).toBeGreaterThan(0);
  });

  it('shows the database the console is actually connected to', async () => {
    render(<AdminPage />);
    expect(await screen.findByText('ioai-website')).toBeTruthy();
    expect(screen.queryByText(/ai-studio-instituteofaiweb/)).toBeNull();
  });
});
