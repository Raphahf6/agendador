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

function weekdayKey(dateString) {
  const date = new Date(`${dateString}T12:00:00${SAO_PAULO_OFFSET}`);
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
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

async function handleAvailableSlots(req, res, slug) {
  const query = getQuery(req);
  const serviceId = query.get('service_id');
  const date = query.get('date');
  const professionalId = query.get('professional_id');

  if (!serviceId || !date) return badRequest(res, 'service_id e date sao obrigatorios.');

  const clinic = await getClinicBySlug(slug);
  const services = await select('services', { select: '*', id: `eq.${serviceId}`, clinic_id: `eq.${clinic.id}`, limit: 1 });
  if (!services.length) return notFound(res, 'Servico nao encontrado.');

  let schedule = clinic.horario_trabalho_detalhado || defaultSchedule();

  if (professionalId && isUuid(professionalId)) {
    const proRows = await select('professionals', {
      select: '*',
      id: `eq.${professionalId}`,
      clinic_id: `eq.${clinic.id}`,
      limit: 1,
    });
    if (proRows[0]?.horario_trabalho && Object.keys(proRows[0].horario_trabalho).length) {
      schedule = { ...schedule, ...proRows[0].horario_trabalho };
    }
  }

  const day = schedule[weekdayKey(date)];
  if (!day?.isOpen) return json(res, 200, { horarios_disponiveis: [] });

  const start = minutesFromHHMM(day.openTime);
  const end = minutesFromHHMM(day.closeTime);
  const duration = Number(services[0].duracao_minutos || 30);
  const appointments = await select('appointments', {
    select: 'start_time,end_time',
    clinic_id: `eq.${clinic.id}`,
    start_time: `gte.${date}T00:00:00${SAO_PAULO_OFFSET}`,
    end_time: `lte.${date}T23:59:59${SAO_PAULO_OFFSET}`,
    status: 'neq.cancelado',
  });

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
  const appointment = await createAppointmentFromPayload(clinic, payload, {
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

function applyCompatConstraints(rows, constraints = []) {
  let result = [...rows];
  const fieldMap = {
    startTime: 'start_time',
    endTime: 'end_time',
    customerName: 'customer_name',
    professionalId: 'professional_id',
    serviceName: 'service_name',
  };

  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      const field = fieldMap[constraint.field] || constraint.field;
      const expected = constraint.value;
      result = result.filter((row) => {
        const actual = row[field];
        if (constraint.op === '==') return actual === expected;
        if (constraint.op === '>=') return new Date(actual) >= new Date(expected);
        if (constraint.op === '<=') return new Date(actual) <= new Date(expected);
        if (constraint.op === '>') return new Date(actual) > new Date(expected);
        if (constraint.op === '<') return new Date(actual) < new Date(expected);
        return true;
      });
    }

    if (constraint.type === 'orderBy') {
      const field = fieldMap[constraint.field] || constraint.field;
      const direction = constraint.direction === 'desc' ? -1 : 1;
      result.sort((a, b) => String(a[field] || '').localeCompare(String(b[field] || '')) * direction);
    }

    if (constraint.type === 'limit') {
      result = result.slice(0, Number(constraint.count || result.length));
    }
  }

  return result;
}

async function handleFirestoreCompat(req, res, user, parts) {
  const [, , root, slug, child] = parts;
  if (root !== 'cabeleireiros' || !slug || !child) return notFound(res);

  const { clinic } = await requireClinicMember(user, slug);
  const constraintsRaw = getQuery(req).get('constraints');
  const constraints = constraintsRaw ? JSON.parse(constraintsRaw) : [];

  if (child === 'agendamentos') {
    const rows = await select('appointments', {
      select: '*',
      clinic_id: `eq.${clinic.id}`,
      status: 'neq.cancelado',
      order: 'start_time.asc',
    });
    return json(res, 200, applyCompatConstraints(rows, constraints));
  }

  if (child === 'servicos') {
    const rows = await getServices(clinic.id);
    return json(res, 200, applyCompatConstraints(rows, constraints));
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

async function handleCalendarMutation(req, res, user, parts) {
  const slug = parts[2];
  const appointmentId = parts[4];
  const { clinic } = await requireClinicMember(user, slug);

  if (req.method === 'PATCH') {
    const payload = await readJson(req);
    const rows = await patch('appointments', { id: `eq.${appointmentId}`, clinic_id: `eq.${clinic.id}` }, payload);
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

  if (parts[1] === 'firestore-compat') return handleFirestoreCompat(req, res, user, parts);
  if (parts[1] === 'clientes' && parts[2] === 'adicionar-nota' && req.method === 'POST') return handleAddNote(req, res, user);
  if (parts[1] === 'clientes' && parts[2] === 'enviar-promocional') return json(res, 202, { ok: true });
  if (parts[1] === 'clientes' && parts[2] && parts[3] === 'google-sync' && req.method === 'PATCH') return handleIntegrationRoutes(req, res, user, parts);
  if (parts[1] === 'clientes' && parts[2]) {
    if (parts[3] === 'lista-crm' || parts[3] === 'detalhes-crm') return handleCrm(req, res, user, parts);
    return handleAdminClinic(req, res, user, parts[2]);
  }

  if (parts[1] === 'calendario' && parts[2] === 'agendar' && req.method === 'POST') return handleCreateAppointment(req, res, true);
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
