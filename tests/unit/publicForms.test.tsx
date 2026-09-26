// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { addDoc } = vi.hoisted(() => ({ addDoc: vi.fn() }));
vi.mock('firebase/firestore', () => ({ collection: (_db: unknown, name: string) => name, addDoc: (...a: unknown[]) => addDoc(...a), serverTimestamp: () => 'SERVER_TIMESTAMP' }));
vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { EnterpriseContactModal } from '../../src/site/components/EnterpriseContactModal';
import { ContactPage } from '../../src/site/pages/ContactPage';

const type = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

function submitEnterprise() {
  render(<EnterpriseContactModal isOpen onClose={() => {}} />);
  type('e.g. Apex Holdings / Commercial Bank', 'Apex');
  type('e.g. Shanil Perera', 'Pat Lee');
  type('s.perera@company.com', 'pat@apex.com');
  fireEvent.submit(screen.getByPlaceholderText('s.perera@company.com').closest('form')!);
}

function submitContact() {
  render(<ContactPage />);
  type('Dr. Evelyn Reed', 'Sam Doe');
  type('e.reed@enterprise.com', 'sam@x.com');
  type('Provide parameters regarding your inquiry...', 'Please tell me about the course.');
  fireEvent.submit(screen.getByPlaceholderText('e.reed@enterprise.com').closest('form')!);
}

// jsdom has no IntersectionObserver; ContactPage's scroll-reveal animations need one.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

let infoSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', NoopObserver);
  addDoc.mockReset();
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Enterprise inquiry form — Q8 (PUB-9)', () => {
  it('shows success only after the inquiry is saved', async () => {
    addDoc.mockResolvedValue({ id: 'x' });
    submitEnterprise();
    expect(await screen.findByText(/Enterprise Scope Dispatched/)).toBeTruthy();
    expect(addDoc.mock.calls[0][0]).toBe('enterpriseInquiries');
  });

  it('shows an error, not success, when saving fails — and does not log the submission', async () => {
    addDoc.mockRejectedValue(new Error('permission-denied'));
    submitEnterprise();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/Enterprise Scope Dispatched/)).toBeNull();
    const logged = JSON.stringify(infoSpy.mock.calls);
    expect(logged).not.toContain('pat@apex.com');
  });
});

describe('Contact form — Q8 (PUB-9)', () => {
  it('confirms only after the message is saved', async () => {
    addDoc.mockResolvedValue({ id: 'x' });
    submitContact();
    expect(await screen.findByText('Transmission Confirmed')).toBeTruthy();
    expect(addDoc.mock.calls[0][0]).toBe('contactMessages');
  });

  it('shows an error, not a confirmation, when saving fails', async () => {
    addDoc.mockRejectedValue(new Error('permission-denied'));
    submitContact();
    expect(await screen.findByRole('alert')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByText('Transmission Confirmed')).toBeNull();
  });
});
