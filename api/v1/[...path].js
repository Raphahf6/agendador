import { badRequest, forbidden, getQuery, json, notFound, readJson, serverError, unauthorized } from '../_lib/http.js';
import { createAuthUser, insert, patch, remove, select, verifyUser } from '../_lib/supabase-rest.js';
import {
  cleanPhone,
  clinicToLegacy,
  createClinicForOwner,
  getClinicBundle,
  getClinicBySlug,
  getClinicForUser,
  getProfessionals,
  getServices,
  isSubscriptionAvailable,
  isUuid,
  pickClinicFields,
  requireClinicMember,
  syncServices,
} from '../_lib/horalis.js';

const SAO_PAULO_OFFSET = '-03:00';
const DEFAULT_AGENT_MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-5.4-mini';
const DEFAULT_AGENT_FALLBACK = 'Vou confirmar essa informacao com a equipe e ja retorno com seguranca.';
const DEFAULT_AGENT_HANDOFF = 'Vou chamar uma pessoa da equipe para continuar seu atendimento.';

function routeParts(req) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  return url.pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

function minutesFromHHMM(value) {
  const [h, m] = String(value || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function hhmmFromMinutes(total) {
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function defaultSchedule() {
  return {
    monday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '13:00', hasLunch: false },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00', hasLunch: false },
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeStringList(value, maxItems = 12) {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
      .split('\n')
      .map((line) => line.trim());

  return source
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function defaultAgentSettings(clinic) {
  return {
    enabled: false,
    attendant_name: 'Atendente Horalis',
    persona_summary: `Atendimento da ${clinic?.nome_salao || 'clinica'}.`,
    tone_instructions: 'Use mensagens curtas, naturais, educadas e acolhedoras. Evite parecer robotico.',
    business_rules: 'Nao confirme horarios sem consultar a agenda. Quando nao tiver certeza, encaminhe para atendimento humano.',
    opening_message: 'Oi, tudo bem? Me passa o melhor dia e horario para voce, por favor?',
    conversation_example: '',
    sample_dialogues: [],
    fallback_message: DEFAULT_AGENT_FALLBACK,
    handoff_message: DEFAULT_AGENT_HANDOFF,
    model: DEFAULT_AGENT_MODEL,
    max_output_tokens: 450,
  };
}

function pickAgentSettings(payload = {}, clinic) {
  const defaults = defaultAgentSettings(clinic);
  const model = String(payload.model || defaults.model).trim();

  return {
    enabled: payload.enabled === true,
    attendant_name: String(payload.attendant_name || defaults.attendant_name).trim().slice(0, 80),
    persona_summary: String(payload.persona_summary || defaults.persona_summary).trim().slice(0, 2000),
    tone_instructions: String(payload.tone_instructions || defaults.tone_instructions).trim().slice(0, 2000),
    business_rules: String(payload.business_rules || defaults.business_rules).trim().slice(0, 4000),
    opening_message: String(payload.opening_message || defaults.opening_message).trim().slice(0, 800),
    conversation_example: String(payload.conversation_example || defaults.conversation_example).trim().slice(0, 8000),
    sample_dialogues: normalizeStringList(payload.sample_dialogues, 12),
    fallback_message: String(payload.fallback_message || defaults.fallback_message).trim().slice(0, 800),
    handoff_message: String(payload.handoff_message || defaults.handoff_message).trim().slice(0, 800),
    model: model || DEFAULT_AGENT_MODEL,
    max_output_tokens: clampNumber(payload.max_output_tokens, 120, 1200, defaults.max_output_tokens),
  };
}

async function loadAgentSettings(clinic) {
  const rows = await select('ai_agent_settings', {
    select: '*',
    clinic_id: `eq.${clinic.id}`,
    limit: 1,
  });

  return rows[0] ? { ...defaultAgentSettings(clinic), ...rows[0] } : {
    clinic_id: clinic.id,
    ...defaultAgentSettings(clinic),
  };
}

function weekdayKey(dateString) {
  const date = new Date(`${dateString}T12:00:00${SAO_PAULO_OFFSET}`);
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
}

function appointmentToClient(row) {
  return {
    ...row,
    startTime: row.start_time,
    endTime: row.end_time,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    serviceName: row.service_name,
    servicePrice: row.service_price,
    durationMinutes: row.duration_minutes,
    professionalName: row.professional_name,
    professionalId: row.professional_id,
    paymentStatus: row.payment_status,
  };
}

function addDateFilters(params, start, end) {
  const filters = [];
  if (start) filters.push(`start_time.gte.${start}`);
  if (end) filters.push(`start_time.lte.${end}`);

  if (filters.length > 1) params.and = `(${filters.join(',')})`;
  else if (start) params.start_time = `gte.${start}`;
  else if (end) params.start_time = `lte.${end}`;
}

function datePart(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function sameMinute(a, b) {
  const first = new Date(a);
  const second = new Date(b);
  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return false;
  return Math.abs(first.getTime() - second.getTime()) < 60 * 1000;
}

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || 'Cliente';
}

async function requireUser(req) {
  const user = await verifyUser(req);
  if (!user) {
    const error = new Error('Sessao expirada. Faca login novamente.');
    error.status = 401;
    throw error;
  }
  return user;
}

async function createOrLoadOwner(payload, req) {
  const loggedUser = await verifyUser(req);
  if (loggedUser) return loggedUser;

  if (!payload.email || !payload.password) {
    const error = new Error('Informe email e senha para criar a conta.');
    error.status = 400;
    throw error;
  }

  return createAuthUser({
    email: payload.email,
    password: String(payload.password),
    userMetadata: {
      full_name: payload.nome_salao || payload.nomeSalao || payload.email,
      clinic_name: payload.nome_salao || payload.nomeSalao,
    },
  });
}

async function ensureClinicForOwner(user, payload) {
  const existingRows = await select('clinics', {
    select: '*',
    owner_id: `eq.${user.id}`,
    limit: 1,
  });
  if (existingRows.length) return existingRows[0];
  return createClinicForOwner(user, payload);
}

async function handleRegisterOwner(req, res) {
  const payload = await readJson(req);
  const user = await createOrLoadOwner(payload, req);
  const clinic = await ensureClinicForOwner(user, payload);
  return json(res, 201, {
    ok: true,
    salao_id: clinic.slug,
    slug: clinic.slug,
    subscription_status: clinic.subscription_status,
    trial_ends_at: clinic.trial_ends_at,
  });
}

async function createMercadoPagoPayment(payload, metadata = {}) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    if (process.env.HORALIS_ALLOW_DEV_PAYMENTS === 'true') {
      return {
        id: `dev-${Date.now()}`,
        status: 'approved',
        point_of_interaction: {
          transaction_data: {
            qr_code: 'PIX_DEV_MODE',
            qr_code_base64: '',
          },
        },
      };
    }
    const error = new Error('Mercado Pago nao configurado na Vercel.');
    error.status = 501;
    throw error;
  }

  const body = {
    transaction_amount: Number(payload.transaction_amount || 0),
    payment_method_id: payload.payment_method_id,
    token: payload.token,
    issuer_id: payload.issuer_id,
    installments: payload.installments,
    description: metadata.description || 'Horalis',
    external_reference: metadata.external_reference,
    payer: payload.payer,
    metadata,
  };

  Object.keys(body).forEach((key) => body[key] === undefined && delete body[key]);

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': metadata.idempotency_key || crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.message || 'Erro ao criar pagamento no Mercado Pago.');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function appointmentStatusFromPayment(paymentStatus) {
  return paymentStatus === 'approved' ? 'confirmado' : 'pending_payment';
}

async function handlePaidSignup(req, res) {
  const payload = await readJson(req);
  const payment = payload.payment_method_id
    ? await createMercadoPagoPayment(payload, { description: 'Assinatura Horalis', external_reference: payload.email })
    : null;

  const user = await createOrLoadOwner(payload, req);
  const clinic = await ensureClinicForOwner(user, {
    ...payload,
    subscription_status: payment?.status === 'approved' ? 'active' : 'trialing',
  });

  if (payment?.payment_method_id === 'pix' || payload.payment_method_id === 'pix') {
    const transaction = payment.point_of_interaction?.transaction_data || {};
    return json(res, 201, {
      status: payment.status,
      salao_id: clinic.slug,
      payment_data: {
        payment_id: payment.id,
        qr_code: transaction.qr_code,
        qr_code_base64: transaction.qr_code_base64,
      },
    });
  }

  return json(res, 201, { status: payment?.status || 'approved', salao_id: clinic.slug });
}

async function handlePaymentStatus(_req, res, paymentId) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN || String(paymentId).startsWith('dev-')) {
    return json(res, 200, { status: 'approved' });
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
  });
  const data = await response.json();
  if (!response.ok) return json(res, response.status, { detail: data?.message || 'Erro ao consultar pagamento.' });
  return json(res, 200, { status: data.status, raw_status: data.status_detail });
}

