import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { google, gmail_v1 } from 'googleapis';

const CREDENTIALS_PATH = path.resolve(process.env.GMAIL_CREDENTIALS_PATH || './credentials.json');
const TOKEN_PATH = path.resolve(process.env.GMAIL_TOKEN_PATH || './token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

async function loadCredentials() {
  const raw = await fs.readFile(CREDENTIALS_PATH, 'utf8');
  const json = JSON.parse(raw);
  return json.installed || json.web; // Desktop creds usually in "installed"
}

async function getAuth() {
const creds = await loadCredentials();
const { client_id, client_secret, redirect_uris } = creds;
const redirectUri = (redirect_uris && redirect_uris[0]) || 'http://localhost:3000/oauth2callback';
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);


// Load saved token
const tokenRaw = await fs.readFile(TOKEN_PATH, 'utf8');
oAuth2Client.setCredentials(JSON.parse(tokenRaw));


// Handle token refresh automatically
oAuth2Client.on('tokens', async (tokens) => {
if (tokens.refresh_token || tokens.access_token) {
try {
const current = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8'));
const updated = { ...current, ...tokens };
await fs.writeFile(TOKEN_PATH, JSON.stringify(updated, null, 2), 'utf8');
} catch {}
}
});


return oAuth2Client;
}

export async function getGmail(): Promise<gmail_v1.Gmail> {
  const auth = await getAuth();
  return google.gmail({ version: 'v1', auth });
}

function b64url(input: string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeB64url(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input + pad, 'base64').toString('utf8');
}

function findPlainText(part?: gmail_v1.Schema$MessagePart): string | null {
  if (!part) return null;
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return decodeB64url(part.body.data);
  }
  if (part.parts) {
    for (const p of part.parts) {
      const found = findPlainText(p);
      if (found) return found;
    }
  }
  // fallback to HTML -> strip tags
  if (part.mimeType === 'text/html' && part.body?.data) {
    const html = decodeB64url(part.body.data);
    return html.replace(/<[^>]+>/g, ' ');
  }
  return null;
}

export type SimpleMessage = {
  id: string;
  threadId: string | undefined | null;
  subject: string;
  from: string;
  dateIso: string;
  snippet: string;
  bodyText: string;
};

export async function listMessages(query = 'in:inbox newer_than:7d', maxResults = 10) {
  const gmail = await getGmail();
  const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults });
  const ids = (res.data.messages || []).map(m => m.id!).filter(Boolean);
  return ids;
}

export async function getMessage(id: string): Promise<SimpleMessage> {
  const gmail = await getGmail();
  const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
  const msg = res.data;
  const headers = new Map((msg.payload?.headers || []).map(h => [h.name?.toLowerCase(), h.value || '']));
  const subject = headers.get('subject') || '';
  const from = headers.get('from') || '';
  const dateIso = new Date(Number(msg.internalDate)).toISOString();
  const snippet = msg.snippet || '';
  const bodyText = findPlainText(msg.payload!) || '';
  return { id: msg.id!, threadId: msg.threadId, subject, from, dateIso, snippet, bodyText };
}

export async function sendEmail(to: string, subject: string, body: string) {
  const gmail = await getGmail();
  const raw = [
    `To: ${to}`,
    'Subject: ' + subject,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\r\n');

  const encoded = b64url(raw);
  const sendRes = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded }
  });
  return sendRes.data.id;
}

export function startOfDay(date = new Date(), tz = process.env.TZ || 'UTC') {
  // Compute local midnight safely
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(date);
  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value);
  const d = Number(parts.find(p => p.type === 'day')!.value);
  // Create a Date at 00:00:00 in that timezone by formatting string and parsing in that TZ via Date.UTC approximation
  const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T00:00:00`;
  // Convert that local wall time to UTC millis by asking what time it is in that zone
  const asMillis = Date.parse(new Date(iso).toISOString());
  return new Date(asMillis);
}

export function gmailDateQueryForDay(tz = process.env.TZ || 'UTC', date = new Date()) {
  const start = startOfDay(date, tz);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  function ymd(d: Date) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }
  // Gmail search understands after/before inclusive/exclusive day boundaries
  const q = `after:${ymd(start)} before:${ymd(end)}`;
  return q;
}

export async function countToday(tz = process.env.TZ || 'UTC') {
  const gmail = await getGmail();
  const q = gmailDateQueryForDay(tz);
  const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: 500 });
  return (res.data.messages || []).length;
}


