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

const allowedOrigin = process.env.CODERABBIT_PROXY_ORIGIN || 'http://localhost:5173';
const port = Number(process.env.CODERABBIT_PROXY_PORT || 8790);
const defaultBaseUrl = process.env.CODERABBIT_API_BASE_URL || 'https://api.coderabbit.ai/api/v1';
const defaultApiKey = process.env.CODERABBIT_API_KEY;

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  // Allow all headers to simplify browser preflight for custom auth headers.
  'Access-Control-Allow-Headers': '*', 
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify(payload));
}

async function handleReportGenerate(body) {
  const { apiKey, baseUrl, from, to, timezone } = body || {};
  const targetApiKey = apiKey || defaultApiKey;
  if (!targetApiKey) {
    return { status: 400, payload: { error: 'api_key_required' } };
  }

  const targetBase = baseUrl || defaultBaseUrl;
  const url = `${targetBase.replace(/\/$/, '')}/report.generate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-coderabbitai-api-key': targetApiKey,
    },
    body: JSON.stringify({
      from,
      to,
      timezone: timezone || 'UTC',
    }),
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { body: text };
  }

  return { status: res.status, payload };
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 404, { error: 'Not Found' });
    return;
  }

  const path = req.url || '';
  const allowedPaths = ['/api/coderabbit/report.generate', '/api/coderabbit/report'];
  if (!allowedPaths.includes(path)) {
    sendJson(res, 404, { error: 'Not Found' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const bodyString = Buffer.concat(chunks).toString();
    const body = bodyString ? JSON.parse(bodyString) : {};

    const { status, payload } = await handleReportGenerate(body);
    sendJson(res, status, payload);
  } catch (err) {
    console.error('CodeRabbit proxy error', err);
    sendJson(res, 500, { error: 'coderabbit_proxy_failed' });
  }
});

server.listen(port, () => {
  console.log(`CodeRabbit proxy listening on http://localhost:${port}/api/coderabbit/report.generate`);
});