async function handlePublicServices(_req, res, slug) {
  const clinic = await getClinicBySlug(slug);
  if (!isSubscriptionAvailable(clinic)) return forbidden(res, 'Estabelecimento indisponivel.');
  const [services, professionals] = await Promise.all([
    getServices(clinic.id, { activeOnly: true }),
    getProfessionals(clinic.id, { activeOnly: true }),
  ]);
  return json(res, 200, clinicToLegacy(clinic, services, professionals));
}

async function getAvailableSlotsForClinic(clinic, { serviceId, date, professionalId = null }) {
  if (!serviceId || !date) {
    const error = new Error('service_id e date sao obrigatorios.');
    error.status = 400;
    throw error;
  }

  const services = await select('services', { select: '*', id: `eq.${serviceId}`, clinic_id: `eq.${clinic.id}`, limit: 1 });
  if (!services.length) {
    const error = new Error('Servico nao encontrado.');
    error.status = 404;
    throw error;
  }

  let schedule = clinic.horario_trabalho_detalhado || defaultSchedule();
  let professional = null;

  if (professionalId && isUuid(professionalId)) {
    const proRows = await select('professionals', {
      select: '*',
      id: `eq.${professionalId}`,
      clinic_id: `eq.${clinic.id}`,
      active: 'eq.true',
      limit: 1,
    });
    professional = proRows[0] || null;

    if (!professional) return { service: services[0], professional: null, slots: [] };
    if (Array.isArray(professional.servicos) && professional.servicos.length && !professional.servicos.includes(serviceId)) {
      return { service: services[0], professional, slots: [] };
    }
    if (professional.horario_trabalho && Object.keys(professional.horario_trabalho).length) {
      schedule = { ...schedule, ...professional.horario_trabalho };
    }
  }

  const day = schedule[weekdayKey(date)];
  if (!day?.isOpen) return { service: services[0], professional, slots: [] };

  const start = minutesFromHHMM(day.openTime);
  const end = minutesFromHHMM(day.closeTime);
  const duration = Number(services[0].duracao_minutos || 30);
  const appointmentParams = {
    select: 'start_time,end_time,professional_id',
    clinic_id: `eq.${clinic.id}`,
    start_time: `gte.${date}T00:00:00${SAO_PAULO_OFFSET}`,
    end_time: `lte.${date}T23:59:59${SAO_PAULO_OFFSET}`,
    status: 'neq.cancelado',
  };
  if (professionalId && isUuid(professionalId)) {
    appointmentParams.or = `(professional_id.is.null,professional_id.eq.${professionalId})`;
  }

  const appointments = await select('appointments', appointmentParams);
  const slots = [];
  for (let cursor = start; cursor + duration <= end; cursor += 15) {
    if (day.hasLunch) {
      const lunchStart = minutesFromHHMM(day.lunchStart);
      const lunchEnd = minutesFromHHMM(day.lunchEnd);
      if (cursor < lunchEnd && cursor + duration > lunchStart) continue;
    }

    const slotStart = new Date(`${date}T${hhmmFromMinutes(cursor)}:00${SAO_PAULO_OFFSET}`);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
    if (slotStart.getTime() < Date.now()) continue;

    const blocked = appointments.some((appointment) => {
      const apptStart = new Date(appointment.start_time);
      const apptEnd = new Date(appointment.end_time);
      return slotStart < apptEnd && slotEnd > apptStart;
    });
    if (!blocked) slots.push(slotStart.toISOString());
  }

  return { service: services[0], professional, slots };
}

async function handleAvailableSlots(req, res, slug) {
  const query = getQuery(req);
  const serviceId = query.get('service_id');
  const date = query.get('date');
  const professionalId = query.get('professional_id');

  if (!serviceId || !date) return badRequest(res, 'service_id e date sao obrigatorios.');

  const clinic = await getClinicBySlug(slug);
  const { slots } = await getAvailableSlotsForClinic(clinic, { serviceId, date, professionalId });
  return json(res, 200, { horarios_disponiveis: slots });
}

async function upsertCustomer(clinicId, payload) {
  const whatsapp = cleanPhone(payload.customer_phone || payload.whatsapp);
  const rows = await insert('customers', [{
    clinic_id: clinicId,
    nome: payload.customer_name || payload.nome || 'Cliente',
    email: payload.customer_email || payload.email || null,
    whatsapp,
  }], { upsert: true, onConflict: 'clinic_id,whatsapp' });
  return rows[0];
}

