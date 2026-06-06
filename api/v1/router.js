import handler, { handleWebRequest as catchAllWebRequest } from './[...path].js';

function rewrittenApiUrl(rawUrl, headers = {}) {
  const url = new URL(rawUrl, `https://${headers.host || 'localhost'}`);
  const path = url.searchParams.get('path');
  if (!path) return rawUrl;

  const searchParams = new URLSearchParams(url.searchParams);
  searchParams.delete('path');

  const cleanPath = String(path).replace(/^\/+/, '');
  const search = searchParams.toString();
  return `/api/v1/${cleanPath}${search ? `?${search}` : ''}`;
}

export default async function router(req, res) {
  const originalUrl = req.url;
  req.url = rewrittenApiUrl(req.url, req.headers);

  try {
    return await handler(req, res);
  } finally {
    req.url = originalUrl;
  }
}

export async function handleWebRequest(request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  if (!path) return catchAllWebRequest(request);

  const searchParams = new URLSearchParams(url.searchParams);
  searchParams.delete('path');

  const cleanPath = String(path).replace(/^\/+/, '');
  const rewrittenUrl = new URL(`/api/v1/${cleanPath}`, url.origin);
  searchParams.forEach((value, key) => rewrittenUrl.searchParams.append(key, value));

  return catchAllWebRequest(new Request(rewrittenUrl.toString(), request));
}

export const GET = handleWebRequest;
export const POST = handleWebRequest;
export const PUT = handleWebRequest;
export const PATCH = handleWebRequest;
export const DELETE = handleWebRequest;
export const OPTIONS = handleWebRequest;
