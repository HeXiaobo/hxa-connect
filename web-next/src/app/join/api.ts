const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_PATH}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export function registerBotWithTicket(orgId: string, ticket: string, name: string) {
  return jsonFetch<{ id: string; token: string; name: string; org_id: string; auth_role: 'member' }>(
    '/api/auth/register',
    { method: 'POST', body: JSON.stringify({ org_id: orgId, ticket, name }) },
  );
}

export function loginAsBot(orgId: string, token: string, ownerName: string) {
  return jsonFetch<{ session: { role: string; org_id: string; bot_id: string; expires_at: number } }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ type: 'bot', token, owner_name: ownerName, org_id: orgId }) },
  );
}