async function createAppointmentFromPayload(clinic, payload, payment = {}) {
  const serviceRows = payload.service_id
    ? await select('services', { select: '*', id: `eq.${payload.service_id}`, clinic_id: `eq.${clinic.id}`, limit: 1 })
    : [];
  const service = serviceRows[0] || {};
  const customer = await upsertCustomer(clinic.id, payload);
  const start = new Date(payload.start_time);
  const duration = Number(service.duracao_minutos || payload.duration_minutes || 30);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const rows = await insert('appointments', [{
    clinic_id: clinic.id,
    service_id: service.id || null,
    professional_id: isUuid(payload.professional_id) ? payload.professional_id : null,
    customer_id: customer.id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: payload.status || 'confirmado',
    service_name: service.nome_servico || payload.service_name,
    service_price: Number(service.preco || payload.service_price || 0),
    duration_minutes: duration,
    customer_name: payload.customer_name || customer.nome,
    customer_email: payload.customer_email || customer.email,
    customer_phone: payload.customer_phone || customer.whatsapp,
    professional_name: payload.professional_name || null,
    payment_status: payment.status || payload.payment_status || 'free',
    payment_id: payment.payment_id || null,
    notes: payload.notes || null,
  }]);

  return rows[0];
}

async function handleCreateAppointment(req, res, isAdmin = false) {
  const payload = await readJson(req);
  const slug = payload.salao_id || payload.slug;
  if (!slug) return badRequest(res, 'salao_id e obrigatorio.');

  const clinic = await getClinicBySlug(slug);
  if (isAdmin) {
    const user = await requireUser(req);
    await requireClinicMember(user, slug);
  }

  const appointment = await createAppointmentFromPayload(clinic, payload);
  return json(res, 201, { ...appointment, agendamento_id: appointment.id });
}

async function handleAppointmentPayment(req, res) {
  const payload = await readJson(req);
  const clinic = await getClinicBySlug(payload.salao_id);
  const payment = await createMercadoPagoPayment(payload, { description: 'Sinal de agendamento Horalis', external_reference: clinic.slug });
  const appointment = await createAppointmentFromPayload(clinic, {
    ...payload,
    status: appointmentStatusFromPayment(payment.status),
  }, {
    status: payment.status,
    payment_id: payment.id,
  });
  const transaction = payment.point_of_interaction?.transaction_data || {};
  return json(res, 201, {
    status: payment.status,
    payment_data: {
      payment_id: payment.id,
      agendamento_id_ref: appointment.id,
      qr_code: transaction.qr_code,
      qr_code_base64: transaction.qr_code_base64,
    },
  });
}

async function handleAdminClinic(req, res, user, slug) {
  const { clinic } = await requireClinicMember(user, slug);

  if (req.method === 'GET') {
    const bundle = await getClinicBundle(slug);
    return json(res, 200, bundle);
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const payload = await readJson(req);
    const fields = pickClinicFields(payload);
    if (Object.keys(fields).length) await patch('clinics', { id: `eq.${clinic.id}` }, fields);
    if (Array.isArray(payload.servicos)) await syncServices(clinic.id, payload.servicos);
    const bundle = await getClinicBundle(slug);
    return json(res, 200, bundle);
  }

  return notFound(res);
}

async function handleTeam(req, res, user, id = null) {
  const clinic = await getClinicForUser(user);

  if (req.method === 'GET') {
    return json(res, 200, await getProfessionals(clinic.id));
  }

  if (req.method === 'POST') {
    const payload = await readJson(req);
    const rows = await insert('professionals', [{ ...payload, clinic_id: clinic.id }]);
    return json(res, 201, rows[0]);
  }

  if (id && req.method === 'PUT') {
    const payload = await readJson(req);
    const rows = await patch('professionals', { id: `eq.${id}`, clinic_id: `eq.${clinic.id}` }, payload);
    return json(res, 200, rows[0]);
  }

  if (id && req.method === 'DELETE') {
    await remove('professionals', { id: `eq.${id}`, clinic_id: `eq.${clinic.id}` });
    return json(res, 200, { ok: true });
  }

  return notFound(res);
}

function productStatus(product) {
  if (Number(product.quantidade_atual) <= 0) return 'critical';
  if (Number(product.quantidade_atual) <= Number(product.quantidade_minima)) return 'low';
  return 'ok';
}

async function handleStock(req, res, user, parts) {
  const clinic = await getClinicForUser(user);
  const id = parts[3];

  if (req.method === 'GET') {
    const rows = await select('stock_products', { select: '*', clinic_id: `eq.${clinic.id}`, order: 'created_at.desc' });
    return json(res, 200, rows.map((row) => ({ ...row, status: productStatus(row) })));
  }

  if (req.method === 'POST') {
    const payload = await readJson(req);
    const rows = await insert('stock_products', [{ ...payload, clinic_id: clinic.id }]);
    return json(res, 201, { ...rows[0], status: productStatus(rows[0]) });
  }

  if (id && req.method === 'PUT') {
    const payload = await readJson(req);
    const rows = await patch('stock_products', { id: `eq.${id}`, clinic_id: `eq.${clinic.id}` }, payload);
    return json(res, 200, { ...rows[0], status: productStatus(rows[0]) });
  }

  if (id && parts[4] === 'ajuste' && req.method === 'PATCH') {
    const amount = Number(getQuery(req).get('amount') || 0);
    const current = await select('stock_products', { select: '*', id: `eq.${id}`, clinic_id: `eq.${clinic.id}`, limit: 1 });
    if (!current.length) return notFound(res, 'Produto nao encontrado.');
    const rows = await patch('stock_products', { id: `eq.${id}`, clinic_id: `eq.${clinic.id}` }, {
      quantidade_atual: Math.max(0, Number(current[0].quantidade_atual) + amount),
    });
    return json(res, 200, { ...rows[0], status: productStatus(rows[0]) });
  }

  if (id && req.method === 'DELETE') {
    await remove('stock_products', { id: `eq.${id}`, clinic_id: `eq.${clinic.id}` });
    return json(res, 200, { ok: true });
  }

  return notFound(res);
}

