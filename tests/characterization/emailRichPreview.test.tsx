// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EmailRichPreview } from '../../src/components/EmailRichPreview';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CHARACTERIZATION EmailRichPreview with BulkEmailModal props — GWS-2, flips in Charge Q5', () => {
  it('renders with the declared bodyText prop', () => {
    const { getByText } = render(
      <EmailRichPreview subject="S" bodyText="Hello there" recipientEmail="a@b.com" recipientName="A" status="submitted" courseTitle="C" />
    );
    expect(getByText(/Hello there/)).toBeTruthy();
  });

  it('BUG GWS-2: throws when given `body` (as BulkEmailModal.tsx:762 passes it)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const props: any = { subject: 'S', body: 'Hello', recipientName: 'A', status: 'submitted', courseTitle: 'C' };
    expect(() => render(<EmailRichPreview {...props} />)).toThrow(TypeError);
  });
});
