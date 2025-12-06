const DEFAULT_GEMINI_BASE_URL =
  import.meta.env.VITE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
const DEFAULT_GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const buildHeaders = (apiKey?: string) => {
  const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('Gemini API key is missing. Set VITE_GEMINI_API_KEY or provide one.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
};

export interface GeminiChatOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export async function runGeminiChat(prompt: string, opts?: GeminiChatOptions) {
  const headers = buildHeaders(opts?.apiKey);
  const endpoint = `${opts?.baseUrl || DEFAULT_GEMINI_BASE_URL}/chat/completions`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: opts?.model || DEFAULT_GEMINI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 64,
    }),
  });

  const text = await res.text();
  if (res.status === 401) {
    throw new Error('Gemini rejected the API key (401 Unauthorized).');
  }
  if (!res.ok) {
    throw new Error(`Gemini API error (${res.status}): ${text || res.statusText}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, status: res.status };
  }
}

export async function testGeminiConnection(opts?: GeminiChatOptions) {
  try {
    const res = await runGeminiChat('Health check: respond with "ok".', opts);
    const content = res?.choices?.[0]?.message?.content || '';
    return { ok: true, content };
  } catch (err: any) {
    const message =
      err?.message && err.message.includes('Failed to fetch')
        ? 'Network/CORS blocked the Gemini request. Try again from a backend context or set VITE_GEMINI_BASE_URL to a proxy.'
        : err?.message || 'Gemini request failed';
    throw new Error(message);
  }
}