async function handleFinance(req, res, user, parts) {
  const clinic = await getClinicForUser(user);

  if (parts[2] === 'resumo' && req.method === 'GET') {
    const expenses = await select('expenses', { select: '*', clinic_id: `eq.${clinic.id}`, order: 'date.desc' });
    const appointments = await select('appointments', { select: 'service_price,start_time,status', clinic_id: `eq.${clinic.id}` });
    const totalRevenue = appointments.filter((a) => a.status !== 'cancelado').reduce((sum, a) => sum + Number(a.service_price || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return json(res, 200, {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalExpenses,
      expenses_list: expenses,
      chart_data: buildChartData(appointments, expenses),
    });
  }

  if (parts[2] === 'despesas' && req.method === 'POST') {
    const payload = await readJson(req);
    const rows = await insert('expenses', [{ ...payload, clinic_id: clinic.id }]);
    return json(res, 201, rows[0]);
  }

  const id = parts[3];
  if (parts[2] === 'despesas' && id && parts[4] === 'toggle' && req.method === 'PATCH') {
    const current = await select('expenses', { select: '*', id: `eq.${id}`, clinic_id: `eq.${clinic.id}`, limit: 1 });
    if (!current.length) return notFound(res, 'Despesa nao encontrada.');
    const rows = await patch('expenses', { id: `eq.${id}`, clinic_id: `eq.${clinic.id}` }, {
      status: current[0].status === 'paid' ? 'pending' : 'paid',
    });
    return json(res, 200, rows[0]);
  }

  if (parts[2] === 'despesas' && id && req.method === 'DELETE') {
    await remove('expenses', { id: `eq.${id}`, clinic_id: `eq.${clinic.id}` });
    return json(res, 200, { ok: true });
  }

  return notFound(res);
}

function buildChartData(appointments, expenses) {
  const map = new Map();
  const touch = (date) => {
    const key = String(date || '').slice(0, 10);
    if (!map.has(key)) map.set(key, { day: key, entradas: 0, saidas: 0 });
    return map.get(key);
  };
  appointments.forEach((a) => {
    if (a.status !== 'cancelado') touch(a.start_time).entradas += Number(a.service_price || 0);
  });
  expenses.forEach((e) => {
    touch(e.date).saidas += Number(e.amount || 0);
  });
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
}

async function handleCrm(req, res, user, parts) {
  const slug = parts[2];
  const { clinic } = await requireClinicMember(user, slug);

  if (parts[3] === 'lista-crm' && req.method === 'GET') {
    const customers = await select('customers', { select: '*', clinic_id: `eq.${clinic.id}`, order: 'created_at.desc' });
    const appointments = await select('appointments', { select: 'customer_id,start_time', clinic_id: `eq.${clinic.id}` });
    const lastByCustomer = new Map();
    appointments.forEach((appt) => {
      const current = lastByCustomer.get(appt.customer_id);
      if (!current || new Date(appt.start_time) > new Date(current)) lastByCustomer.set(appt.customer_id, appt.start_time);
    });
    return json(res, 200, customers.map((customer) => ({
      ...customer,
      ultima_visita: lastByCustomer.get(customer.id) || null,
    })));
  }

  if (parts[3] === 'detalhes-crm' && parts[4] && req.method === 'GET') {
    const id = parts[4];
    const customers = await select('customers', { select: '*', id: `eq.${id}`, clinic_id: `eq.${clinic.id}`, limit: 1 });
    if (!customers.length) return notFound(res, 'Cliente nao encontrado.');
    const [appointments, events] = await Promise.all([
      select('appointments', { select: '*', customer_id: `eq.${id}`, clinic_id: `eq.${clinic.id}`, order: 'start_time.desc' }),
      select('customer_events', { select: '*', customer_id: `eq.${id}`, clinic_id: `eq.${clinic.id}`, order: 'data_evento.desc' }),
    ]);
    return json(res, 200, { cliente: customers[0], agendamentos: appointments, timeline: events });
  }

  return notFound(res);
}

function summarizeSchedule(schedule = {}) {
  const labels = {
    monday: 'segunda',
    tuesday: 'terca',
    wednesday: 'quarta',
    thursday: 'quinta',
    friday: 'sexta',
    saturday: 'sabado',
    sunday: 'domingo',
  };

  return Object.entries(labels).map(([key, label]) => {
    const day = schedule?.[key];
    if (!day?.isOpen) return `${label}: fechado`;
    const lunch = day.hasLunch ? `, intervalo ${day.lunchStart}-${day.lunchEnd}` : '';
    return `${label}: ${day.openTime}-${day.closeTime}${lunch}`;
  }).join('\n');
}

function buildAgentInstructions({ clinic, services, professionals, settings }) {
  const serviceLines = services
    .slice(0, 30)
    .map((service) => `- ${service.nome_servico}: ${service.duracao_minutos || 30} min, R$ ${Number(service.preco || 0).toFixed(2)}${service.descricao ? `, ${service.descricao}` : ''}`)
    .join('\n') || '- Nenhum servico cadastrado';

  const professionalLines = professionals
    .slice(0, 20)
    .map((professional) => `- ${professional.nome}${professional.cargo ? ` (${professional.cargo})` : ''}`)
    .join('\n') || '- Nenhum profissional cadastrado';

  const samples = normalizeStringList(settings.sample_dialogues)
    .map((sample) => `- ${sample}`)
    .join('\n') || '- Sem exemplos cadastrados';

  const openingMessage = String(settings.opening_message || '').trim() || '- Sem mensagem inicial configurada';
  const conversationExample = String(settings.conversation_example || '').trim() || '- Sem exemplo completo cadastrado';

  return [
    `Voce e ${settings.attendant_name}, agente de atendimento da ${clinic.nome_salao}.`,
    'Responda sempre em portugues do Brasil.',
    'Sua missao e atender com linguagem humana, objetiva e fiel ao estilo configurado pela clinica.',
    'Nao invente disponibilidade, preco, profissional, regra, pagamento ou procedimento que nao esteja no contexto.',
    'A mensagem inicial configurada tem prioridade sobre exemplos soltos no primeiro contato.',
    'Use o exemplo completo como referencia de estilo, ritmo, ordem das perguntas e forma de confirmar dados.',
    'Nunca copie nomes, telefones, datas ou horarios ficticios do exemplo completo; use apenas dados reais do contexto ou do cliente.',
    'Quando o cliente pedir para marcar, remarcar, cancelar ou confirmar horario, colete os dados necessarios e diga que vai consultar a agenda antes de confirmar.',
    'Se faltar informacao, faca uma pergunta curta por vez.',
    'Se a pergunta sair do escopo da clinica ou houver incerteza, use a mensagem de fallback ou encaminhe para humano.',
    '',
    `Personalidade:\n${settings.persona_summary}`,
    '',
    `Tom e estilo:\n${settings.tone_instructions}`,
    '',
    `Regras do negocio:\n${settings.business_rules}`,
    '',
    `Mensagem inicial fixa:\n${openingMessage}`,
    '',
    `Exemplo completo de atendimento para se basear:\n${conversationExample}`,
    '',
    `Fallback:\n${settings.fallback_message}`,
    '',
    `Handoff humano:\n${settings.handoff_message}`,
    '',
    `Frases curtas de referencia:\n${samples}`,
    '',
    `Servicos cadastrados:\n${serviceLines}`,
    '',
    `Equipe cadastrada:\n${professionalLines}`,
    '',
    `Horarios da clinica:\n${summarizeSchedule(clinic.horario_trabalho_detalhado || defaultSchedule())}`,
  ].join('\n');
}

function extractOpenAIText(data) {
  if (typeof data?.output_text === 'string') return data.output_text.trim();

  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
      if (typeof content?.output_text === 'string') chunks.push(content.output_text);
    }
  }

  return chunks.join('\n').trim();
}

