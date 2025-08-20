import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import open from 'open';
import { google } from 'googleapis';
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
];
const CREDENTIALS_PATH = path.resolve(process.env.GMAIL_CREDENTIALS_PATH || './credentials.json');
const TOKEN_PATH = path.resolve(process.env.GMAIL_TOKEN_PATH || './token.json');
async function loadCredentials() {
    const raw = await fs.readFile(CREDENTIALS_PATH, 'utf8');
    const json = JSON.parse(raw);
    return json.installed || json.web; // Desktop creds usually in "installed"
}
async function main() {
    const creds = await loadCredentials();
    const { client_id, client_secret, redirect_uris } = creds;
    // Use a localhost redirect (Desktop flow)
    const redirectUri = 'http://localhost:3000';
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);
    // Start a tiny HTTP server to catch the OAuth redirect
    const server = http.createServer(async (req, res) => {
        if (!req.url)
            return;
        if (req.url.startsWith(new URL(redirectUri).pathname)) {
            const url = new URL(req.url, redirectUri);
            const code = url.searchParams.get('code');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h2>You may close this tab and return to the terminal.</h2>');
            server.close();
            if (!code)
                return;
            const { tokens } = await oauth2Client.getToken(code);
            await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');
            console.log(`Saved token to ${TOKEN_PATH}`);
        }
    }).listen(3000);
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });
    console.log('Opening Google sign‑in in your browser...');
    await open(authUrl);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
