// Google Workspace REST API Service
// Handles real REST calls to Google Drive, Docs, Forms, Gmail, Tasks, Contacts, and Calendar.

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  size?: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
  body?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

export interface ContactPerson {
  resourceName: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  organization?: string;
}

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export interface FormItem {
  formId: string;
  title: string;
  description?: string;
  responderUri?: string;
}

// 1. Google Drive API
export async function listDriveFiles(token: string, search = ''): Promise<DriveFile[]> {
  if (!token) throw new Error('Google Workspace Access Token missing. Please reconnect your account.');
  let url = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,webViewLink,iconLink,createdTime,size)&pageSize=20';
  if (search) {
    url += `&q=${encodeURIComponent(`name contains '${search}'`)}`;
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Google Drive access token expired or permission missing (${res.status}). Please reconnect your Google account.`);
    }
    throw new Error(`Drive API error (${res.status}): ${res.statusText}`);
  }
  const data = await res.json();
  return data.files || [];
}

// 2. Google Docs API
export async function createGoogleDoc(token: string, title: string, content = ''): Promise<{ documentId: string; title: string }> {
  if (!token) throw new Error('Authentication token required');
  const res = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Google Docs API error: ${res.statusText}`);
  const docData = await res.json();

  if (content && docData.documentId) {
    await fetch(`https://docs.googleapis.com/v1/documents/${docData.documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      }),
    });
  }

  return { documentId: docData.documentId, title: docData.title };
}

export async function getGoogleDocDetails(token: string, docId: string) {
  if (!token) return null;
  try {
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Docs API error: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch Doc details:', err);
    return null;
  }
}

// 3. Google Forms API
export async function getFormDetails(token: string, formId: string): Promise<FormItem | null> {
  if (!token) return null;
  try {
    const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Forms API error: ${res.statusText}`);
    const data = await res.json();
    return {
      formId: data.formId,
      title: data.info?.title || 'Untitled Form',
      description: data.info?.description,
      responderUri: data.responderUri,
    };
  } catch (err) {
    console.warn('Failed to fetch Form details:', err);
    return null;
  }
}

export async function getFormResponses(token: string, formId: string) {
  if (!token) return [];
  try {
    const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Forms API error: ${res.statusText}`);
    const data = await res.json();
    return data.responses || [];
  } catch (err) {
    console.warn('Failed to fetch Form responses:', err);
    return [];
  }
}

// 4. Gmail API
export async function listGmailMessages(token: string, maxResults = 10): Promise<GmailMessage[]> {
  if (!token) throw new Error('Google Workspace Access Token missing. Please reconnect your account.');
  const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    if (listRes.status === 401 || listRes.status === 403) {
      throw new Error(`Gmail access token expired or permission missing (${listRes.status}). Please reconnect your Google account.`);
    }
    throw new Error(`Gmail API error (${listRes.status}): ${listRes.statusText}`);
  }
  const listData = await listRes.json();
  if (!listData.messages || listData.messages.length === 0) return [];

  const detailedMessages = await Promise.all(
    listData.messages.slice(0, 5).map(async (msg: { id: string }) => {
      const itemRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!itemRes.ok) return { id: msg.id, threadId: msg.id, snippet: 'Message unavailable' };
      const itemData = await itemRes.json();
      const headers = itemData.payload?.headers || [];
      const subject = headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
      const from = headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
      const date = headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === 'date')?.value || '';
      return {
        id: itemData.id,
        threadId: itemData.threadId,
        snippet: itemData.snippet,
        subject,
        from,
        date,
      };
    })
  );
  return detailedMessages;
}

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

// 5. Google Tasks API
export async function listGoogleTasks(token: string): Promise<TaskItem[]> {
  if (!token) throw new Error('Google Workspace Access Token missing. Please reconnect your account.');
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@default/lists/@default/tasks', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Google Tasks token expired or permission missing (${res.status}). Please reconnect your Google account.`);
    }
    throw new Error(`Tasks API error (${res.status}): ${res.statusText}`);
  }
  const data = await res.json();
  return (data.items || []).map((t: any) => ({
    id: t.id,
    title: t.title || 'Untitled Task',
    notes: t.notes,
    status: t.status === 'completed' ? 'completed' : 'needsAction',
    due: t.due,
  }));
}

export async function createGoogleTask(token: string, title: string, notes = '') {
  if (!token) throw new Error('Authentication token required');
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@default/lists/@default/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, notes }),
  });
  if (!res.ok) throw new Error(`Failed to create task: ${res.statusText}`);
  return await res.json();
}

// 6. Google Contacts (People API)
export async function listGoogleContacts(token: string): Promise<ContactPerson[]> {
  if (!token) throw new Error('Google Workspace Access Token missing. Please reconnect your account.');
  const res = await fetch(
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,photos,organizations&pageSize=20',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Google Contacts token expired or permission missing (${res.status}). Please reconnect your Google account.`);
    }
    throw new Error(`People API error (${res.status}): ${res.statusText}`);
  }
  const data = await res.json();
  return (data.connections || []).map((c: any) => ({
    resourceName: c.resourceName,
    name: c.names?.[0]?.displayName || 'Unknown Name',
    email: c.emailAddresses?.[0]?.value || 'No email',
    photoUrl: c.photos?.[0]?.url,
    organization: c.organizations?.[0]?.name || 'Institute Member',
  }));
}

// 7. Google Calendar API
export async function listCalendarEvents(token: string): Promise<CalendarEventItem[]> {
  if (!token) throw new Error('Google Workspace Access Token missing. Please reconnect your account.');
  const timeMin = new Date().toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      timeMin
    )}&singleEvents=true&orderBy=startTime&maxResults=10`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Google Calendar token expired or permission missing (${res.status}). Please reconnect your Google account.`);
    }
    throw new Error(`Calendar API error (${res.status}): ${res.statusText}`);
  }
  const data = await res.json();
  return (data.items || []).map((ev: any) => ({
    id: ev.id,
    summary: ev.summary || 'Institute Event',
    description: ev.description,
    start: ev.start,
    end: ev.end,
    htmlLink: ev.htmlLink,
  }));
}

export async function createCalendarEvent(
  token: string,
  summary: string,
  description: string,
  startTimeIso: string,
  endTimeIso: string
) {
  if (!token) throw new Error('Authentication token required');
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary,
      description,
      start: { dateTime: startTimeIso },
      end: { dateTime: endTimeIso },
    }),
  });
  if (!res.ok) throw new Error(`Failed to create Calendar event: ${res.statusText}`);
  return await res.json();
}