async function createOpenAIResponse({ instructions, input, model, maxOutputTokens, metadata }) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('Configure OPENAI_API_KEY na Vercel para usar o agente.');
    error.status = 501;
    throw error;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      metadata,
    }),
  });

  const raw = await response.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: { message: raw.slice(0, 500) } };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.message || 'Erro ao chamar OpenAI.');
    error.status = response.status;
    throw error;
  }

  return {
    id: data.id,
    text: extractOpenAIText(data) || DEFAULT_AGENT_FALLBACK,
  };
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || raw;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function nullableText(value) {
  const text = String(value ?? '').trim();
  return !text || text.toLowerCase() === 'null' ? null : text;
}

function normalizeAgentPlan(plan = {}) {
  const allowed = new Set(['answer', 'list_slots', 'create_booking', 'handoff']);
  const action = allowed.has(plan.action) ? plan.action : 'answer';
  return {
    action,
    reply: String(plan.reply || '').trim(),
    service_id: nullableText(plan.service_id),
    professional_id: isUuid(plan.professional_id) ? plan.professional_id : null,
    date: nullableText(plan.date)?.slice(0, 10) || null,
    start_time: nullableText(plan.start_time),
    customer_name: String(plan.customer_name || '').trim(),
    customer_phone: cleanPhone(plan.customer_phone),
    customer_email: String(plan.customer_email || '').trim(),
    notes: String(plan.notes || '').trim(),
    confidence: clampNumber(plan.confidence, 0, 1, 0),
  };
}

function buildAgentDecisionInstructions({ clinic, services, professionals, settings }) {
  return [
    buildAgentInstructions({ clinic, services, professionals, settings }),
    '',
    'Escolha uma acao operacional segura para o backend executar.',
    'Responda somente com JSON valido, sem markdown e sem texto fora do JSON.',
    'Acoes permitidas:',
    '- answer: responder ou pedir dado faltante.',
    '- list_slots: consultar horarios disponiveis para service_id/date/professional_id opcional.',
    '- create_booking: criar agendamento somente quando tiver service_id, start_time ISO, customer_name e customer_phone. Se houver sinal, customer_email tambem sera necessario.',
    '- handoff: encaminhar para humano.',
    '',
    'Regras criticas:',
    '- Nunca use create_booking se o cliente ainda nao confirmou explicitamente o horario.',
    '- Nunca invente IDs. Use apenas service_id e professional_id do contexto.',
    '- Se for o primeiro contato e o cliente mandou apenas saudacao ou mensagem vaga, use answer com a mensagem inicial configurada como base.',
    '- Se o cliente ja informou servico, data, horario ou preferencia concreta, nao reinicie o fluxo; continue a partir do dado recebido.',
    '- Se faltar servico, data, horario, nome ou telefone, use answer e pergunte apenas o proximo dado.',
    '- Se o cliente pedir opcoes de horario, use list_slots.',
    '- Se houver duvida, use answer ou handoff.',
    '',
    'Formato JSON:',
    '{"action":"answer|list_slots|create_booking|handoff","reply":"mensagem se for answer/handoff","service_id":"uuid ou null","professional_id":"uuid ou null","date":"YYYY-MM-DD ou null","start_time":"ISO ou null","customer_name":"","customer_phone":"","customer_email":"","notes":"","confidence":0.0}',
  ].join('\n');
}

function buildAgentContextPayload({ message, history = [], clinic, services, professionals, settings }) {
  return JSON.stringify({
    now: new Date().toISOString(),
    timezone: 'America/Sao_Paulo',
    message,
    history: Array.isArray(history) ? history.slice(-8) : [],
    conversation_state: {
      is_first_turn: !Array.isArray(history) || history.length === 0,
      opening_message: settings.opening_message || '',
      has_full_example: Boolean(settings.conversation_example),
    },
    clinic: {
      slug: clinic.slug,
      nome_salao: clinic.nome_salao,
      sinal_valor: Number(clinic.sinal_valor || 0),
      cobrar_sinal: Number(clinic.sinal_valor || 0) > 0,
      google_sync_enabled: clinic.google_sync_enabled === true,
      horario_trabalho_detalhado: clinic.horario_trabalho_detalhado || defaultSchedule(),
    },
    services: services.map((service) => ({
      id: service.id,
      nome_servico: service.nome_servico,
      duracao_minutos: service.duracao_minutos,
      preco: service.preco,
      descricao: service.descricao,
    })),
    professionals: professionals.map((professional) => ({
      id: professional.id,
      nome: professional.nome,
      cargo: professional.cargo,
      servicos: professional.servicos || [],
    })),
  });
}

async function planAgentAction({ message, history, clinic, services, professionals, settings }) {
  const response = await createOpenAIResponse({
    instructions: buildAgentDecisionInstructions({ clinic, services, professionals, settings }),
    input: buildAgentContextPayload({ message, history, clinic, services, professionals, settings }),
    model: settings.model || DEFAULT_AGENT_MODEL,
    maxOutputTokens: 650,
    metadata: {
      product: 'horalis',
      clinic_id: clinic.id,
      route: 'agent-plan',
    },
  });

  const parsed = parseJsonObject(response.text);
  return {
    response_id: response.id,
    raw: response.text,
    plan: normalizeAgentPlan(parsed || { action: 'answer', reply: settings.fallback_message }),
  };
}

function formatSlot(slot) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(slot));
  } catch {
    return slot;
  }
}

function missingFieldResult(field, reply) {
  return {
    status: 'needs_info',
    field,
    reply,
    actions: [],
  };
}

