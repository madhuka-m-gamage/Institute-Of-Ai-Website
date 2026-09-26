// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { updateDoc, sendGmailMessage, order } = vi.hoisted(() => ({
  updateDoc: vi.fn(),
  sendGmailMessage: vi.fn(),
  order: [] as string[],
}));

vi.mock('../../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, coll: string, id: string) => `${coll}/${id}`,
  updateDoc: (...a: unknown[]) => updateDoc(...a),
}));
vi.mock('../../src/admin/services/auditLog', () => ({ logAdminAction: vi.fn(async () => undefined) }));
vi.mock('../../src/admin/services/gmail', () => ({ sendGmailMessage: (...a: unknown[]) => sendGmailMessage(...a) }));
vi.mock('../../src/admin/services/pdfDocuments', () => ({
  getAvailableDocumentsForProgram: () => [],
  generateProgramPDF: () => ({ filename: 'doc.pdf', mimeType: 'application/pdf', dataBase64: 'QQ==' }),
  downloadProgramPDF: vi.fn(),
  resolveProgramDetails: () => ({ id: 'c1', title: 'AI Course' }),
}));

import { ApplicationDetailModal } from '../../src/admin/components/ApplicationDetailModal';
import type { StudentApplication } from '../../src/types';

const app: StudentApplication = {
  id: 'a1', fullName: 'Ada Lovelace', email: 'ada@x.com', courseId: 'c1', courseTitle: 'AI Course',
  status: 'submitted', notes: 'Phone: 123',
};

const setup = (overrides: Partial<StudentApplication> = {}) => {
  const onStatusUpdated = vi.fn();
  const onAddToast = vi.fn();
  render(
    <ApplicationDetailModal
      application={{ ...app, ...overrides }}
      onClose={() => {}}
      onStatusUpdated={onStatusUpdated}
      onAddToast={onAddToast}
      currentAdminEmail="officer@x.com"
      accessToken="tok"
    />
  );
  return { onStatusUpdated, onAddToast };
};
const choose = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));
const send = () => fireEvent.click(screen.getByRole('button', { name: /Dispatch .* Email via Gmail API/ }));
const save = () => fireEvent.click(screen.getByRole('button', { name: /Save Review Status/ }));

beforeEach(() => {
  order.length = 0;
  updateDoc.mockReset().mockImplementation(async (_ref: string, data: Record<string, unknown>) => {
    order.push('status' in data ? 'save-status' : 'record-letter');
  });
  sendGmailMessage.mockReset().mockImplementation(async () => {
    order.push('send');
    return { id: 'm' };
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ApplicationDetailModal decision letters — Q11 (ADM-11)', () => {
  it('saves a changed status before sending its letter', async () => {
    const { onStatusUpdated } = setup();
    choose('Accepted');
    send();
    await waitFor(() => expect(onStatusUpdated).toHaveBeenCalled());
    expect(order).toEqual(['save-status', 'send', 'record-letter']);
    expect(updateDoc.mock.calls[0][1]).toMatchObject({ status: 'accepted' });
  });

  it('sends no email when saving the new status fails', async () => {
    updateDoc.mockRejectedValueOnce(new Error('permission-denied'));
    const { onAddToast } = setup();
    choose('Accepted');
    send();
    await waitFor(() => expect(onAddToast).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'error'));
    expect(sendGmailMessage).not.toHaveBeenCalled();
  });

  it('does not re-save when the status is unchanged', async () => {
    const { onStatusUpdated } = setup({ status: 'accepted' });
    send();
    await waitFor(() => expect(onStatusUpdated).toHaveBeenCalled());
    expect(order).toEqual(['send', 'record-letter']);
  });

  it('refreshes the list with the letter recorded', async () => {
    const { onStatusUpdated } = setup({ status: 'accepted' });
    send();
    await waitFor(() => expect(onStatusUpdated).toHaveBeenCalled());
    expect(onStatusUpdated.mock.calls[0][0]).toMatchObject({
      id: 'a1', status: 'accepted', decisionLetterSent: true, lastDecisionStatus: 'accepted',
    });
  });

  it('says the email was sent (not failed) when only recording it fails, so it is not resent', async () => {
    updateDoc.mockRejectedValue(new Error('unavailable'));
    const { onAddToast } = setup({ status: 'accepted' });
    send();
    await waitFor(() => expect(onAddToast).toHaveBeenCalled());
    const [title, message] = onAddToast.mock.calls.at(-1)!;
    expect(`${title} ${message}`).toMatch(/sent/i);
    expect(`${title} ${message}`).toMatch(/not recorded|do not resend|don't resend/i);
  });
});

describe('ApplicationDetailModal save — Q11 (ADM-10)', () => {
  it('does not overwrite notes it did not change', async () => {
    const { onStatusUpdated } = setup();
    choose('Accepted');
    save();
    await waitFor(() => expect(onStatusUpdated).toHaveBeenCalled());
    expect(updateDoc.mock.calls[0][1]).not.toHaveProperty('notes');
  });
});
