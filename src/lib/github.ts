const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
const tokenExchangeUrl = import.meta.env.VITE_GITHUB_TOKEN_EXCHANGE_URL; // Backend endpoint to exchange code for token
const scopes = 'repo read:user user:email';
const stateKey = 'gh_oauth_state';
const tokenKey = 'github_token';

export function getGithubToken(): string | null {
  return localStorage.getItem(tokenKey);
}

export function clearGithubToken() {
  localStorage.removeItem(tokenKey);
}

export function buildGithubAuthUrl() {
  if (!clientId) throw new Error('VITE_GITHUB_CLIENT_ID is missing');
  const state = crypto.randomUUID();
  sessionStorage.setItem(stateKey, state);
  const redirectUri = `${window.location.origin}/oauth/github/callback`;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'true');
  return url.toString();
}

export function validateGithubState(incoming: string | null) {
  const stored = sessionStorage.getItem(stateKey);
  return stored && incoming && stored === incoming;
}

export async function exchangeGithubCode(code: string, redirectUri: string) {
  if (!tokenExchangeUrl) throw new Error('VITE_GITHUB_TOKEN_EXCHANGE_URL is missing');
  const res = await fetch(tokenExchangeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.statusText}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error('No access_token in response');
  localStorage.setItem(tokenKey, json.access_token);
  return json.access_token as string;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  html_url: string;
  owner: { login: string };
}

export async function fetchGithubRepos(accessToken: string): Promise<GithubRepo[]> {
  const res = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error('Failed to load GitHub repos');
  return (await res.json()) as GithubRepo[];
}

