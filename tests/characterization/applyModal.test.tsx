// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const addDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => name,
  addDoc: (...a: unknown[]) => addDoc(...a),
}));
vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { ApplyModal } from '../../src/components/ApplyModal';
import { COURSES } from '../../src/data/mockData';

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('e.g. Alex Mercer'), { target: { value: 'Ada Lovelace' } });
  fireEvent.change(screen.getByPlaceholderText('alex@organization.com'), { target: { value: 'ada@example.com' } });
  fireEvent.submit(screen.getByPlaceholderText('alex@organization.com').closest('form')!);
}

beforeEach(() => {
  addDoc.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
    // PUB-4: client writes the forgeable workflow/activity doc — flips in Charge Q7
    expect(addDoc.mock.calls[1][0]).toBe('application_workflows');
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
