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
const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const DEFAULT_AGENT_MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-5.4-mini';
const DEFAULT_AGENT_FALLBACK = 'Vou confirmar essa informacao com a equipe e ja retorno com seguranca.';
const DEFAULT_AGENT_HANDOFF = 'Vou chamar uma pessoa da equipe para continuar seu atendimento.';
const DEFAULT_AGENT_OPENING = 'Oi, tudo bem? Posso te ajudar a agendar. Qual servico voce gostaria de fazer?';
const LEGACY_AGENT_OPENING = 'Oi, tudo bem? Me passa o melhor dia e horario para voce, por favor?';
const WEEKDAY_BY_NAME = {
  sunday: 'sunday',
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
};

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
    opening_message: DEFAULT_AGENT_OPENING,
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

function normalizeAgentSettingsForRuntime(settings = {}) {
  const opening = String(settings.opening_message || '').trim();
  return {
    ...settings,
    opening_message: !opening || opening === LEGACY_AGENT_OPENING ? DEFAULT_AGENT_OPENING : opening,
  };
}

async function loadAgentSettings(clinic) {
  const rows = await select('ai_agent_settings', {
    select: '*',
    clinic_id: `eq.${clinic.id}`,
    limit: 1,
  });

  return normalizeAgentSettingsForRuntime(rows[0] ? { ...defaultAgentSettings(clinic), ...rows[0] } : {
    clinic_id: clinic.id,
    ...defaultAgentSettings(clinic),
  });
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

function appointmentToCustomerHistory(row) {
  const appointment = appointmentToClient(row);
  return {
    id: appointment.id,
    tipo: 'Agendamento',
    data_evento: appointment.start_time,
    dados: {
      ...appointment,
      status: appointment.status,
      serviceName: appointment.serviceName,
      servicePrice: appointment.servicePrice,
      durationMinutes: appointment.durationMinutes,
      professionalName: appointment.professionalName,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
    },
  };
}

function customerEventToCustomerHistory(row) {
  const type = String(row.tipo || '').toLowerCase();
  return {
    ...row,
    tipo: type === 'nota' ? 'NotaManual' : (row.tipo || 'Evento'),
    data_evento: row.data_evento || row.created_at,
    dados: row.dados && typeof row.dados === 'object' ? row.dados : {},
  };
}

function buildCustomerHistory(appointments = [], events = []) {
  return [
    ...appointments.map(appointmentToCustomerHistory),
    ...events.map(customerEventToCustomerHistory),
  ].sort((a, b) => new Date(b.data_evento || 0).getTime() - new Date(a.data_evento || 0).getTime());
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

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseRequiredDate(value, message) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw httpError(message);
  return date;
}

function normalizeDurationMinutes(value, fallback = 30) {
  const duration = Number(value || fallback);
  if (!Number.isFinite(duration) || duration <= 0) throw httpError('Duracao do agendamento invalida.');
  if (duration < 5 || duration > 720) throw httpError('Duracao do agendamento fora do limite permitido.');
  return Math.round(duration);
}

function getSaoPauloParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAY_BY_NAME[String(parts.weekday || '').toLowerCase()],
    minutes: (Number(parts.hour) * 60) + Number(parts.minute),
  };
}

function mergeProfessionalSchedule(clinic, professional) {
  const schedule = clinic.horario_trabalho_detalhado || defaultSchedule();
  if (professional?.horario_trabalho && Object.keys(professional.horario_trabalho).length) {
    return { ...schedule, ...professional.horario_trabalho };
  }
  return schedule;
}

function assertFitsWorkingHours(clinic, professional, start, end) {
  const startParts = getSaoPauloParts(start);
  const endParts = getSaoPauloParts(end);
  if (startParts.date !== endParts.date) throw httpError('Agendamentos devem comecar e terminar no mesmo dia.');

  const schedule = mergeProfessionalSchedule(clinic, professional);
  const day = schedule[startParts.weekday];
  if (!day?.isOpen) throw httpError('O estabelecimento esta fechado neste dia.');

  const open = minutesFromHHMM(day.openTime);
  const close = minutesFromHHMM(day.closeTime);
  if (startParts.minutes < open || endParts.minutes > close) {
    throw httpError('Horario fora do expediente configurado.');
  }

  if (day.hasLunch) {
    const lunchStart = minutesFromHHMM(day.lunchStart);
    const lunchEnd = minutesFromHHMM(day.lunchEnd);
    if (startParts.minutes < lunchEnd && endParts.minutes > lunchStart) {
      throw httpError('Horario indisponivel durante o intervalo configurado.');
    }
  }
}

function appointmentBlocksProfessional(existingProfessionalId, nextProfessionalId) {
  if (!nextProfessionalId) return true;
  if (!existingProfessionalId) return true;
  return String(existingProfessionalId) === String(nextProfessionalId);
}

async function assertAppointmentSlotAvailable(clinic, { start, end, professionalId = null, ignoreAppointmentId = null }) {
  const rows = await select('appointments', {
    select: 'id,start_time,end_time,professional_id',
    clinic_id: `eq.${clinic.id}`,
    start_time: `lt.${end.toISOString()}`,
    end_time: `gt.${start.toISOString()}`,
    status: 'neq.cancelado',
    limit: 1000,
  });

  const blocked = rows.some((appointment) => {
    if (ignoreAppointmentId && String(appointment.id) === String(ignoreAppointmentId)) return false;
    return appointmentBlocksProfessional(appointment.professional_id, professionalId);
  });

  if (blocked) throw httpError('Ja existe um agendamento neste horario.', 409);
}

async function loadAppointmentService(clinic, payload) {
  if (!payload.service_id) return {};
  if (!isUuid(payload.service_id)) throw httpError('Servico invalido.');

  const rows = await select('services', {
    select: '*',
    id: `eq.${payload.service_id}`,
    clinic_id: `eq.${clinic.id}`,
    limit: 1,
  });

  if (!rows.length) throw httpError('Servico nao encontrado.', 404);
  if (rows[0].active === false) throw httpError('Servico inativo.');
  return rows[0];
}