async function executeAgentPlan(plan, { clinic, services, professionals, settings }) {
  if (plan.action === 'handoff') {
    return {
      status: 'handoff',
      reply: plan.reply || settings.handoff_message,
      actions: [{ type: 'handoff' }],
    };
  }

  if (plan.action === 'answer') {
    return {
      status: 'answered',
      reply: plan.reply || settings.fallback_message,
      actions: [],
    };
  }

  const service = services.find((item) => item.id === plan.service_id);
  if (!service) return missingFieldResult('service_id', 'Qual servico voce gostaria de agendar?');

  if (plan.action === 'list_slots') {
    if (!plan.date) return missingFieldResult('date', 'Para qual dia voce gostaria de ver horarios?');
    const { slots, professional } = await getAvailableSlotsForClinic(clinic, {
      serviceId: service.id,
      date: plan.date,
      professionalId: plan.professional_id,
    });

    return {
      status: 'slots_found',
      service,
      professional,
      slots,
      reply: slots.length
        ? `Encontrei estes horarios para ${service.nome_servico}: ${slots.slice(0, 5).map(formatSlot).join(', ')}.`
        : `Nao encontrei horarios livres para ${service.nome_servico} nessa data.`,
      actions: [{
        type: 'list_slots',
        service_id: service.id,
        date: plan.date,
        professional_id: plan.professional_id,
        slots: slots.slice(0, 10),
      }],
    };
  }

  if (plan.action === 'create_booking') {
    if (!plan.start_time) return missingFieldResult('start_time', 'Qual horario voce quer confirmar?');
    if (!plan.customer_name) return missingFieldResult('customer_name', 'Me passa seu nome completo para eu finalizar.');
    if (!plan.customer_phone) return missingFieldResult('customer_phone', 'Me passa seu WhatsApp para eu finalizar o agendamento.');

    const signalValue = Number(clinic.sinal_valor || 0);
    if (signalValue > 0 && !plan.customer_email) {
      return missingFieldResult('customer_email', 'Para gerar o PIX do sinal, me passa tambem seu e-mail.');
    }

    const bookingDate = plan.date || datePart(plan.start_time);
    if (!bookingDate) return missingFieldResult('date', 'Nao consegui entender a data do horario. Pode me enviar novamente?');

    const { slots, professional } = await getAvailableSlotsForClinic(clinic, {
      serviceId: service.id,
      date: bookingDate,
      professionalId: plan.professional_id,
    });

    const selectedSlot = slots.find((slot) => sameMinute(slot, plan.start_time));
    if (!selectedSlot) {
      return {
        status: 'slot_unavailable',
        service,
        professional,
        slots,
        reply: slots.length
          ? `Esse horario nao esta mais livre. Tenho estas opcoes: ${slots.slice(0, 5).map(formatSlot).join(', ')}.`
          : 'Esse horario nao esta mais livre e nao encontrei alternativas nessa data.',
        actions: [{
          type: 'slot_unavailable',
          requested_start_time: plan.start_time,
          slots: slots.slice(0, 10),
        }],
      };
    }

    const professionalName = professional?.nome || professionals.find((item) => item.id === plan.professional_id)?.nome || null;
    const appointmentPayload = {
      salao_id: clinic.slug,
      service_id: service.id,
      service_name: service.nome_servico,
      service_price: Number(service.preco || 0),
      professional_id: professional?.id || plan.professional_id,
      professional_name: professionalName,
      start_time: selectedSlot,
      duration_minutes: Number(service.duracao_minutos || 30),
      customer_name: plan.customer_name,
      customer_phone: plan.customer_phone,
      customer_email: plan.customer_email || null,
      notes: plan.notes || 'Agendamento criado pelo agente Horalis.',
    };

    if (signalValue > 0) {
      const payment = await createMercadoPagoPayment({
        transaction_amount: signalValue,
        payment_method_id: 'pix',
        payer: {
          email: plan.customer_email,
          first_name: firstName(plan.customer_name),
        },
      }, {
        description: `Sinal de agendamento - ${service.nome_servico}`,
        external_reference: clinic.slug,
        idempotency_key: `agent-${clinic.id}-${service.id}-${new Date(selectedSlot).getTime()}-${cleanPhone(plan.customer_phone)}`,
      });

      const appointment = await createAppointmentFromPayload(clinic, {
        ...appointmentPayload,
        status: appointmentStatusFromPayment(payment.status),
      }, {
        status: payment.status,
        payment_id: payment.id,
      });
      const transaction = payment.point_of_interaction?.transaction_data || {};

      return {
        status: 'payment_created',
        appointment: appointmentToClient(appointment),
        payment: {
          status: payment.status,
          payment_id: payment.id,
          qr_code: transaction.qr_code,
          qr_code_base64: transaction.qr_code_base64,
          amount: signalValue,
        },
        reply: `Agendamento pre-reservado para ${formatSlot(selectedSlot)}. Para confirmar, envie o PIX do sinal de R$ ${signalValue.toFixed(2).replace('.', ',')}.`,
        actions: [{
          type: 'create_booking_with_signal',
          appointment_id: appointment.id,
          payment_id: payment.id,
          amount: signalValue,
        }],
      };
    }

    const appointment = await createAppointmentFromPayload(clinic, appointmentPayload, { status: 'free' });
    return {
      status: 'booking_created',
      appointment: appointmentToClient(appointment),
      reply: `Agendamento confirmado para ${formatSlot(selectedSlot)}.`,
      actions: [{
        type: 'create_booking',
        appointment_id: appointment.id,
      }],
    };
  }

  return {
    status: 'answered',
    reply: settings.fallback_message,
    actions: [],
  };
}

async function naturalizeAgentResult({ message, result, clinic, services, professionals, settings }) {
  const response = await createOpenAIResponse({
    instructions: [
      buildAgentInstructions({ clinic, services, professionals, settings }),
      '',
      'Transforme o resultado operacional em uma resposta final para o cliente.',
      'Se houver PIX, mencione claramente o valor do sinal e inclua o codigo copia e cola se existir.',
      'Nao invente dados alem do resultado operacional. Seja curto, humano e natural.',
    ].join('\n'),
    input: JSON.stringify({
      message,
      result,
    }),
    model: settings.model || DEFAULT_AGENT_MODEL,
    maxOutputTokens: settings.max_output_tokens || 450,
    metadata: {
      product: 'horalis',
      clinic_id: clinic.id,
      route: 'agent-final-reply',
    },
  });

  return response.text || result.reply || settings.fallback_message;
}

function buildAgentRuntimeContext({ clinic, services, professionals }) {
  const signalValue = Number(clinic.sinal_valor || 0);
  return {
    clinic: {
      slug: clinic.slug,
      nome_salao: clinic.nome_salao,
      cobrar_sinal: signalValue > 0,
      sinal_valor: signalValue,
      google_sync_enabled: clinic.google_sync_enabled === true,
      mercado_pago_configured: !!process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.HORALIS_ALLOW_DEV_PAYMENTS === 'true',
      schedule_summary: summarizeSchedule(clinic.horario_trabalho_detalhado || defaultSchedule()),
    },
    services: services.map((service) => ({
      id: service.id,
      nome_servico: service.nome_servico,
      duracao_minutos: service.duracao_minutos,
      preco: service.preco,
      active: service.active !== false,
    })),
    professionals: professionals.map((professional) => ({
      id: professional.id,
      nome: professional.nome,
      cargo: professional.cargo,
      servicos: Array.isArray(professional.servicos) ? professional.servicos : [],
      active: professional.active !== false,
    })),
    capabilities: [
      'consultar_horarios',
      'criar_agendamento',
      'cobrar_sinal_pix',
      'handoff_humano',
    ],
  };
}

