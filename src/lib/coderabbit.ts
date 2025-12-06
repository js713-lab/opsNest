const DEFAULT_CODERABBIT_BASE_URL =
  import.meta.env.VITE_CODERABBIT_PROXY_URL ||
  import.meta.env.VITE_CODERABBIT_BASE_URL ||
  (import.meta.env.DEV ? '/api/coderabbit' : undefined) ||
  'https://api.coderabbit.ai/api/v1';

const normalizeDateForApi = (value: string | undefined) => {
  if (!value) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  // CodeRabbit is strict about date parsing; send date-only (YYYY-MM-DD).
  return d.toISOString().split('T')[0];
};

const buildHeaders = (apiKey?: string) => {
  const key = apiKey || import.meta.env.VITE_CODERABBIT_API_KEY;
  if (!key) {
    throw new Error('CodeRabbit API key is missing. Set VITE_CODERABBIT_API_KEY or provide one.');
  }

  return {
    'Content-Type': 'application/json',
    'x-coderabbitai-api-key': key,
  };
};

export interface CodeRabbitReportRequest {
  from: string;
  to: string;
  timezone?: string;
  apiKey?: string;
  baseUrl?: string;
}

export async function generateCodeRabbitReport(payload: CodeRabbitReportRequest) {
  const headers = buildHeaders(payload.apiKey);
  const baseUrl = payload.baseUrl || DEFAULT_CODERABBIT_BASE_URL;
  const from = normalizeDateForApi(payload.from);
  const to = normalizeDateForApi(payload.to);
  const res = await fetch(`${baseUrl}/report.generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      // apiKey is needed by the local proxy; real API uses the header.
      apiKey: payload.apiKey,
      from,
      to,
      timezone: payload.timezone || 'UTC',
    }),
  });

  const text = await res.text();
  if (res.status === 401) {
    throw new Error('CodeRabbit rejected the API key (401 Unauthorized).');
  }
  if (!res.ok) {
    throw new Error(`CodeRabbit API error (${res.status}): ${text || res.statusText}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, status: res.status };
  }
}

export interface CodeRabbitTestResult {
  ok: boolean;
  response?: any;
  warning?: string;
}

export async function testCodeRabbitConnection(apiKey?: string, baseUrl?: string): Promise<CodeRabbitTestResult> {
  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  // Normalize date strings because the CodeRabbit API can reject some ISO variants.
  const toIso = (d: Date) => d.toISOString();
  const toDateOnly = (d: Date) => d.toISOString().split('T')[0];

  const attempt = async (from: string, to: string) =>
    generateCodeRabbitReport({
      from,
      to,
      timezone: 'UTC',
      apiKey,
      baseUrl,
    });

  try {
    try {
      const response = await attempt(toIso(sixHoursAgo), toIso(now));
      return { ok: true, response };
    } catch (primaryErr: any) {
      if (primaryErr?.message?.includes('Invalid date')) {
        // Retry with date-only strings to satisfy stricter parsers.
        const response = await attempt(toDateOnly(sixHoursAgo), toDateOnly(now));
        return { ok: true, response };
      }
      throw primaryErr;
    }
  } catch (err: any) {
    if (err?.message && err.message.includes('Invalid date')) {
      return {
        ok: true,
        warning: 'CodeRabbit responded but rejected the date format. Try setting VITE_CODERABBIT_PROXY_URL to your proxy or update dates to YYYY-MM-DD.',
      };
    }
    if (err?.message && err.message.includes('Failed to fetch')) {
      // Surface as a warning so the UI can keep going but still inform the user.
      return {
        ok: true,
        warning: 'Browser blocked the CodeRabbit ping (CORS). Use a proxy via VITE_CODERABBIT_PROXY_URL or call from backend.',
      };
    }
    throw new Error(err?.message || 'CodeRabbit request failed');
  }
}


