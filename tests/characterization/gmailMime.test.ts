import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendGmailMessage } from '../../src/services/workspace';

function captureRaw() {
  const fetchMock = vi.fn(async () => new Response('{"id":"m1"}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return () => {
    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    const b64 = body.raw.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(b64)));
  };
}
afterEach(() => vi.unstubAllGlobals());

describe('CHARACTERIZATION sendGmailMessage MIME — GWS-1/GWS-9, flips in Charge Q3', () => {
  it('builds a plain-text message with RFC 2047 subject', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'Hi', 'Body');
    const mime = raw();
    expect(mime).toContain('To: a@b.com\r\n');
    expect(mime).toMatch(/Subject: =\?utf-8\?B\?SGk=\?=/);
  });
  it('BUG GWS-1: CRLF in recipient injects a Bcc header', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'victim@x.com\r\nBcc: attacker@evil.com', 'S', 'B');
    expect(raw()).toContain('\r\nBcc: attacker@evil.com\r\n');
  });
  it('BUG GWS-1: comma-separated recipient list passes through', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@x.com, attacker@evil.com', 'S', 'B');
    expect(raw()).toContain('To: a@x.com, attacker@evil.com\r\n');
  });
  it('BUG GWS-9: attachment filename is not encoded (quote breaks header)', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'S', 'B', [{ filename: 'x".pdf', mimeType: 'application/pdf', dataBase64: 'QQ==' }]);
    expect(raw()).toContain('filename="x".pdf"');
  });
  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
    await expect(sendGmailMessage('tok', 'a@b.com', 'S', 'B')).rejects.toThrow('Gmail API error (401): nope');
  });
});
