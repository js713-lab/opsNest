import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const clientId = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const allowedOrigin = process.env.GITHUB_PROXY_ORIGIN || 'http://localhost:5173';
const port = Number(process.env.GITHUB_PROXY_PORT || 8788);

if (!clientId || !clientSecret) {
  console.error('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET. Check .env.local.');
  process.exit(1);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/github/oauth/callback') {
    sendJson(res, 404, { error: 'Not Found' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString();
    const parsed = body ? JSON.parse(body) : {};
    const { code, redirect_uri: redirectUri } = parsed;

    if (!code) {
      sendJson(res, 400, { error: 'code required' });
      return;
    }

    const ghRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const json = await ghRes.json();

    if (json.error) {
      sendJson(res, 400, { error: json.error, description: json.error_description });
      return;
    }

    sendJson(res, 200, {
      access_token: json.access_token,
      scope: json.scope,
      token_type: json.token_type,
    });
  } catch (err) {
    console.error('OAuth proxy error', err);
    sendJson(res, 500, { error: 'oauth_proxy_failed' });
  }
});

server.listen(port, () => {
  console.log(`GitHub OAuth proxy listening on http://localhost:${port}/api/github/oauth/callback`);
});

