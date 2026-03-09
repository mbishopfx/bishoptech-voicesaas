const VAPI_BASE_URL = process.env.VAPI_BASE_URL || 'https://api.vapi.ai';

export async function vapiFetch(path: string, init: RequestInit = {}) {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) throw new Error('Missing VAPI_API_KEY');

  const res = await fetch(`${VAPI_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  if (!res.ok) {
    throw new Error(`Vapi API error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export async function createAssistant(payload: Record<string, unknown>) {
  return vapiFetch('/assistant', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
