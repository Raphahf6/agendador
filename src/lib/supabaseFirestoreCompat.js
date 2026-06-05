import { auth } from './supabaseAuthCompat.js';

export const db = { provider: 'supabase-firestore-compat' };

export const Timestamp = {
  now: () => new Date(),
  fromDate: (date) => date,
};

export function collection(_db, ...segments) {
  return { type: 'collection', path: segments };
}

export function doc(_db, ...segments) {
  return { type: 'doc', path: segments };
}

export function where(field, op, value) {
  return { type: 'where', field, op, value: serializeValue(value) };
}

export function orderBy(field, direction = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(count) {
  return { type: 'limit', count };
}

export function query(ref, ...constraints) {
  return { ...ref, constraints };
}

function serializeValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (value?.toDate) return value.toDate().toISOString();
  return value;
}

async function authHeaders() {
  const token = await auth.currentUser?.getIdToken?.();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function snapshotFromRows(rows) {
  return {
    empty: rows.length === 0,
    size: rows.length,
    docs: rows.map((row) => ({
      id: row.id,
      exists: () => true,
      data: () => normalizeCompatRow(row),
    })),
    forEach(callback) {
      this.docs.forEach(callback);
    },
  };
}

function timestampLike(value) {
  if (!value) return null;
  const date = new Date(value);
  return {
    toDate: () => date,
    valueOf: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  };
}

function normalizeCompatRow(row) {
  if (!row || typeof row !== 'object') return row;

  return {
    ...row,
    startTime: row.startTime || timestampLike(row.start_time),
    endTime: row.endTime || timestampLike(row.end_time),
    createdAt: row.createdAt || timestampLike(row.created_at),
    customerName: row.customerName || row.customer_name,
    customerEmail: row.customerEmail || row.customer_email,
    customerPhone: row.customerPhone || row.customer_phone,
    serviceName: row.serviceName || row.service_name,
    servicePrice: row.servicePrice ?? row.service_price,
    durationMinutes: row.durationMinutes ?? row.duration_minutes,
    professionalName: row.professionalName || row.professional_name,
    professionalId: row.professionalId || row.professional_id,
    paymentStatus: row.paymentStatus || row.payment_status,
  };
}

async function fetchCompat(ref) {
  const [root, slug, child] = ref.path || [];

  if (root !== 'cabeleireiros') {
    throw new Error(`Colecao nao suportada no compat Supabase: ${ref.path?.join('/')}`);
  }

  const headers = await authHeaders();

  if (!child) {
    const response = await fetch(`/api/v1/admin/clientes/${slug}`, { headers });
    if (!response.ok) throw new Error('Documento nao encontrado.');
    const data = await response.json();
    return { type: 'doc', row: data };
  }

  const params = new URLSearchParams();
  if (ref.constraints?.length) params.set('constraints', JSON.stringify(ref.constraints));
  const response = await fetch(`/api/v1/admin/firestore-compat/cabeleireiros/${slug}/${child}?${params}`, { headers });
  if (!response.ok) throw new Error('Colecao nao encontrada.');
  return { type: 'collection', rows: await response.json() };
}

export async function getDoc(ref) {
  const result = await fetchCompat(ref);
  return {
    id: ref.path.at(-1),
    exists: () => !!result.row,
    data: () => normalizeCompatRow(result.row),
  };
}

export async function getDocs(ref) {
  const result = await fetchCompat(ref);
  return snapshotFromRows(result.rows || []);
}

export function onSnapshot(ref, onNext, onError) {
  let cancelled = false;
  getDocs(ref)
    .then((snapshot) => {
      if (!cancelled) onNext(snapshot);
    })
    .catch((error) => {
      if (!cancelled && onError) onError(error);
    });

  return () => {
    cancelled = true;
  };
}
