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

import { ApplyModal } from '../../src/site/components/ApplyModal';
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

describe('ApplyModal submit — Q7 (PUB-4/PUB-12/PUB D-4)', () => {
  it('writes only the application (no workflow/activity doc)', async () => {
    addDoc.mockResolvedValue({ id: 'x' });
    render(<ApplyModal isOpen onClose={() => {}} />);
    fillAndSubmit();
    await screen.findByText('Application Received');
    expect(addDoc).toHaveBeenCalledTimes(1);
    const [appColl, appData] = addDoc.mock.calls[0];
    expect(appColl).toBe('applications');
    expect(appData).toMatchObject({ status: 'submitted', userId: 'guest_applicant', email: 'ada@example.com' });
    expect(typeof appData.createdAt).toBe('string');
  });

  it('shows no readiness score, AI wording, or claim that an email was sent', async () => {
    addDoc.mockResolvedValue({ id: 'x' });
    render(<ApplyModal isOpen onClose={() => {}} />);
    fillAndSubmit();
    await screen.findByText('Application Received');
    expect(screen.queryByText(/Readiness Score/i)).toBeNull();
    expect(screen.queryByText(/AI Workflow|Agentic/i)).toBeNull();
    expect(screen.queryByText(/confirmation email|dispatch queued|email (was )?sent/i)).toBeNull();
  });
});

describe('ApplyModal submit failure — Q8 (PUB-8)', () => {
  it('shows an error and keeps the form, instead of success, when the write fails', async () => {
    addDoc.mockRejectedValue(new Error('permission-denied'));
    render(<ApplyModal isOpen onClose={() => {}} />);
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Application Received')).toBeNull();
    expect(screen.getByPlaceholderText('alex@organization.com')).toBeTruthy();
  });
});

describe('ApplyModal open/reset — Q8 (PUB-10/PUB-11)', () => {
  it('preselects the course passed when the modal opens', () => {
    const { rerender } = render(<ApplyModal isOpen={false} onClose={() => {}} selectedCourseId={COURSES[0].id} />);
    rerender(<ApplyModal isOpen onClose={() => {}} selectedCourseId={COURSES[1].id} />);
    expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe(COURSES[1].id);
  });

  it('starts empty again after closing and reopening', async () => {
    addDoc.mockResolvedValue({ id: 'x' });
    const { rerender } = render(<ApplyModal isOpen onClose={() => {}} />);
    fillAndSubmit();
    await screen.findByText('Application Received');
    rerender(<ApplyModal isOpen={false} onClose={() => {}} />);
    rerender(<ApplyModal isOpen onClose={() => {}} />);
    expect(screen.queryByText('Application Received')).toBeNull();
    expect((screen.getByPlaceholderText('e.g. Alex Mercer') as HTMLInputElement).value).toBe('');
  });
});
