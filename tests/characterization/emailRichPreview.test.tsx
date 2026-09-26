// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EmailRichPreview } from '../../src/components/EmailRichPreview';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EmailRichPreview requires bodyText — GWS-2 (caller fixed in Q5)', () => {
  it('renders with the declared bodyText prop', () => {
    const { getByText } = render(
      <EmailRichPreview subject="S" bodyText="Hello there" recipientEmail="a@b.com" recipientName="A" status="submitted" courseTitle="C" />
    );
    expect(getByText(/Hello there/)).toBeTruthy();
  });

  it('throws without bodyText, so callers must pass it (BulkEmailModal does since Q5)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const props: any = { subject: 'S', body: 'Hello', recipientName: 'A', status: 'submitted', courseTitle: 'C' };
    expect(() => render(<EmailRichPreview {...props} />)).toThrow(TypeError);
  });
});
