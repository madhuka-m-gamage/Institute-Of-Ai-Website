// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

type Listener = (snap: { docChanges: () => { type: string; doc: { id: string; data: () => any } }[] }) => void;
const { listeners, queries } = vi.hoisted(() => ({
  listeners: {} as Record<string, Listener>,
  queries: {} as Record<string, unknown[]>,
}));

vi.mock('../../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  orderBy: (field: string, dir: string) => ({ orderBy: [field, dir] }),
  limit: (n: number) => ({ limit: n }),
  query: (coll: { name: string }, ...constraints: unknown[]) => {
    queries[coll.name] = constraints;
    return coll;
  },
  onSnapshot: (q: { name: string }, onNext: Listener) => {
    listeners[q.name] = onNext;
    return () => {};
  },
}));

import { AdminNotificationBell } from '../../src/admin/components/AdminNotificationBell';

const added = (id: string, data: any) => ({ type: 'added', doc: { id, data: () => data } });
const fire = (coll: string, ...changes: ReturnType<typeof added>[]) =>
  act(() => listeners[coll]({ docChanges: () => changes }));
const openBell = () => fireEvent.click(screen.getByLabelText('Open Notifications'));

beforeEach(() => {
  for (const k of Object.keys(listeners)) delete listeners[k];
  for (const k of Object.keys(queries)) delete queries[k];
});
afterEach(cleanup);

describe('AdminNotificationBell — Q9 (FB-17/ADM-15)', () => {
  it('asks each collection for its 20 newest documents', () => {
    render(<AdminNotificationBell />);
    for (const coll of ['applications', 'enterpriseInquiries', 'contactMessages']) {
      expect(queries[coll]).toEqual([{ orderBy: ['createdAt', 'desc'] }, { limit: 20 }]);
    }
  });

  it('shows existing documents as already read; only later arrivals count as unread', () => {
    render(<AdminNotificationBell />);
    fire('applications', added('a1', { fullName: 'Old One', createdAt: '2026-01-01T00:00:00Z' }), added('a2', { fullName: 'Old Two' }));
    fire('enterpriseInquiries');
    fire('contactMessages');
    expect(screen.queryByText(/^\d+$/)).toBeNull();

    fire('applications', added('a3', { fullName: 'Brand New' }));
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('uses the normalized candidate name and renders Firestore Timestamps', () => {
    render(<AdminNotificationBell />);
    fire('applications');
    fire('applications', added('a4', {
      fullName: 123,
      applicantName: 'Grace Hopper',
      createdAt: { toDate: () => new Date(Date.UTC(2026, 0, 2, 3, 4)) },
    }));
    openBell();
    expect(screen.getByText(/Grace Hopper/)).toBeTruthy();
    expect(screen.queryByText('Invalid Date')).toBeNull();
  });

  it('passes normalized application data to the click handler', () => {
    const onSelect = vi.fn();
    render(<AdminNotificationBell onSelectNotification={onSelect} />);
    fire('applications');
    fire('applications', added('a5', { fullName: 'undefined', applicantName: 'Ada', email: 'ada@x.com' }));
    openBell();
    fireEvent.click(screen.getByText(/Ada/));
    expect(onSelect.mock.calls[0][0].data).toMatchObject({ id: 'a5', fullName: 'Ada' });
  });
});
