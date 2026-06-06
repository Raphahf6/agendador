import { insert, remove, select } from './supabase-rest.js';

const HORALIS_TABLES = new Set([
  'profiles',
  'clinics',
  'clinic_members',
  'services',
  'professionals',
  'customers',
  'appointments',
  'customer_events',
  'expenses',
  'stock_products',
  'integration_accounts',
]);

const TRIAL_DAYS = 7;

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64);
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export function cleanPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

export function normalizeBrazilPhone(value) {
  const digits = cleanPhone(value);
  if (!digits) return null;
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
}

export async function uniqueClinicSlug(name, preferredSlug) {
  const base = slugify(preferredSlug || name) || 'clinica';
  let candidate = base;
  let suffix = 2;

  while (suffix < 100) {
    const found = await select('clinics', {
      select: 'slug',
      slug: `eq.${candidate}`,
      limit: 1,
    });
    if (!found.length) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return `${base}-${Date.now()}`;
}

export async function getClinicBySlug(slug, { allowMissing = false } = {}) {
  const rows = await select('clinics', {
    select: '*',
    slug: `eq.${slug}`,
    limit: 1,
  });

  if (!rows.length && allowMissing) return null;
  if (!rows.length) {
    const error = new Error('Clinica nao encontrada.');
    error.status = 404;
    throw error;
  }
  return rows[0];
}

export async function getClinicForUser(user) {
  const rows = await select('clinic_members', {
    select: 'clinic_id,role,clinics(*)',
    user_id: `eq.${user.id}`,
    limit: 1,
  });

  if (!rows.length) {
    const error = new Error('Nenhuma clinica vinculada a este usuario.');
    error.status = 404;
    throw error;
  }

  return rows[0].clinics;
}

export async function requireClinicMember(user, slug) {
  const clinic = await getClinicBySlug(slug);
  const rows = await select('clinic_members', {
    select: 'role',
    clinic_id: `eq.${clinic.id}`,
    user_id: `eq.${user.id}`,
    limit: 1,
  });

  if (!rows.length && clinic.owner_id !== user.id) {
    const error = new Error('Usuario sem acesso a esta clinica.');
    error.status = 403;
    throw error;
  }

  return { clinic, role: rows[0]?.role || 'owner' };
}

export async function getServices(clinicId, { activeOnly = false } = {}) {
  const params = {
    select: '*',
    clinic_id: `eq.${clinicId}`,
    order: 'sort_order.asc,created_at.asc',
  };
  if (activeOnly) params.active = 'eq.true';
  return select('services', params);
}

export async function getProfessionals(clinicId, { activeOnly = false } = {}) {
  const params = {
    select: '*',
    clinic_id: `eq.${clinicId}`,
    order: 'created_at.asc',
  };
  if (activeOnly) params.active = 'eq.true';
  return select('professionals', params);
}

export function clinicToLegacy(clinic, services = [], professionals = []) {
  return {
    ...clinic,
    id: clinic.slug,
    salao_id: clinic.slug,
    slug: clinic.slug,
    nome_salao: clinic.nome_salao,
    telefone: clinic.telefone,
    whatsapp: clinic.telefone,
    servicos: services,
    profissionais: professionals,
    setupCompleted: clinic.setup_completed,
    setup_completed: clinic.setup_completed,
    subscriptionStatus: clinic.subscription_status,
    subscription_status: clinic.subscription_status,
    trialEndsAt: clinic.trial_ends_at,
    trial_ends_at: clinic.trial_ends_at,
  };
}

export async function getClinicBundle(slug, options = {}) {
  const clinic = await getClinicBySlug(slug);
  const [services, professionals] = await Promise.all([
    getServices(clinic.id, { activeOnly: options.publicOnly }),
    getProfessionals(clinic.id, { activeOnly: options.publicOnly }),
  ]);
  return clinicToLegacy(clinic, services, professionals);
}

export function isSubscriptionAvailable(clinic) {
  if (clinic.subscription_status === 'active') return true;
  if (clinic.subscription_status !== 'trialing') return false;
  if (!clinic.trial_ends_at) return true;
  return new Date(clinic.trial_ends_at).getTime() > Date.now();
}

export function pickClinicFields(payload) {
  const mapping = {
    nome_salao: 'nome_salao',
    tagline: 'tagline',
    telefone: 'telefone',
    whatsapp: 'telefone',
    email: 'email',
    cpf: 'cpf',
    endereco_completo: 'endereco_completo',
    url_logo: 'url_logo',
    cor_primaria: 'cor_primaria',
    cor_secundaria: 'cor_secundaria',
    email_footer_message: 'email_footer_message',
    formas_pagamento: 'formas_pagamento',
    comodidades: 'comodidades',
    fotos_carousel: 'fotos_carousel',
    horario_trabalho_detalhado: 'horario_trabalho_detalhado',
    setup_completed: 'setup_completed',
    setupCompleted: 'setup_completed',
    subscription_status: 'subscription_status',
    subscriptionStatus: 'subscription_status',
    trial_ends_at: 'trial_ends_at',
    trialEndsAt: 'trial_ends_at',
    mp_public_key: 'mp_public_key',
    sinal_valor: 'sinal_valor',
    google_sync_enabled: 'google_sync_enabled',
    google_calendar_id: 'google_calendar_id',
    redes_sociais: 'redes_sociais',
    is_public: 'is_public',
  };

  const result = {};
  for (const [inputKey, column] of Object.entries(mapping)) {
    if (payload[inputKey] !== undefined) result[column] = payload[inputKey];
  }

  if (result.telefone) result.telefone = normalizeBrazilPhone(result.telefone);
  return result;
}

export async function syncServices(clinicId, services = []) {
  const normalized = services
    .filter((service) => service && service.nome_servico)
    .map((service, index) => ({
      ...(isUuid(service.id) ? { id: service.id } : {}),
      clinic_id: clinicId,
      nome_servico: service.nome_servico,
      duracao_minutos: Number(service.duracao_minutos || service.duration || 30),
      preco: Number(service.preco || 0),
      descricao: service.descricao || null,
      active: service.active !== false,
      sort_order: Number(service.sort_order ?? index),
    }));

  const existing = await getServices(clinicId);
  const incomingIds = normalized.filter((s) => s.id).map((s) => s.id);
  const idsToDelete = existing.map((s) => s.id).filter((id) => !incomingIds.includes(id));

  if (idsToDelete.length) {
    await remove('services', {
      clinic_id: `eq.${clinicId}`,
      id: `in.(${idsToDelete.join(',')})`,
    });
  }

  if (normalized.length) {
    await insert('services', normalized, { upsert: true, onConflict: 'id' });
  }

  return getServices(clinicId);
}

export async function createClinicForOwner(user, payload = {}) {
  const slug = await uniqueClinicSlug(payload.nome_salao, payload.slug);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const clinicRows = await insert('clinics', [{
    owner_id: user.id,
    slug,
    nome_salao: payload.nome_salao || payload.nomeSalao || 'Minha Clinica',
    telefone: normalizeBrazilPhone(payload.numero_whatsapp || payload.whatsapp),
    email: payload.email || user.email,
    cpf: payload.cpf ? cleanPhone(payload.cpf) : null,
    subscription_status: payload.subscription_status === 'active' ? 'active' : 'trialing',
    trial_ends_at: trialEndsAt,
  }]);

  const clinic = clinicRows[0];

  await insert('clinic_members', [{
    clinic_id: clinic.id,
    user_id: user.id,
    role: 'owner',
  }], { upsert: true, onConflict: 'clinic_id,user_id' });

  return clinic;
}

export function assertNoUnknownHoralisTables(tables = []) {
  return tables.filter((name) => !HORALIS_TABLES.has(name));
}
