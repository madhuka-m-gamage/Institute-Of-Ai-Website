import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendGmailMessage } from '../../src/admin/services/gmail';

function captureRaw() {
  const fetchMock = vi.fn(async () => new Response('{"id":"m1"}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const raw = () => {
    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    const b64 = body.raw.replace(/-/g, '+').replace(/_/g, '/');
    return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
  };
  return Object.assign(raw, { fetchMock });
}
const headersOf = (mime: string) => mime.split('\r\n\r\n')[0];
const decodeSubject = (mime: string) => {
  const folded = headersOf(mime).match(/^Subject: ([\s\S]*?)\r\n(?=\S)/m)![1];
  const bytes = [...folded.matchAll(/=\?utf-8\?B\?([^?]+)\?=/g)].flatMap((m) => [...atob(m[1])].map((c) => c.charCodeAt(0)));
  return new TextDecoder().decode(Uint8Array.from(bytes));
};
afterEach(() => vi.unstubAllGlobals());

describe('sendGmailMessage recipient validation — GWS-1/PUB-5 (Q3)', () => {
  it('sends to a single valid address', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'Hi', 'Body');
    expect(raw()).toContain('To: a@b.com\r\n');
  });
  it('trims surrounding whitespace', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', '  a@b.com ', 'Hi', 'Body');
    expect(raw()).toContain('To: a@b.com\r\n');
  });
  it.each([
    ['CRLF header injection', 'victim@x.com\r\nBcc: attacker@evil.com'],
    ['bare LF injection', 'victim@x.com\nBcc: attacker@evil.com'],
    ['comma recipient list', 'a@x.com, attacker@evil.com'],
    ['semicolon recipient list', 'a@x.com;attacker@evil.com'],
    ['display-name form', 'Victim <attacker@evil.com>'],
    ['no domain', 'not-an-email'],
  ])('rejects %s without calling Gmail', async (_label, to) => {
    const { fetchMock } = captureRaw();
    await expect(sendGmailMessage('tok', to, 'S', 'B')).rejects.toThrow(/Invalid recipient/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('sendGmailMessage MIME correctness — GWS-9 (Q3)', () => {
  it('encodes a short subject as a single RFC 2047 word', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'Hi', 'Body');
    expect(raw()).toMatch(/Subject: =\?utf-8\?B\?SGk=\?=\r\n/);
  });
  it('splits a long non-ASCII subject into encoded words of at most 75 chars that decode back exactly', async () => {
    const subject = '[Institute of AI] Official Admissions Acceptance: Ānanda Wickramasinghe — Advanced Agentic Systems ✓';
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', subject, 'Body');
    const mime = raw();
    for (const word of headersOf(mime).match(/=\?utf-8\?B\?[^?]+\?=/g)!) expect(word.length).toBeLessThanOrEqual(75);
    expect(decodeSubject(mime)).toBe(subject);
  });
  it('uses CRLF line endings in the body', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'S', 'line1\nline2\r\nline3');
    expect(raw()).toContain('line1\r\nline2\r\nline3');
  });
  it('encodes a hostile attachment filename so it cannot break the header', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'S', 'B', [{ filename: 'x".pdf\r\nBcc: attacker@evil.com', mimeType: 'application/pdf', dataBase64: 'QQ==' }]);
    const mime = raw();
    expect(mime).not.toContain('\r\nBcc:');
    expect(mime).toMatch(/filename\*=UTF-8''x%22\.pdf/);
  });
  it('keeps a non-ASCII filename recoverable via RFC 2231', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'S', 'B', [{ filename: 'Syllabus—Ānanda.pdf', mimeType: 'application/pdf', dataBase64: 'QQ==' }]);
    const encoded = raw().match(/filename\*=UTF-8''([^;\r\n]+)/)![1];
    expect(decodeURIComponent(encoded)).toBe('Syllabus—Ānanda.pdf');
  });
  it('wraps attachment base64 at 76 characters per line', async () => {
    const raw = captureRaw();
    await sendGmailMessage('tok', 'a@b.com', 'S', 'B', [{ filename: 'a.pdf', mimeType: 'application/pdf', dataBase64: 'A'.repeat(200) }]);
    const lines = raw().split('\r\n').filter((l) => /^A+$/.test(l));
    expect(lines.map((l) => l.length)).toEqual([76, 76, 48]);
  });
  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
    await expect(sendGmailMessage('tok', 'a@b.com', 'S', 'B')).rejects.toThrow('Gmail API error (401): nope');
  });
});
