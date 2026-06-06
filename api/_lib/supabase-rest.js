import { getBearerToken } from './http.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.');
  }

  return {
    url: url.replace(/\/$/, ''),
    serviceKey,
  };
}

export async function supabaseFetch(path, options = {}) {
  const { url, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...JSON_HEADERS,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, 500) };
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error_description || data?.error || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function buildRestPath(table, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, String(value));
  });
  const qs = search.toString();
  return `/rest/v1/${table}${qs ? `?${qs}` : ''}`;
}

export async function select(table, params = {}) {
  return supabaseFetch(buildRestPath(table, params));
}

export async function insert(table, rows, options = {}) {
  const params = {};
  if (options.onConflict) params.on_conflict = options.onConflict;
  return supabaseFetch(buildRestPath(table, params), {
    method: 'POST',
    headers: {
      Prefer: `${options.upsert ? 'resolution=merge-duplicates,' : ''}return=representation`,
    },
    body: JSON.stringify(rows),
  });
}

export async function patch(table, filters, values) {
  return supabaseFetch(buildRestPath(table, filters), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(values),
  });
}

export async function remove(table, filters) {
  return supabaseFetch(buildRestPath(table, filters), {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  });
}

export async function verifyUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const { url, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
}

export async function createAuthUser({ email, password, userMetadata = {} }) {
  return supabaseFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    }),
  });
}