async function handleAgent(req, res, user, parts) {
  const slug = parts[2];
  const action = parts[3];
  if (!slug) return notFound(res);

  const { clinic, role } = await requireClinicMember(user, slug);
  const canManage = role === 'owner' || role === 'admin' || clinic.owner_id === user.id;

  if (action === 'settings' && req.method === 'GET') {
    const settings = await loadAgentSettings(clinic);
    return json(res, 200, settings);
  }

  if (action === 'settings' && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!canManage) return forbidden(res, 'Somente administradores podem configurar o agente.');
    const payload = await readJson(req);
    const values = {
      clinic_id: clinic.id,
      ...pickAgentSettings(payload, clinic),
    };
    const rows = await insert('ai_agent_settings', [values], { upsert: true, onConflict: 'clinic_id' });
    return json(res, 200, rows[0]);
  }

  const loadRuntime = async () => {
    const [settings, services, professionals] = await Promise.all([
      loadAgentSettings(clinic),
      getServices(clinic.id, { activeOnly: true }),
      getProfessionals(clinic.id, { activeOnly: true }),
    ]);
    return { settings, services, professionals };
  };

  if (action === 'context' && req.method === 'GET') {
    const runtime = await loadRuntime();
    return json(res, 200, buildAgentRuntimeContext({ clinic, ...runtime }));
  }

  if (['preview', 'chat'].includes(action) && req.method === 'POST') {
    const payload = await readJson(req);
    const message = String(payload.message || '').trim();
    if (!message) return badRequest(res, 'Informe uma mensagem para testar o agente.');

    const { settings, services, professionals } = await loadRuntime();
    const decision = await planAgentAction({
      message: message.slice(0, 3000),
      history: payload.history,
      clinic,
      services,
      professionals,
      settings,
    });
    const result = await executeAgentPlan(decision.plan, { clinic, services, professionals, settings });
    const reply = ['answered', 'handoff', 'needs_info'].includes(result.status)
      ? (result.reply || settings.fallback_message)
      : await naturalizeAgentResult({ message, result, clinic, services, professionals, settings });

    return json(res, 200, {
      reply,
      status: result.status,
      plan: decision.plan,
      actions: result.actions || [],
      slots: Array.isArray(result.slots) ? result.slots.slice(0, 10) : [],
      appointment: result.appointment || null,
      payment: result.payment || null,
      response_id: decision.response_id,
      model: settings.model || DEFAULT_AGENT_MODEL,
    });
  }

  return notFound(res);
}

async function handleAddNote(req, res, user) {
  const payload = await readJson(req);
  const { clinic } = await requireClinicMember(user, payload.salao_id);
  const rows = await insert('customer_events', [{
    clinic_id: clinic.id,
    customer_id: payload.cliente_id,
    tipo: 'nota',
    dados: { texto: payload.nota_texto },
    created_by: user.id,
  }]);
  return json(res, 201, rows[0]);
}

async function buildAppointmentUpdateValues(payload, clinic, appointmentId) {
  const allowed = [
    'start_time',
    'end_time',
    'status',
    'service_name',
    'service_price',
    'duration_minutes',
    'customer_name',
    'customer_email',
    'customer_phone',
    'professional_id',
    'professional_name',
    'payment_status',
    'notes',
  ];
  const values = {};

  for (const key of allowed) {
    if (payload[key] !== undefined) values[key] = payload[key];
  }

  if (payload.new_start_time) {
    const rows = await select('appointments', {
      select: 'start_time,end_time,duration_minutes',
      id: `eq.${appointmentId}`,
      clinic_id: `eq.${clinic.id}`,
      limit: 1,
    });

    if (!rows.length) {
      const error = new Error('Agendamento nao encontrado.');
      error.status = 404;
      throw error;
    }

    const nextStart = new Date(payload.new_start_time);
    if (Number.isNaN(nextStart.getTime())) {
      const error = new Error('Data de reagendamento invalida.');
      error.status = 400;
      throw error;
    }

    const currentStart = new Date(rows[0].start_time);
    const currentEnd = new Date(rows[0].end_time);
    const duration = Number(rows[0].duration_minutes)
      || Math.max(15, Math.round((currentEnd.getTime() - currentStart.getTime()) / 60000))
      || 30;

    values.start_time = nextStart.toISOString();
    values.end_time = new Date(nextStart.getTime() + duration * 60000).toISOString();
    values.duration_minutes = duration;
  }

  if (values.professional_id === '') values.professional_id = null;

  if (!Object.keys(values).length) {
    const error = new Error('Nenhum campo valido para atualizar.');
    error.status = 400;
    throw error;
  }

  return values;
}

async function handleCalendarAppointments(req, res, user, parts) {
  const slug = parts[2];
  if (!slug) return notFound(res);

  const { clinic } = await requireClinicMember(user, slug);
  const query = getQuery(req);
  const params = {
    select: '*',
    clinic_id: `eq.${clinic.id}`,
    order: query.get('order') || 'start_time.asc',
  };

  addDateFilters(params, query.get('start'), query.get('end'));

  const status = query.get('status');
  if (status) {
    params.status = status === 'not_cancelled' ? 'neq.cancelado' : `eq.${status}`;
  } else if (query.get('include_cancelled') !== 'true') {
    params.status = 'neq.cancelado';
  }

  const professionalId = query.get('professional_id');
  if (professionalId && isUuid(professionalId)) params.professional_id = `eq.${professionalId}`;

  const customerId = query.get('customer_id');
  if (customerId && isUuid(customerId)) params.customer_id = `eq.${customerId}`;

  const limitValue = Number(query.get('limit') || 500);
  params.limit = Math.min(1000, Math.max(1, Number.isFinite(limitValue) ? limitValue : 500));

  const rows = await select('appointments', params);
  return json(res, 200, rows.map(appointmentToClient));
}

async function handleCalendarMutation(req, res, user, parts) {
  const slug = parts[2];
  const appointmentId = parts[4];
  const { clinic } = await requireClinicMember(user, slug);

  if (req.method === 'PATCH') {
    const payload = await readJson(req);
    const values = await buildAppointmentUpdateValues(payload, clinic, appointmentId);
    const rows = await patch('appointments', { id: `eq.${appointmentId}`, clinic_id: `eq.${clinic.id}` }, values);
    if (!rows.length) return notFound(res, 'Agendamento nao encontrado.');
    return json(res, 200, rows[0]);
  }

  if (req.method === 'DELETE') {
    await patch('appointments', { id: `eq.${appointmentId}`, clinic_id: `eq.${clinic.id}` }, { status: 'cancelado' });
    return json(res, 200, { ok: true });
  }

  return notFound(res);
}

