// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

const { sendGmailMessage, updateDoc, batchCommit } = vi.hoisted(() => ({
  sendGmailMessage: vi.fn(),
  updateDoc: vi.fn(),
  batchCommit: vi.fn(),
}));

const { clearGmailSendToken } = vi.hoisted(() => ({ clearGmailSendToken: vi.fn() }));
vi.mock('../../src/lib/firebase', () => ({ db: {}, getGmailSendToken: vi.fn(async () => 'tok'), clearGmailSendToken }));
vi.mock('../../src/services/auditLog', () => ({ logAdminAction: vi.fn(async () => undefined) }));
vi.mock('../../src/services/workspace', () => ({ sendGmailMessage }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, coll: string, id: string) => `${coll}/${id}`,
  updateDoc,
  writeBatch: () => ({ update: vi.fn(), commit: batchCommit }),
}));
vi.mock('../../src/services/pdfDocuments', () => ({
  getAvailableDocumentsForProgram: () => [],
  generateProgramPDF: () => ({ filename: 'doc.pdf', mimeType: 'application/pdf', dataBase64: 'QQ==' }),
  downloadProgramPDF: vi.fn(),
  resolveProgramDetails: () => ({ id: 'c1', title: 'AI Course' }),
}));

import { BulkEmailModal } from '../../src/components/BulkEmailModal';
import type { StudentApplication } from '../../src/types';

const app = (id: string, email: string): StudentApplication =>
  ({ id, email, fullName: `Name ${id}`, courseId: 'c1', courseTitle: 'AI Course', status: 'submitted' } as StudentApplication);

const props = (selected: StudentApplication[]) => ({
  isOpen: true,
  onClose: vi.fn(),
  selectedApplications: selected,
  currentAdminEmail: 'officer@x.com',
  onBulkCompleted: vi.fn(),
  onAddToast: vi.fn(),
});

const dispatch = () => fireEvent.click(screen.getByRole('button', { name: /Dispatch to All/i }));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  sendGmailMessage.mockReset().mockResolvedValue({ id: 'm' });
  updateDoc.mockReset().mockResolvedValue(undefined);
  batchCommit.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('BulkEmailModal — Q5', () => {
  it('renders the live preview without crashing (GWS-2)', () => {
    render(<BulkEmailModal {...props([app('a1', 'ada@x.com')])} />);
    expect(screen.getAllByText(/Name a1/).length).toBeGreaterThan(0);
  });

  it('sends each email address only once', async () => {
    render(<BulkEmailModal {...props([app('a1', 'ada@x.com'), app('a2', 'ADA@x.com'), app('a3', 'bob@x.com')])} />);
    dispatch();
    await waitFor(() => expect(sendGmailMessage).toHaveBeenCalledTimes(2));
    expect(sendGmailMessage.mock.calls.map((c) => c[1].toLowerCase()).sort()).toEqual(['ada@x.com', 'bob@x.com']);
  });

  it('records each successful send in Firestore right away, and not failed ones (GWS-11/FB-16)', async () => {
    sendGmailMessage.mockImplementation(async (_t: string, to: string) => {
      if (to === 'bob@x.com') throw new Error('Gmail API error (500): boom');
      return { id: 'm' };
    });
    render(<BulkEmailModal {...props([app('a1', 'ada@x.com'), app('a2', 'bob@x.com'), app('a3', 'cy@x.com')])} />);
    dispatch();
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(2));
    expect(updateDoc.mock.calls.map((c) => c[0]).sort()).toEqual(['applications/a1', 'applications/a3']);
    expect(batchCommit).not.toHaveBeenCalled();
  });

  it('stops the run when Gmail rejects the token instead of failing every recipient (GWS-13)', async () => {
    sendGmailMessage.mockRejectedValue(new Error('Gmail API error (401): invalid credentials'));
    render(<BulkEmailModal {...props([app('a1', 'a@x.com'), app('a2', 'b@x.com'), app('a3', 'c@x.com')])} />);
    dispatch();
    await waitFor(() => expect(screen.getByText(/re-authorize/i)).toBeTruthy());
    expect(sendGmailMessage).toHaveBeenCalledTimes(1);
    expect(clearGmailSendToken).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Retry Unsent/i })).toBeTruthy();
  });

  it('keeps the results when the parent re-renders with a new array of the same selection (GWS-10)', async () => {
    const selected = [app('a1', 'ada@x.com')];
    const p = props(selected);
    const { rerender } = render(<BulkEmailModal {...p} />);
    dispatch();
    await waitFor(() => expect(p.onBulkCompleted).toHaveBeenCalled());
    const logRow = screen.getAllByText(/ada@x\.com/).length;
    await act(async () => rerender(<BulkEmailModal {...p} selectedApplications={[...selected]} />));
    expect(screen.getAllByText(/ada@x\.com/).length).toBe(logRow);
    expect(p.onBulkCompleted).toHaveBeenCalledTimes(1);
  });
});
