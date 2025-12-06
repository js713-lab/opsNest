# Integration Setup Guide (GitHub OAuth + Repo Import)

This guide walks you through enabling “Connect with GitHub” plus importing repositories into opsNest.

## Prerequisites
- Supabase project (tables from `supabase/migrations`, especially `integrations_config`).
- Deployed or local backend endpoint to exchange GitHub OAuth codes for access tokens.
- Frontend env vars configured for Vite.

## 1) Create a GitHub OAuth App
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. App name: `opsNest (dev)` (any).
3. Homepage URL: `http://localhost:5173` (or your production domain).
4. Authorization callback URL: `http://localhost:5173/oauth/github/callback` (prod: `https://your-domain/oauth/github/callback`).
5. Save and copy:
   - `client_id`
   - `client_secret` (store server-side only)
6. Scopes to request: `repo read:user user:email` (already set in the frontend helper).

## 2) Backend: Token Exchange Endpoint
Never expose `client_secret` to the browser. Implement a backend endpoint that exchanges `code` for `access_token` using the GitHub Web Application Flow.

### Quick local proxy (added)
- Script: `server/github-oauth-proxy.js`
- Start: `npm run github-proxy` (uses `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, optional `GITHUB_PROXY_PORT`, `GITHUB_PROXY_ORIGIN`)
- It loads `.env.local` if present and serves `POST /api/github/oauth/callback` for the frontend to call.

Example (Express):
```ts
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.post('/api/github/oauth/callback', async (req, res) => {
  const { code, redirect_uri } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  const ghRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri,
    }),
  });

  const json = await ghRes.json();
  if (json.error) return res.status(400).json(json);

  // TODO: optionally store token server-side per user
  res.json({ access_token: json.access_token });
});
```

Deploy this endpoint and note its URL; you’ll reference it in the frontend env var `VITE_GITHUB_TOKEN_EXCHANGE_URL`.

## 3) Frontend Environment Variables
Create or update `.env`:
```
VITE_GITHUB_CLIENT_ID=your_client_id
VITE_GITHUB_TOKEN_EXCHANGE_URL=https://your-backend/api/github/oauth/callback
```
Existing Supabase envs still apply:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 4) Connect Flow (UI)
- Navigate to Dashboard → Integrations → GitHub → “Connect with GitHub”.
- User is redirected to GitHub, approves scopes, and returns to `/oauth/github/callback`.
- Frontend validates `state`, calls your token exchange endpoint, stores token locally (demo) and attempts to upsert into `integrations_config` (if available).

## 5) Import Repos into Projects
- Go to Dashboard → Projects → New Project → “Load repos”.
- The modal fetches repos using the stored GitHub token and lets the user pick a repo to prefill name/URL/branch before creating the project.

## 6) Optional Webhooks (auto-sync)
For automatic re-indexing or pipeline triggers, configure a GitHub webhook pointing to your backend (e.g., `POST /api/github/webhook`) listening to:
- `push`
- `pull_request`
- `release`
Verify signatures with a secret and dispatch jobs (indexing, tests, etc.) per your worker pipeline.

## 7) Security Best Practices
- Keep `client_secret` server-side only; never ship it to the browser.
- Use `state` (already implemented) to prevent CSRF.
- Prefer server-side token storage and short-lived session tokens to the frontend.
- Allow token revocation and disconnect; surface a “Disconnect GitHub” action (implemented).
- Validate webhook signatures and apply least-privilege scopes.

## 8) Quick Test Checklist
- Connect: Click “Connect with GitHub”, approve, and land back on `/oauth/github/callback` without errors.
- Repo fetch: In New Project modal, click “Load repos” and see your GitHub repos listed.
- Prefill: Selecting a repo populates name/URL/branch; creating the project succeeds.
- Disconnect: Use “Disconnect” on Integrations → GitHub and ensure local token clears.
- (Optional) Webhook: Trigger a push event and verify your backend receives the webhook.