async function handleIntegrationRoutes(req, res, user, parts) {
  if (parts[1] === 'mercadopago' && parts[2] === 'auth' && parts[3] === 'start') {
    if (!process.env.MERCADO_PAGO_CLIENT_ID || !process.env.MERCADO_PAGO_REDIRECT_URI) {
      return json(res, 501, { detail: 'Configure MERCADO_PAGO_CLIENT_ID e MERCADO_PAGO_REDIRECT_URI.' });
    }
    const url = new URL('https://auth.mercadopago.com/authorization');
    url.searchParams.set('client_id', process.env.MERCADO_PAGO_CLIENT_ID);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('platform_id', 'mp');
    url.searchParams.set('redirect_uri', process.env.MERCADO_PAGO_REDIRECT_URI);
    return json(res, 200, { auth_url: url.toString() });
  }

  if (parts[1] === 'mercadopago' && parts[2] === 'disconnect' && parts[3] && req.method === 'PATCH') {
    const { clinic } = await requireClinicMember(user, parts[3]);
    await patch('clinics', { id: `eq.${clinic.id}` }, { mp_access_token: null, mp_public_key: null });
    return json(res, 200, { ok: true });
  }

  if (parts[1] === 'google' && parts[2] === 'auth' && parts[3] === 'start') {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
      return json(res, 501, { detail: 'Configure GOOGLE_CLIENT_ID e GOOGLE_REDIRECT_URI.' });
    }
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return json(res, 200, { authorization_url: url.toString() });
  }

  if (parts[1] === 'clientes' && parts[3] === 'google-sync' && req.method === 'PATCH') {
    const { clinic } = await requireClinicMember(user, parts[2]);
    const payload = await readJson(req);
    await patch('clinics', { id: `eq.${clinic.id}` }, { google_sync_enabled: !!payload.enabled });
    return json(res, 200, { ok: true });
  }

  return notFound(res);
}

async function handleSubscription(req, res) {
  const user = await requireUser(req);
  await getClinicForUser(user);
  if (!process.env.MERCADO_PAGO_SUBSCRIPTION_URL) {
    return json(res, 501, { detail: 'Configure MERCADO_PAGO_SUBSCRIPTION_URL para o checkout da assinatura.' });
  }
  return json(res, 200, { checkout_url: process.env.MERCADO_PAGO_SUBSCRIPTION_URL });
}

async function dispatch(req, res) {
  const parts = routeParts(req);
  const [root] = parts;

  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (!root) return json(res, 200, { ok: true, service: 'Horalis API' });

  if (root === 'auth') {
    if (parts[1] === 'register-owner' && req.method === 'POST') return handleRegisterOwner(req, res);
    if (parts[1] === 'criar-conta-paga' && req.method === 'POST') return handlePaidSignup(req, res);
    if (parts[1] === 'check-payment-status' && parts[2]) return handlePaymentStatus(req, res, parts[2]);
    if (parts[1] === 'check-agendamento-status' && parts[3]) {
      const rows = await select('appointments', { select: 'payment_status', id: `eq.${parts[3]}`, limit: 1 });
      return json(res, 200, { status: rows[0]?.payment_status || 'pending' });
    }
  }

  if (root === 'saloes' && parts[1] && parts[2] === 'servicos' && req.method === 'GET') return handlePublicServices(req, res, parts[1]);
  if (root === 'saloes' && parts[1] && parts[2] === 'horarios-disponiveis' && req.method === 'GET') return handleAvailableSlots(req, res, parts[1]);
  if (root === 'agendamentos' && !parts[1] && req.method === 'POST') return handleCreateAppointment(req, res, false);
  if (root === 'agendamentos' && parts[1] === 'iniciar-pagamento-sinal' && req.method === 'POST') return handleAppointmentPayment(req, res);

  if (root !== 'admin') return notFound(res);

  const user = await requireUser(req);

  if (parts[1] === 'user' && parts[2] === 'salao-id') {
    const clinic = await getClinicForUser(user);
    return json(res, 200, { salao_id: clinic.slug, slug: clinic.slug });
  }

  if (parts[1] === 'agent') return handleAgent(req, res, user, parts);
  if (parts[1] === 'clientes' && parts[2] === 'adicionar-nota' && req.method === 'POST') return handleAddNote(req, res, user);
  if (parts[1] === 'clientes' && parts[2] === 'enviar-promocional') return json(res, 202, { ok: true });
  if (parts[1] === 'clientes' && parts[2] && parts[3] === 'google-sync' && req.method === 'PATCH') return handleIntegrationRoutes(req, res, user, parts);
  if (parts[1] === 'clientes' && parts[2]) {
    if (parts[3] === 'lista-crm' || parts[3] === 'detalhes-crm') return handleCrm(req, res, user, parts);
    return handleAdminClinic(req, res, user, parts[2]);
  }

  if (parts[1] === 'calendario' && parts[2] === 'agendar' && req.method === 'POST') return handleCreateAppointment(req, res, true);
  if (parts[1] === 'calendario' && parts[2] && parts[3] === 'agendamentos' && !parts[4] && req.method === 'GET') return handleCalendarAppointments(req, res, user, parts);
  if (parts[1] === 'calendario' && parts[2] && parts[3] === 'agendamentos' && parts[4]) return handleCalendarMutation(req, res, user, parts);
  if (parts[1] === 'equipe') return handleTeam(req, res, user, parts[2]);
  if (parts[1] === 'estoque' && parts[2] === 'produtos') return handleStock(req, res, user, parts);
  if (parts[1] === 'financeiro') return handleFinance(req, res, user, parts);
  if (parts[1] === 'marketing') return json(res, 202, { ok: true, message: 'Envio de marketing preparado para worker externo.' });
  if (parts[1] === 'pagamentos' && parts[2] === 'criar-assinatura' && req.method === 'POST') return handleSubscription(req, res);
  if (parts[1] === 'mercadopago' || parts[1] === 'google') return handleIntegrationRoutes(req, res, user, parts);

  return notFound(res);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');

  try {
    await dispatch(req, res);
  } catch (error) {
    if (error.status === 400) return badRequest(res, error.message);
    if (error.status === 401) return unauthorized(res, error.message);
    if (error.status === 403) return forbidden(res, error.message);
    if (error.status === 404) return notFound(res, error.message);
    if (error.status >= 400 && error.status < 600) return json(res, error.status, { detail: error.message });
    return serverError(res, error);
  }
}

class WebResponseAdapter {
  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.body = '';
  }

  setHeader(name, value) {
    this.headers.set(name, value);
  }

  end(body = '') {
    this.body = body;
  }

  toResponse() {
    return new Response(this.body, {
      status: this.statusCode,
      headers: this.headers,
    });
  }
}

async function toLegacyRequest(request) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());
  headers.host ||= url.host;

  let body;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.text();
  }

  return {
    method: request.method,
    url: request.url,
    headers,
    body,
  };
}

export async function handleWebRequest(request) {
  const req = await toLegacyRequest(request);
  const res = new WebResponseAdapter();
  await handler(req, res);
  return res.toResponse();
}

export const GET = handleWebRequest;
export const POST = handleWebRequest;
export const PUT = handleWebRequest;
export const PATCH = handleWebRequest;
export const DELETE = handleWebRequest;
export const OPTIONS = handleWebRequest;