async function loadAppointmentProfessional(clinic, payload, serviceId = null) {
  if (!payload.professional_id) return null;
  if (!isUuid(payload.professional_id)) throw httpError('Profissional invalido.');

  const rows = await select('professionals', {
    select: '*',
    id: `eq.${payload.professional_id}`,
    clinic_id: `eq.${clinic.id}`,
    limit: 1,
  });

  if (!rows.length) throw httpError('Profissional nao encontrado.', 404);
  const professional = rows[0];
  if (professional.active === false) throw httpError('Profissional inativo.');
  const services = Array.isArray(professional.servicos) ? professional.servicos.map(String) : [];
  if (serviceId && services.length && !services.includes(String(serviceId))) {
    throw httpError('Este profissional nao atende o servico selecionado.');
  }
  return professional;
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

async function assertAppointmentPayloadBookable(clinic, payload) {
  const customerName = String(payload.customer_name || payload.nome || '').trim();
  if (!customerName) throw httpError('Nome do cliente e obrigatorio.');

  const service = await loadAppointmentService(clinic, payload);
  const professional = await loadAppointmentProfessional(clinic, payload, service.id);
  const start = parseRequiredDate(payload.start_time, 'Data do agendamento invalida.');
  if (start.getTime() < Date.now()) throw httpError('Nao e possivel agendar no passado.');

  const duration = normalizeDurationMinutes(service.duracao_minutos || payload.duration_minutes || 30);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  assertFitsWorkingHours(clinic, professional, start, end);
  await assertAppointmentSlotAvailable(clinic, {
    start,
    end,
    professionalId: professional?.id || null,
  });
}

async function createAppointmentFromPayload(clinic, payload, payment = {}) {
  const customerName = String(payload.customer_name || payload.nome || '').trim();
  if (!customerName) throw httpError('Nome do cliente e obrigatorio.');

  const service = await loadAppointmentService(clinic, payload);
  const professional = await loadAppointmentProfessional(clinic, payload, service.id);
  const start = parseRequiredDate(payload.start_time, 'Data do agendamento invalida.');
  if (start.getTime() < Date.now()) throw httpError('Nao e possivel agendar no passado.');

  const duration = normalizeDurationMinutes(service.duracao_minutos || payload.duration_minutes || 30);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  assertFitsWorkingHours(clinic, professional, start, end);
  await assertAppointmentSlotAvailable(clinic, {
    start,
    end,
    professionalId: professional?.id || null,
  });

  const customer = await upsertCustomer(clinic.id, { ...payload, customer_name: customerName });
  const rows = await insert('appointments', [{
    clinic_id: clinic.id,
    service_id: service.id || null,
    professional_id: professional?.id || null,
    customer_id: customer.id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: payload.status || 'confirmado',
    service_name: service.nome_servico || payload.service_name,
    service_price: Number(service.preco || payload.service_price || 0),
    duration_minutes: duration,
    customer_name: customerName || customer.nome,
    customer_email: payload.customer_email || customer.email,
    customer_phone: payload.customer_phone || customer.whatsapp,
    professional_name: professional?.nome || payload.professional_name || null,
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
  await assertAppointmentPayloadBookable(clinic, payload);
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
    return json(res, 200, {
      cliente: customers[0],
      agendamentos: appointments.map(appointmentToClient),
      timeline: events.map(customerEventToCustomerHistory),
      historico_agendamentos: buildCustomerHistory(appointments, events),
    });
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
    'Sempre que perguntar qual servico o cliente deseja, liste os servicos cadastrados em linhas curtas.',
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

function normalizeAgentText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAnyTerm(text, terms) {
  return terms.some((term) => text.includes(term));
}

function serviceWords(serviceName) {
  const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'para']);
  return normalizeAgentText(serviceName)
    .split(' ')
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function ordinalChoiceIndex(message) {
  const words = normalizeAgentText(message).split(' ').filter(Boolean);
  const choice = [
    ['primeiro', 0],
    ['primeira', 0],
    ['opcao 1', 0],
    ['1', 0],
    ['segundo', 1],
    ['segunda opcao', 1],
    ['opcao 2', 1],
    ['2', 1],
    ['terceiro', 2],
    ['terceira opcao', 2],
    ['opcao 3', 2],
    ['3', 2],
    ['quarto', 3],
    ['quarta opcao', 3],
    ['opcao 4', 3],
    ['4', 3],
    ['quinto', 4],
    ['quinta opcao', 4],
    ['opcao 5', 4],
    ['5', 4],
  ].find(([term]) => {
    const termWords = term.split(' ');
    if (termWords.length === 1) return words.includes(term);
    return normalizeAgentText(message).includes(term);
  });

  return choice ? choice[1] : null;
}

function scoreServiceMatch(message, service) {
  const text = normalizeAgentText(message);
  const name = normalizeAgentText(service.nome_servico);
  if (!text || !name) return 0;
  if (text.includes(name)) return 100 + name.length;

  const words = serviceWords(service.nome_servico);
  if (!words.length) return 0;

  const matched = words.filter((word) => text.includes(word));
  if (matched.length === words.length && words.length >= 2) return 80 + matched.join('').length;
  if (matched.length >= 2) return 55 + matched.join('').length;
  if (matched.length === 1) return 25 + matched[0].length;

  return 0;
}

function findServiceInMessage(message, services, { expected = false } = {}) {
  if (!Array.isArray(services) || !services.length) return null;

  if (expected) {
    const selectedIndex = ordinalChoiceIndex(message);
    if (selectedIndex !== null && services[selectedIndex]) return services[selectedIndex];
  }

  const ranked = services
    .map((service) => ({ service, score: scoreServiceMatch(message, service) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return null;
  const [best, second] = ranked;
  if (best.score >= 80) return best.service;
  if (!second && best.score >= (expected ? 20 : 30)) return best.service;
  if (second && best.score - second.score >= 20) return best.service;
  return null;
}

function findProfessionalInMessage(message, professionals) {
  const text = normalizeAgentText(message);
  return professionals.find((professional) => {
    const name = normalizeAgentText(professional.nome);
    return name && text.includes(name);
  }) || null;
}

function saoPauloDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return { year: get('year'), month: get('month'), day: get('day') };
}

function saoPauloDateKey(date = new Date()) {
  const { year, month, day } = saoPauloDateParts(date);
  return `${year}-${month}-${day}`;
}

function saoPauloNoon(date = new Date()) {
  return new Date(`${saoPauloDateKey(date)}T12:00:00${SAO_PAULO_OFFSET}`);
}

function addDaysDateKey(days) {
  const base = saoPauloNoon();
  base.setUTCDate(base.getUTCDate() + days);
  return saoPauloDateKey(base);
}

function parseMessageDate(message) {
  const text = normalizeAgentText(message);
  if (hasAnyTerm(text, ['depois de amanha', 'depois da amanha'])) return addDaysDateKey(2);
  if (text.includes('amanha')) return addDaysDateKey(1);
  if (text.includes('hoje')) return addDaysDateKey(0);

  const explicit = text.match(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/);
  if (explicit) {
    const day = explicit[1].padStart(2, '0');
    const month = explicit[2].padStart(2, '0');
    const currentYear = saoPauloDateParts().year;
    const rawYear = explicit[3] || currentYear;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month}-${day}`;
  }

  const weekdays = [
    ['domingo', 0],
    ['segunda', 1],
    ['terca', 2],
    ['quarta', 3],
    ['quinta', 4],
    ['sexta', 5],
    ['sabado', 6],
  ];
  const match = weekdays.find(([label]) => text.includes(label));
  if (!match) return null;

  const today = saoPauloNoon();
  const current = today.getDay();
  let diff = (match[1] - current + 7) % 7;
  if (diff === 0) diff = 7;
  today.setUTCDate(today.getUTCDate() + diff);
  return saoPauloDateKey(today);
}

function detectPeriod(message) {
  const words = normalizeAgentText(message).split(' ').filter(Boolean);
  if (words.includes('manha')) return 'morning';
  if (words.includes('tarde')) return 'afternoon';
  if (words.includes('noite')) return 'night';
  return null;
}

function saoPauloHour(value) {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false,
  }).format(new Date(value));
  return Number(hour);
}

function filterSlotsByPeriod(slots, period) {
  if (!period) return slots;
  return slots.filter((slot) => {
    const hour = saoPauloHour(slot);
    if (period === 'morning') return hour < 12;
    if (period === 'afternoon') return hour >= 12 && hour < 18;
    if (period === 'night') return hour >= 18;
    return true;
  });
}

function isGreetingOnly(message) {
  const text = normalizeAgentText(message);
  if (!text) return false;
  const greetingWords = new Set(['oi', 'ola', 'bom', 'boa', 'dia', 'tarde', 'noite', 'tudo', 'bem', 'td', 'como', 'vai', 'favor']);
  const words = text.split(' ').filter(Boolean);
  const extra = words.filter((word) => !greetingWords.has(word));
  return extra.length === 0 || (text.length <= 35 && extra.length <= 1);
}

function isShortThanks(message) {
  const text = normalizeAgentText(message);
  return text.length <= 40 && hasAnyTerm(text, ['obrigado', 'obrigada', 'valeu', 'agradeco', 'grato']);
}

function wantsHuman(message) {
  const text = normalizeAgentText(message);
  return hasAnyTerm(text, ['humano', 'pessoa', 'atendente', 'recepcao', 'recepcionista', 'falar com alguem', 'chamar alguem']);
}

function wantsPrice(message) {
  const text = normalizeAgentText(message);
  return hasAnyTerm(text, ['preco', 'valor', 'quanto custa', 'custa quanto', 'quanto fica', 'valores']);
}

function wantsScheduling(message) {
  const text = normalizeAgentText(message);
  return hasAnyTerm(text, ['agendar', 'marcar', 'horario', 'horarios', 'agenda', 'disponivel', 'disponibilidade', 'vaga', 'encaixe', 'consulta']);
}

function periodLabel(period) {
  if (period === 'morning') return ' de manha';
  if (period === 'afternoon') return ' a tarde';
  if (period === 'night') return ' a noite';
  return '';
}

function formatCurrencyBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function formatServiceOptions(services, maxItems = 8) {
  const list = services.slice(0, maxItems).map((service, index) => {
    const price = Number(service.preco || 0);
    const duration = Number(service.duracao_minutos || 30);
    return `${index + 1}. ${service.nome_servico} - ${formatCurrencyBRL(price)} (${duration} min)`;
  });
  return list.join('\n');
}

function serviceQuestionReply(services, intro = 'Qual servico voce gostaria de agendar?') {
  const options = formatServiceOptions(services);
  return options ? `${intro}\n\nServicos disponiveis:\n${options}` : intro;
}

function dateQuestionReply(service) {
  return `Perfeito, para ${service.nome_servico}. Qual dia ou periodo voce prefere? Pode mandar, por exemplo, "amanha a tarde" ou "sexta de manha".`;
}

function extractPhoneFromMessage(message) {
  const candidates = String(message || '').match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-.\s]?\d{4}/g) || [];
  const phone = cleanPhone(candidates[0] || '');
  return phone.length >= 10 ? phone : '';
}

function extractEmailFromMessage(message) {
  return String(message || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

function titleName(value) {
  return normalizeAgentText(value)
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function extractNameFromMessage(message, { expected = false } = {}) {
  const withoutContact = String(message || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, ' ')
    .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-.\s]?\d{4}/g, ' ');
  const normalized = normalizeAgentText(withoutContact);
  const explicit = normalized.match(/\b(?:meu nome e|me chamo|sou)\s+([a-z\s]{3,80})/);
  if (explicit) return titleName(explicit[1]);

  if (!expected) return '';
  if (parseMessageDate(message) || wantsScheduling(message) || wantsPrice(message) || wantsHuman(message) || isConfirmation(message)) return '';
  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 1 || words.length > 5) return '';
  if (words.some((word) => word.length < 2 || /\d/.test(word))) return '';
  const nonNameWords = new Set(['ok', 'opa', 'beleza', 'certo', 'confirmar', 'confirmado', 'pode', 'isso']);
  if (words.every((word) => nonNameWords.has(word))) return '';
  return titleName(words.join(' '));
}

function isConfirmation(message) {
  const text = normalizeAgentText(message);
  return hasAnyTerm(text, ['sim', 'pode confirmar', 'confirmar', 'confirmado', 'fechado', 'pode ser', 'isso mesmo', 'esta correto', 'ta certo']);
}

function isRejection(message) {
  const words = normalizeAgentText(message).split(' ').filter(Boolean);
  return words.includes('nao') || hasAnyTerm(words.join(' '), ['outro horario', 'trocar horario', 'prefiro outro', 'melhor outro']);
}

function slotTimeParts(slot) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(slot));
  const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { hour: get('hour'), minute: get('minute') };
}

function extractSlotChoice(message, slots = []) {
  if (!slots.length) return null;
  const text = normalizeAgentText(message);
  const selectedIndex = ordinalChoiceIndex(message);
  if (selectedIndex !== null && slots[selectedIndex]) return slots[selectedIndex];

  const time = text.match(/\b(\d{1,2})(?:h|:)?(\d{2})?\b/);
  if (!time) return null;
  const hour = Number(time[1]);
  const minute = Number(time[2] || 0);
  return slots.find((slot) => {
    const parts = slotTimeParts(slot);
    return parts.hour === hour && parts.minute === minute;
  }) || null;
}

function collectHybridContext(history = [], services = [], professionals = []) {
  const context = {
    service_id: null,
    professional_id: null,
    date: null,
    start_time: null,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    slots: [],
    field: null,
    appointment: null,
  };

  for (const entry of Array.isArray(history) ? history : []) {
    const role = entry?.role;
    const content = String(entry?.content || entry?.reply || '');

    if (role === 'assistant') {
      const plan = entry.plan || {};
      if (plan.service_id) context.service_id = plan.service_id;
      if (plan.professional_id) context.professional_id = plan.professional_id;
      if (plan.date) context.date = plan.date;
      if (plan.start_time) context.start_time = plan.start_time;
      if (plan.customer_name) context.customer_name = plan.customer_name;
      if (plan.customer_phone) context.customer_phone = plan.customer_phone;
      if (plan.customer_email) context.customer_email = plan.customer_email;
      if (plan.field) context.field = plan.field;
      if (entry.field) context.field = entry.field;
      if (Array.isArray(entry.slots) && entry.slots.length) context.slots = entry.slots;
      if (entry.appointment) context.appointment = entry.appointment;
      for (const action of entry.actions || []) {
        if (action.service_id) context.service_id = action.service_id;
        if (action.professional_id) context.professional_id = action.professional_id;
        if (action.date) context.date = action.date;
        if (Array.isArray(action.slots) && action.slots.length) context.slots = action.slots;
      }
      continue;
    }

    if (role === 'user') {
      const service = findServiceInMessage(content, services, { expected: context.field === 'service_id' });
      if (service) context.service_id = service.id;
      const professional = findProfessionalInMessage(content, professionals);
      if (professional) context.professional_id = professional.id;
      const date = parseMessageDate(content);
      if (date) context.date = date;
      const slot = extractSlotChoice(content, context.slots);
      if (slot) context.start_time = slot;
      const phone = extractPhoneFromMessage(content);
      if (phone) context.customer_phone = phone;
      const email = extractEmailFromMessage(content);
      if (email) context.customer_email = email;
      const name = extractNameFromMessage(content, { expected: context.field === 'customer_name' });
      if (name) context.customer_name = name;
    }
  }

  return context;
}

async function createHybridAppointment({ clinic, service, professionals, startTime, professionalId, customerName, customerPhone, customerEmail, notes }) {
  const professional = professionals.find((item) => item.id === professionalId) || null;
  const signalValue = Number(clinic.sinal_valor || 0);
  const appointmentPayload = {
    salao_id: clinic.slug,
    service_id: service.id,
    service_name: service.nome_servico,
    service_price: Number(service.preco || 0),
    professional_id: professional?.id || professionalId || null,
    professional_name: professional?.nome || null,
    start_time: startTime,
    duration_minutes: Number(service.duracao_minutos || 30),
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail || null,
    notes: notes || 'Agendamento criado pelo atendimento hibrido Horalis.',
  };

  if (signalValue > 0) {
    const payment = await createMercadoPagoPayment({
      transaction_amount: signalValue,
      payment_method_id: 'pix',
      payer: {
        email: customerEmail,
        first_name: firstName(customerName),
      },
    }, {
      description: `Sinal de agendamento - ${service.nome_servico}`,
      external_reference: clinic.slug,
      idempotency_key: `hybrid-${clinic.id}-${service.id}-${new Date(startTime).getTime()}-${cleanPhone(customerPhone)}`,
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
      actions: [{
        type: 'create_booking_with_signal',
        appointment_id: appointment.id,
        payment_id: payment.id,
        amount: signalValue,
      }],
      reply: `Agendamento pre-reservado para ${formatSlot(startTime)}. Para confirmar, envie o PIX do sinal de ${formatCurrencyBRL(signalValue)}.`,
    };
  }

  const appointment = await createAppointmentFromPayload(clinic, appointmentPayload, { status: 'free' });
  return {
    status: 'booking_created',
    appointment: appointmentToClient(appointment),
    payment: null,
    actions: [{
      type: 'create_booking',
      appointment_id: appointment.id,
    }],
    reply: `Prontinho, ${firstName(customerName)}. Seu horario ficou confirmado para ${formatSlot(startTime)}.`,
  };
}

function hybridResult(status, reply, extra = {}) {
  return {
    status,
    reply,
    routed_by: 'hybrid',
    actions: [],
    ...extra,
  };
}

async function tryHybridAgentResponse({ message, history, clinic, services, professionals, settings }) {
  const isFirstTurn = !Array.isArray(history) || history.length === 0;
  const context = collectHybridContext(history, services, professionals);
  const currentService = findServiceInMessage(message, services, { expected: context.field === 'service_id' });
  const service = currentService || services.find((item) => item.id === context.service_id) || null;
  const currentProfessional = findProfessionalInMessage(message, professionals);
  const professionalId = currentProfessional?.id || context.professional_id || null;
  const currentDate = parseMessageDate(message);
  const date = currentDate || context.date;
  const period = detectPeriod(message);
  const schedulingIntent = wantsScheduling(message);
  const currentSlotChoice = extractSlotChoice(message, context.slots);
  const selectedSlot = currentSlotChoice || context.start_time;
  const currentCustomerName = extractNameFromMessage(message, { expected: context.field === 'customer_name' });
  const customerName = currentCustomerName || context.customer_name;
  const currentCustomerPhone = extractPhoneFromMessage(message);
  const customerPhone = currentCustomerPhone || context.customer_phone;
  const currentCustomerEmail = extractEmailFromMessage(message);
  const customerEmail = currentCustomerEmail || context.customer_email;
  const signalValue = Number(clinic.sinal_valor || 0);
  const answeredPendingField = Boolean(context.field && (
    currentService
    || currentDate
    || period
    || currentSlotChoice
    || currentCustomerName
    || currentCustomerPhone
    || currentCustomerEmail
    || isConfirmation(message)
    || isRejection(message)
  ));
  const gaveSchedulingData = Boolean(currentService || currentDate || period || currentSlotChoice);
  const shouldContinueScheduling = schedulingIntent || isFirstTurn || answeredPendingField || gaveSchedulingData;

  if (wantsHuman(message)) {
    return hybridResult('handoff', settings.handoff_message, {
      actions: [{ type: 'handoff' }],
      plan: { action: 'handoff', confidence: 1 },
    });
  }

  if (isShortThanks(message)) {
    return hybridResult('answered', 'Eu que agradeco. Fico a disposicao para te ajudar no agendamento.', {
      plan: { action: 'answer', confidence: 1 },
    });
  }

  if (wantsPrice(message)) {
    if (!service) {
      return hybridResult('needs_info', serviceQuestionReply(services, 'Claro. Qual servico voce gostaria de consultar?'), {
        field: 'service_id',
        plan: { action: 'answer', field: 'service_id', confidence: 0.95 },
      });
    }

    const price = Number(service.preco || 0);
    const duration = Number(service.duracao_minutos || 30);
    return hybridResult('answered', `${service.nome_servico} fica ${formatCurrencyBRL(price)} e dura em media ${duration} minutos. Se quiser, me passa o melhor dia e horario para eu consultar a agenda.`, {
      service,
      plan: { action: 'answer', service_id: service.id, confidence: 0.95 },
    });
  }

  if (selectedSlot && service) {
    const bookingDate = date || datePart(selectedSlot);
    const basePlan = {
      action: 'confirm_booking',
      service_id: service.id,
      professional_id: professionalId,
      date: bookingDate,
      start_time: selectedSlot,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      confidence: 0.95,
    };

    if (context.field === 'confirm_booking' && isRejection(message)) {
      return hybridResult('needs_info', context.slots.length
        ? `Sem problemas. Quer escolher outro destes horarios para ${service.nome_servico}? ${context.slots.slice(0, 5).map(formatSlot).join(', ')}`
        : `Sem problemas. Qual outro dia ou horario voce prefere para ${service.nome_servico}?`, {
        field: context.slots.length ? 'start_time' : 'date',
        slots: context.slots,
        plan: { ...basePlan, field: context.slots.length ? 'start_time' : 'date' },
      });
    }

    if (!customerName) {
      return hybridResult('needs_info', `Perfeito, separei ${formatSlot(selectedSlot)} para ${service.nome_servico}. Me passa seu nome completo para eu finalizar, por favor?`, {
        field: 'customer_name',
        plan: { ...basePlan, field: 'customer_name' },
      });
    }

    if (!customerPhone) {
      return hybridResult('needs_info', `Obrigado, ${firstName(customerName)}. Me passa seu WhatsApp para eu finalizar o agendamento, por favor?`, {
        field: 'customer_phone',
        plan: { ...basePlan, field: 'customer_phone' },
      });
    }

    if (signalValue > 0 && !customerEmail) {
      return hybridResult('needs_info', 'Para gerar o PIX do sinal, me passa tambem seu e-mail.', {
        field: 'customer_email',
        plan: { ...basePlan, customer_phone: customerPhone, field: 'customer_email' },
      });
    }

    if (!isConfirmation(message) || context.field !== 'confirm_booking') {
      return hybridResult('needs_confirmation', `Vou confirmar: ${service.nome_servico} em ${formatSlot(selectedSlot)} para ${customerName}. Posso confirmar?`, {
        field: 'confirm_booking',
        plan: {
          ...basePlan,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          field: 'confirm_booking',
        },
      });
    }

    const created = await createHybridAppointment({
      clinic,
      service,
      professionals,
      startTime: selectedSlot,
      professionalId,
      customerName,
      customerPhone,
      customerEmail,
    });

    return hybridResult(created.status, created.reply, {
      appointment: created.appointment,
      payment: created.payment,
      actions: created.actions,
      plan: {
        ...basePlan,
        action: 'create_booking',
        customer_phone: customerPhone,
        customer_email: customerEmail,
        confidence: 1,
      },
    });
  }

  if (isGreetingOnly(message) && !currentService && !currentDate && !period && !currentSlotChoice) {
    return hybridResult('answered', serviceQuestionReply(services, settings.opening_message || DEFAULT_AGENT_OPENING), {
      field: 'service_id',
      plan: { action: 'answer', field: 'service_id', confidence: 1 },
    });
  }

  if (!service && context.field === 'service_id' && !date && shouldContinueScheduling) {
    return hybridResult('needs_info', serviceQuestionReply(services, 'Nao consegui identificar o servico. Pode escolher uma das opcoes?'), {
      field: 'service_id',
      plan: { action: 'answer', date, field: 'service_id', confidence: 0.85 },
    });
  }

  if (!service && !date && schedulingIntent) {
    return hybridResult('needs_info', serviceQuestionReply(services, 'Claro. Qual servico voce gostaria de agendar?'), {
      field: 'service_id',
      plan: { action: 'answer', field: 'service_id', confidence: 0.9 },
    });
  }

  if (date && !service && shouldContinueScheduling) {
    return hybridResult('needs_info', serviceQuestionReply(services, 'Perfeito. Qual servico voce gostaria de agendar?'), {
      field: 'service_id',
      plan: { action: 'answer', date, field: 'service_id', confidence: 0.9 },
    });
  }

  if (service && !date && shouldContinueScheduling) {
    return hybridResult('needs_info', dateQuestionReply(service), {
      field: 'date',
      service,
      plan: { action: 'answer', service_id: service.id, field: 'date', confidence: 0.9 },
    });
  }

  if (service && date && shouldContinueScheduling) {
    const { slots, professional: selectedProfessional } = await getAvailableSlotsForClinic(clinic, {
      serviceId: service.id,
      date,
      professionalId,
    });
    const filteredSlots = filterSlotsByPeriod(slots, period);
    const usableSlots = filteredSlots.length ? filteredSlots : slots;

    return hybridResult('slots_found', usableSlots.length
      ? `Encontrei estes horarios para ${service.nome_servico}${periodLabel(period)}: ${usableSlots.slice(0, 5).map(formatSlot).join(', ')}. Qual deles fica melhor para voce?`
      : `Nao encontrei horarios livres para ${service.nome_servico}${periodLabel(period)} nessa data.`, {
      service,
      professional: selectedProfessional || professionals.find((item) => item.id === professionalId) || null,
      slots: usableSlots,
      field: usableSlots.length ? 'start_time' : 'date',
      actions: [{
        type: 'hybrid_list_slots',
        service_id: service.id,
        date,
        professional_id: selectedProfessional?.id || professionalId,
        slots: usableSlots.slice(0, 10),
      }],
      plan: {
        action: 'list_slots',
        service_id: service.id,
        professional_id: selectedProfessional?.id || professionalId,
        date,
        field: usableSlots.length ? 'start_time' : 'date',
        confidence: 0.95,
      },
    });
  }

  return null;
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
    '- Use a mensagem inicial somente no primeiro contato sem dados concretos. Nunca volte para a mensagem inicial depois que houver servico, data, horario, nome ou telefone no estado da conversa.',
    '- Quando conversation_state.field estiver preenchido, interprete a mensagem atual como resposta a esse campo, mesmo que seja curta como "sim", "1", "amanha" ou um nome.',
    '- Se o cliente ja informou servico, data, horario ou preferencia concreta, nao reinicie o fluxo; continue a partir do dado recebido.',
    '- Se faltar servico, data, horario, nome ou telefone, use answer e pergunte apenas o proximo dado.',
    '- Se for perguntar qual servico, inclua a lista de servicos disponiveis do contexto.',
    '- Se o cliente pedir opcoes de horario, use list_slots.',
    '- Se houver duvida, use answer ou handoff.',
    '',
    'Formato JSON:',
    '{"action":"answer|list_slots|create_booking|handoff","reply":"mensagem se for answer/handoff","service_id":"uuid ou null","professional_id":"uuid ou null","date":"YYYY-MM-DD ou null","start_time":"ISO ou null","customer_name":"","customer_phone":"","customer_email":"","notes":"","confidence":0.0}',
  ].join('\n');
}

function buildAgentContextPayload({ message, history = [], clinic, services, professionals, settings }) {
  const derivedState = collectHybridContext(history, services, professionals);

  return JSON.stringify({
    now: new Date().toISOString(),
    timezone: 'America/Sao_Paulo',
    message,
    history: Array.isArray(history) ? history.slice(-8) : [],
    conversation_state: {
      is_first_turn: !Array.isArray(history) || history.length === 0,
      opening_message: settings.opening_message || '',
      has_full_example: Boolean(settings.conversation_example),
      field: derivedState.field,
      service_id: derivedState.service_id,
      professional_id: derivedState.professional_id,
      date: derivedState.date,
      start_time: derivedState.start_time,
      customer_name: derivedState.customer_name,
      customer_phone: derivedState.customer_phone,
      customer_email: derivedState.customer_email,
      recent_slots: derivedState.slots.slice(0, 10),
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
  if (!service) return missingFieldResult('service_id', serviceQuestionReply(services));

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
      field: slots.length ? 'start_time' : 'date',
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

function isMissingAgentMemoryTable(error) {
  const message = `${error?.message || ''} ${error?.data?.message || ''} ${error?.data?.code || ''}`.toLowerCase();
  return error?.status === 404 && (
    message.includes('ai_agent_conversations')
    || message.includes('ai_agent_messages')
    || message.includes('schema cache')
    || message.includes('pgrst205')
  );
}

function normalizeConversationHistory(rows = []) {
  return rows.map((row) => ({
    role: row.role,
    content: row.content,
    ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
  }));
}

function fallbackPayloadHistory(payload = {}) {
  return Array.isArray(payload.history)
    ? payload.history
      .filter((entry) => ['user', 'assistant', 'system'].includes(entry?.role))
      .slice(-30)
    : [];
}

async function ensureAgentConversation(clinic, payload = {}) {
  const channel = String(payload.channel || 'preview').trim().slice(0, 40) || 'preview';
  const conversationId = String(payload.conversation_id || '').trim();
  const externalId = String(payload.external_id || '').trim().slice(0, 160);
  const customerPhone = cleanPhone(payload.customer_phone || payload.phone || '');
  const customerName = String(payload.customer_name || '').trim().slice(0, 160);

  if (isUuid(conversationId)) {
    const rows = await select('ai_agent_conversations', {
      select: '*',
      id: `eq.${conversationId}`,
      clinic_id: `eq.${clinic.id}`,
      limit: 1,
    });
    if (rows.length) return rows[0];
  }

  if (externalId) {
    const found = await select('ai_agent_conversations', {
      select: '*',
      clinic_id: `eq.${clinic.id}`,
      channel: `eq.${channel}`,
      external_id: `eq.${externalId}`,
      limit: 1,
    });
    if (found.length) return found[0];
  }

  const rows = await insert('ai_agent_conversations', [{
    clinic_id: clinic.id,
    channel,
    external_id: externalId || null,
    customer_phone: customerPhone || null,
    customer_name: customerName || null,
    state: {},
  }]);
  return rows[0];
}

async function loadAgentConversationMessages(conversation) {
  if (!conversation?.id) return [];
  const rows = await select('ai_agent_messages', {
    select: 'role,content,metadata,created_at',
    conversation_id: `eq.${conversation.id}`,
    clinic_id: `eq.${conversation.clinic_id}`,
    order: 'created_at.desc',
    limit: 40,
  });
  return normalizeConversationHistory(rows.reverse());
}

async function prepareAgentMemory(clinic, payload = {}) {
  try {
    const conversation = await ensureAgentConversation(clinic, payload);
    const history = await loadAgentConversationMessages(conversation);
    return {
      conversation,
      history: history.length ? history : fallbackPayloadHistory(payload),
      persisted: true,
    };
  } catch (error) {
    if (!isMissingAgentMemoryTable(error)) throw error;
    return {
      conversation: null,
      history: fallbackPayloadHistory(payload),
      persisted: false,
    };
  }
}

function buildConversationState(assistantEntry = {}) {
  const plan = assistantEntry.plan || {};
  return {
    status: assistantEntry.status || null,
    routed_by: assistantEntry.routed_by || null,
    field: assistantEntry.field || plan.field || null,
    service_id: plan.service_id || null,
    professional_id: plan.professional_id || null,
    date: plan.date || null,
    start_time: plan.start_time || null,
    customer_name: plan.customer_name || null,
    customer_phone: plan.customer_phone || null,
    customer_email: plan.customer_email || null,
    slots: Array.isArray(assistantEntry.slots) ? assistantEntry.slots.slice(0, 10) : [],
    appointment_id: assistantEntry.appointment?.id || null,
    payment_status: assistantEntry.payment?.status || null,
    updated_at: new Date().toISOString(),
  };
}

async function appendAgentConversationMessages(conversation, userEntry, assistantEntry) {
  if (!conversation?.id) return false;

  await insert('ai_agent_messages', [
    {
      conversation_id: conversation.id,
      clinic_id: conversation.clinic_id,
      role: 'user',
      content: userEntry.content,
      metadata: userEntry.metadata || {},
    },
    {
      conversation_id: conversation.id,
      clinic_id: conversation.clinic_id,
      role: 'assistant',
      content: assistantEntry.content,
      metadata: {
        status: assistantEntry.status || '',
        routed_by: assistantEntry.routed_by || '',
        field: assistantEntry.field || '',
        plan: assistantEntry.plan || null,
        actions: assistantEntry.actions || [],
        slots: assistantEntry.slots || [],
        appointment: assistantEntry.appointment || null,
        payment: assistantEntry.payment || null,
        response_id: assistantEntry.response_id || null,
        model: assistantEntry.model || null,
      },
    },
  ]);

  const nextState = buildConversationState(assistantEntry);
  await patch('ai_agent_conversations', {
    id: `eq.${conversation.id}`,
    clinic_id: `eq.${conversation.clinic_id}`,
  }, {
    state: nextState,
    customer_phone: nextState.customer_phone || conversation.customer_phone,
    customer_name: nextState.customer_name || conversation.customer_name,
  });

  return true;
}

async function safeAppendAgentConversationMessages(conversation, userEntry, assistantEntry) {
  try {
    return await appendAgentConversationMessages(conversation, userEntry, assistantEntry);
  } catch (error) {
    console.warn('Agent memory persistence failed', error?.message || error);
    return false;
  }
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
      'memoria_persistente_por_conversa',
      'respostas_hibridas_sem_ia',
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
    const memory = await prepareAgentMemory(clinic, payload);
    const hybrid = await tryHybridAgentResponse({
      message: message.slice(0, 3000),
      history: memory.history,
      clinic,
      services,
      professionals,
      settings,
    });

    if (hybrid) {
      const memorySaved = await safeAppendAgentConversationMessages(
        memory.conversation,
        { content: message },
        {
          content: hybrid.reply,
          status: hybrid.status,
          routed_by: 'hybrid',
          field: hybrid.field || null,
          plan: hybrid.plan || null,
          actions: hybrid.actions || [],
          slots: Array.isArray(hybrid.slots) ? hybrid.slots.slice(0, 10) : [],
          appointment: hybrid.appointment || null,
          payment: hybrid.payment || null,
          response_id: null,
          model: null,
        },
      );

      return json(res, 200, {
        reply: hybrid.reply,
        status: hybrid.status,
        plan: hybrid.plan || null,
        actions: hybrid.actions || [],
        field: hybrid.field || null,
        slots: Array.isArray(hybrid.slots) ? hybrid.slots.slice(0, 10) : [],
        appointment: hybrid.appointment || null,
        payment: hybrid.payment || null,
        response_id: null,
        model: null,
        routed_by: 'hybrid',
        conversation_id: memory.conversation?.id || payload.conversation_id || null,
        memory_persisted: memory.persisted && memorySaved,
      });
    }

    const decision = await planAgentAction({
      message: message.slice(0, 3000),
      history: memory.history,
      clinic,
      services,
      professionals,
      settings,
    });
    const result = await executeAgentPlan(decision.plan, { clinic, services, professionals, settings });
    const reply = ['answered', 'handoff', 'needs_info'].includes(result.status)
      ? (result.reply || settings.fallback_message)
      : await naturalizeAgentResult({ message, result, clinic, services, professionals, settings });

    const memorySaved = await safeAppendAgentConversationMessages(
      memory.conversation,
      { content: message },
      {
        content: reply,
        status: result.status,
        routed_by: 'openai',
        field: result.field || null,
        plan: decision.plan,
        actions: result.actions || [],
        slots: Array.isArray(result.slots) ? result.slots.slice(0, 10) : [],
        appointment: result.appointment || null,
        payment: result.payment || null,
        response_id: decision.response_id,
        model: settings.model || DEFAULT_AGENT_MODEL,
      },
    );

    return json(res, 200, {
      reply,
      status: result.status,
      plan: decision.plan,
      actions: result.actions || [],
      field: result.field || null,
      slots: Array.isArray(result.slots) ? result.slots.slice(0, 10) : [],
      appointment: result.appointment || null,
      payment: result.payment || null,
      response_id: decision.response_id,
      model: settings.model || DEFAULT_AGENT_MODEL,
      routed_by: 'openai',
      conversation_id: memory.conversation?.id || payload.conversation_id || null,
      memory_persisted: memory.persisted && memorySaved,
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

  if (values.professional_id === '') values.professional_id = null;

  if (payload.new_start_time) {
    const rows = await select('appointments', {
      select: '*',
      id: `eq.${appointmentId}`,
      clinic_id: `eq.${clinic.id}`,
      limit: 1,
    });

    if (!rows.length) {
      const error = new Error('Agendamento nao encontrado.');
      error.status = 404;
      throw error;
    }

    const nextStart = parseRequiredDate(payload.new_start_time, 'Data de reagendamento invalida.');
    if (nextStart.getTime() < Date.now()) throw httpError('Nao e possivel reagendar para o passado.');

    const currentStart = new Date(rows[0].start_time);
    const currentEnd = new Date(rows[0].end_time);
    const duration = Number(rows[0].duration_minutes)
      || Math.max(15, Math.round((currentEnd.getTime() - currentStart.getTime()) / 60000))
      || 30;
    const nextEnd = new Date(nextStart.getTime() + duration * 60000);
    const professionalId = values.professional_id !== undefined ? values.professional_id : rows[0].professional_id;
    const professional = await loadAppointmentProfessional(clinic, { professional_id: professionalId }, rows[0].service_id);

    assertFitsWorkingHours(clinic, professional, nextStart, nextEnd);
    await assertAppointmentSlotAvailable(clinic, {
      start: nextStart,
      end: nextEnd,
      professionalId: professional?.id || null,
      ignoreAppointmentId: appointmentId,
    });

    values.start_time = nextStart.toISOString();
    values.end_time = nextEnd.toISOString();
    values.duration_minutes = duration;
    if (values.professional_id !== undefined) values.professional_name = professional?.nome || null;
  }

  const touchesSchedule = values.start_time !== undefined
    || values.end_time !== undefined
    || values.duration_minutes !== undefined
    || values.professional_id !== undefined;

  if (touchesSchedule && !payload.new_start_time) {
    const rows = await select('appointments', {
      select: '*',
      id: `eq.${appointmentId}`,
      clinic_id: `eq.${clinic.id}`,
      limit: 1,
    });

    if (!rows.length) {
      const error = new Error('Agendamento nao encontrado.');
      error.status = 404;
      throw error;
    }

    const current = rows[0];
    const nextStart = values.start_time !== undefined
      ? parseRequiredDate(values.start_time, 'Data de agendamento invalida.')
      : new Date(current.start_time);
    const currentStart = new Date(current.start_time);
    const currentEnd = new Date(current.end_time);
    const fallbackDuration = Number(current.duration_minutes)
      || Math.max(15, Math.round((currentEnd.getTime() - currentStart.getTime()) / 60000))
      || 30;
    const duration = normalizeDurationMinutes(values.duration_minutes || fallbackDuration, fallbackDuration);
    const nextEnd = values.end_time !== undefined
      ? parseRequiredDate(values.end_time, 'Data final de agendamento invalida.')
      : new Date(nextStart.getTime() + duration * 60000);
    const normalizedDuration = Math.round((nextEnd.getTime() - nextStart.getTime()) / 60000);
    const professionalId = values.professional_id !== undefined ? values.professional_id : current.professional_id;
    const professional = await loadAppointmentProfessional(clinic, { professional_id: professionalId }, current.service_id);

    if (nextStart.getTime() < Date.now()) throw httpError('Nao e possivel agendar no passado.');
    if (nextEnd <= nextStart) throw httpError('Horario final deve ser maior que o inicial.');

    assertFitsWorkingHours(clinic, professional, nextStart, nextEnd);
    await assertAppointmentSlotAvailable(clinic, {
      start: nextStart,
      end: nextEnd,
      professionalId: professional?.id || null,
      ignoreAppointmentId: appointmentId,
    });

    values.start_time = nextStart.toISOString();
    values.end_time = nextEnd.toISOString();
    values.duration_minutes = normalizeDurationMinutes(normalizedDuration, duration);
    if (values.professional_id !== undefined) values.professional_name = professional?.nome || null;
  }

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
