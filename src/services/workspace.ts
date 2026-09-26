// Gmail send via the REST API, using a gmail.send access token from getGmailSendToken().

export interface EmailAttachmentPayload {
  filename: string;
  mimeType: string;
  dataBase64: string;
  description?: string;
}

// Recipient addresses come from public form submissions, so anything that could add headers or
// extra recipients (CR/LF, commas, display-name syntax) is rejected rather than escaped.
const SINGLE_ADDRESS = /^[^\s@,;:<>()[\]\\"]+@[^\s@,;:<>()[\]\\"]+\.[^\s@,;:<>()[\]\\"]+$/;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// RFC 2047 caps each encoded-word at 75 chars; 45 UTF-8 bytes per word stays under it
// without splitting a multi-byte character.
function encodeSubject(subject: string): string {
  const encoder = new TextEncoder();
  const words: number[][] = [];
  let chunk: number[] = [];
  for (const char of subject.replace(/[\r\n]+/g, ' ')) {
    const bytes = encoder.encode(char);
    if (chunk.length + bytes.length > 45) {
      words.push(chunk.splice(0));
    }
    chunk.push(...bytes);
  }
  if (chunk.length || words.length === 0) words.push(chunk);
  return words.map((w) => `=?utf-8?B?${toBase64(Uint8Array.from(w))}?=`).join('\r\n ');
}

// RFC 2231 extended value, plus an ASCII-only quoted fallback for older clients.
function filenameParams(param: 'name' | 'filename', filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const extended = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${param}="${ascii}"; ${param}*=UTF-8''${extended}`;
}

export async function sendGmailMessage(
  token: string,
  to: string,
  subject: string,
  bodyText: string,
  attachments: EmailAttachmentPayload[] = []
) {
  if (!token) throw new Error('Authentication token required');

  const recipient = to.trim();
  if (!SINGLE_ADDRESS.test(recipient)) {
    throw new Error('Invalid recipient address: expected a single plain email address');
  }

  const utf8Subject = encodeSubject(subject);
  const body = bodyText.replace(/\r?\n/g, '\r\n');

  let rawEmail = '';

  if (!attachments || attachments.length === 0) {
    const emailLines = [
      'From: me',
      `To: ${recipient}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
    ].join('\r\n');
    rawEmail = emailLines;
  } else {
    // Multipart/mixed MIME message for RFC 2822 attachments
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const parts: string[] = [
      'From: me',
      `To: ${recipient}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
      '',
    ];

    for (const att of attachments) {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${att.mimeType || 'application/pdf'}; ${filenameParams('name', att.filename)}`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; ${filenameParams('filename', att.filename)}`,
        '',
        att.dataBase64.replace(/\s+/g, '').replace(/.{1,76}/g, '$&\r\n').trimEnd(),
        ''
      );
    }

    parts.push(`--${boundary}--`);
    rawEmail = parts.join('\r\n');
  }

  // Base64URL encode standard representation for Gmail API
  const raw = toBase64(new TextEncoder().encode(rawEmail))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Gmail API error (${res.status}): ${errorBody || res.statusText}`);
  }

  return await res.json();
}
