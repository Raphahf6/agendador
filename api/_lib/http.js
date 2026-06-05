export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function badRequest(res, message = 'Requisicao invalida') {
  return json(res, 400, { detail: message });
}

export function unauthorized(res, message = 'Nao autenticado') {
  return json(res, 401, { detail: message });
}

export function forbidden(res, message = 'Acesso negado') {
  return json(res, 403, { detail: message });
}

export function notFound(res, message = 'Nao encontrado') {
  return json(res, 404, { detail: message });
}

export function serverError(res, error) {
  const detail = error?.message || 'Erro interno';
  return json(res, 500, { detail });
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('JSON invalido');
  }
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export function getQuery(req) {
  const origin = `https://${req.headers.host || 'localhost'}`;
  return new URL(req.url, origin).searchParams;
}
