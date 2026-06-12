import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import * as baileys from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

const {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = baileys;

const makeWASocket = baileys.default || baileys.makeWASocket;

function envNumber(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

const config = {
  apiBaseUrl: process.env.HORALIS_API_BASE_URL || 'http://host.docker.internal:8787/api/v1',
  channelApiKey: process.env.HORALIS_CHANNEL_API_KEY || '',
  sessionPrefix: process.env.WHATSAPP_SESSION_NAME || 'horalis-dev',
  ignoreGroups: process.env.WHATSAPP_IGNORE_GROUPS !== 'false',
  replyDelayMs: envNumber('WHATSAPP_REPLY_DELAY_MS', 350, { min: 0, max: 30000 }),
  inboundDebounceMs: envNumber('WHATSAPP_INBOUND_DEBOUNCE_MS', 1400, { min: 0, max: 15000 }),
  combineWindowMs: envNumber('WHATSAPP_COMBINE_WINDOW_MS', 7000, { min: 0, max: 30000 }),
  maxCombinedMessages: envNumber('WHATSAPP_MAX_COMBINED_MESSAGES', 4, { min: 1, max: 12 }),
  queueConcurrency: envNumber('WHATSAPP_QUEUE_CONCURRENCY', 2, { min: 1, max: 8 }),
  queueMaxSize: envNumber('WHATSAPP_QUEUE_MAX_SIZE', 120, { min: 10, max: 2000 }),
  maxSessions: envNumber('WHATSAPP_MAX_SESSIONS', 8, { min: 1, max: 50 }),
  typingMinDelayMs: envNumber('WHATSAPP_TYPING_MIN_DELAY_MS', 1200, { min: 0, max: 30000 }),
  typingMaxDelayMs: envNumber('WHATSAPP_TYPING_MAX_DELAY_MS', 8000, { min: 500, max: 60000 }),
  typingCharsPerSecond: envNumber('WHATSAPP_TYPING_CHARS_PER_SECOND', 35, { min: 4, max: 120 }),
  typingJitterMs: envNumber('WHATSAPP_TYPING_JITTER_MS', 650, { min: 0, max: 5000 }),
  typingPresenceIntervalMs: envNumber('WHATSAPP_TYPING_PRESENCE_INTERVAL_MS', 4500, { min: 1000, max: 15000 }),
  paymentQrDelayMs: envNumber('WHATSAPP_PAYMENT_QR_DELAY_MS', 650, { min: 0, max: 10000 }),
  port: Number(process.env.WHATSAPP_QR_PORT || process.env.PORT || 8788),
  host: process.env.WHATSAPP_QR_HOST || '0.0.0.0',
  authDataPath: process.env.WHATSAPP_AUTH_DATA_PATH || './.baileys_auth',
  connectTimeoutMs: envNumber('WHATSAPP_CONNECT_TIMEOUT_MS', 60000, { min: 5000, max: 180000 }),
  qrTimeoutMs: envNumber('WHATSAPP_QR_TIMEOUT_MS', 60000, { min: 10000, max: 180000 }),
};

const sessions = new Map();
const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || 'silent' });

function cleanPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function sanitizeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function requireConfig() {
  const missing = [];
  if (!makeWASocket) missing.push('makeWASocket');
  if (!config.channelApiKey) missing.push('HORALIS_CHANNEL_API_KEY');
  if (!config.apiBaseUrl) missing.push('HORALIS_API_BASE_URL');

  if (missing.length) {
    throw new Error(`Configure ${missing.join(', ')} antes de iniciar o worker.`);
  }
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Horalis-Channel-Key',
  });
  res.end(JSON.stringify(data));
}

function publicSession(session) {
  return {
    slug: session.slug,
    status: session.status,
    qr: session.qr,
    phone: session.phone || null,
    last_error: session.lastError || null,
    started_at: session.startedAt,
    updated_at: session.updatedAt,
    queue: queueStats(session),
  };
}

function queueStats(session) {
  return {
    pending: session.queue?.length || 0,
    active: session.activeJobs || 0,
    active_chats: session.activeChats?.size || 0,
    concurrency: config.queueConcurrency,
  };
}

function rememberMessage(session, id) {
  if (!id) return false;
  if (session.seenMessages.has(id)) return true;

  session.seenMessages.add(id);
  if (session.seenMessages.size > 1000) {
    const [oldest] = session.seenMessages;
    session.seenMessages.delete(oldest);
  }
  return false;
}

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

async function askHoralisAgent(session, message) {
  const endpoint = `${config.apiBaseUrl.replace(/\/$/, '')}/channels/whatsapp_qr/${encodeURIComponent(session.slug)}/message`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-horalis-channel-key': config.channelApiKey,
    },
    body: JSON.stringify({
      channel: 'whatsapp_qr',
      message: message.body,
      customer_phone: message.customerPhone,
      phone_candidates: message.phoneCandidates || [],
      external_id: message.chatId,
      metadata: {
        whatsapp_message_id: message.messageId,
        whatsapp_message_ids: message.messageIds || [message.messageId].filter(Boolean),
        whatsapp_combined_count: message.messageCount || 1,
        whatsapp_chat_id: message.chatId,
        whatsapp_from: message.from,
        whatsapp_phone_candidates: message.phoneCandidates || [],
        timestamp: message.timestamp,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Horalis API respondeu ${response.status}`);
  }
  return data;
}

function uniqueValues(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizeTextForMatch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function messagePriority(body) {
  const text = normalizeTextForMatch(body);
  let priority = 50;

  if (/\b(paguei|pagamento|pix|comprovante|sinal|qrcode|qr code|ja paguei|ja fiz)\b/.test(text)) priority += 40;
  if (/\b(cancelar|cancela|remarcar|remarca|atrasado|atrasar|urgente|problema|reclamacao)\b/.test(text)) priority += 30;
  if (/\b(agendar|agendamento|agenda|marcar|marca|horario|horarios|hora|disponivel|amanha|hoje|semana)\b/.test(text)) priority += 20;
  if (/\b(corte|barba|sobrancelha|servico|servicos|profissional|barbeiro|cabeleireiro|manicure)\b/.test(text)) priority += 12;
  if (/\b(confirmo|confirmar|confirmado|pode marcar|fechado|sim|ok|beleza)\b/.test(text)) priority += 10;
  if (/^\s*(obrigad[oa]?|valeu|blz|beleza|ok)\s*[!.]*\s*$/.test(text)) priority -= 12;

  return clamp(priority, 0, 100);
}

function estimatedTypingDelayMs(text) {
  const characters = String(text || '').length;
  const typedDelay = (characters / config.typingCharsPerSecond) * 1000;
  const jitter = config.typingJitterMs ? Math.round(Math.random() * config.typingJitterMs) : 0;
  const delay = config.replyDelayMs + typedDelay + jitter;
  return clamp(Math.round(delay), config.typingMinDelayMs, config.typingMaxDelayMs);
}

function shortLogText(value, max = 140) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function createIncomingJob(session, values) {
  const now = Date.now();
  session.queueSequence = (session.queueSequence || 0) + 1;
  return {
    ...values,
    id: `${now}-${session.queueSequence}`,
    sequence: session.queueSequence,
    priority: messagePriority(values.body),
    enqueuedAt: now,
    updatedAtMs: now,
    readyAt: now + config.inboundDebounceMs,
    messageIds: [values.messageId].filter(Boolean),
    messageCount: 1,
  };
}

function mergeIncomingJob(target, incoming) {
  target.body = [target.body, incoming.body].filter(Boolean).join('\n');
  target.msg = incoming.msg;
  target.messageId = incoming.messageId || target.messageId;
  target.timestamp = incoming.timestamp || target.timestamp;
  target.customerPhone = target.customerPhone || incoming.customerPhone;
  target.phoneCandidates = uniqueValues([...(target.phoneCandidates || []), ...(incoming.phoneCandidates || [])]);
  target.messageIds = uniqueValues([...(target.messageIds || []), incoming.messageId]);
  target.priority = Math.max(target.priority, incoming.priority);
  target.messageCount = (target.messageCount || 1) + 1;
  target.updatedAtMs = Date.now();
  target.readyAt = target.updatedAtMs + config.inboundDebounceMs;
}

function scheduleQueue(session, delayMs = 0) {
  if (!session) return;

  const dueAt = Date.now() + Math.max(0, delayMs);
  if (session.queueTimer && session.queueTimerDueAt <= dueAt) return;
  if (session.queueTimer) clearTimeout(session.queueTimer);

  session.queueTimerDueAt = dueAt;
  session.queueTimer = setTimeout(() => {
    session.queueTimer = null;
    session.queueTimerDueAt = 0;
    processSessionQueue(session).catch((error) => {
      console.error(`Erro ao processar fila WhatsApp "${session.slug}":`, error?.message || error);
    });
  }, Math.max(0, delayMs));
  session.queueTimer.unref?.();
}

function findMergeableQueuedJob(session, incoming) {
  const now = Date.now();
  for (let index = session.queue.length - 1; index >= 0; index -= 1) {
    const queued = session.queue[index];
    if (queued.remoteJid !== incoming.remoteJid) continue;
    if ((queued.messageCount || 1) >= config.maxCombinedMessages) return null;
    if (now - queued.updatedAtMs > config.combineWindowMs) return null;
    return queued;
  }
  return null;
}

async function enqueueIncomingMessage(session, incoming) {
  if (session.queue.length >= config.queueMaxSize) {
    console.warn(`Fila cheia para "${session.slug}". Descartando mensagem de ${incoming.remoteJid}.`);
    await session.sock?.sendMessage(incoming.remoteJid, {
      text: 'Recebi sua mensagem, mas estamos com um volume alto agora. Vou pedir para a equipe continuar seu atendimento.',
    }, { quoted: incoming.msg }).catch(() => {});
    return;
  }

  const job = createIncomingJob(session, incoming);
  const mergeable = session.activeChats.has(job.remoteJid) ? null : findMergeableQueuedJob(session, job);
  if (mergeable) {
    mergeIncomingJob(mergeable, job);
    console.log(`[${session.slug}:${job.customerPhone || job.remoteJid}] mensagem combinada na fila (${mergeable.messageCount} partes, prioridade ${mergeable.priority}).`);
  } else {
    session.queue.push(job);
    console.log(`[${session.slug}:${job.customerPhone || job.remoteJid}] mensagem enfileirada (prioridade ${job.priority}, fila ${session.queue.length}).`);
  }

  scheduleQueue(session);
}

function pickNextQueueIndex(session) {
  const now = Date.now();
  let bestIndex = -1;
  let bestScore = -Infinity;

  for (let index = 0; index < session.queue.length; index += 1) {
    const job = session.queue[index];
    if (job.readyAt > now) continue;
    if (session.activeChats.has(job.remoteJid)) continue;

    const ageBoost = Math.floor((now - job.enqueuedAt) / 30000);
    const score = job.priority + ageBoost;
    if (
      score > bestScore
      || (score === bestScore && bestIndex >= 0 && job.enqueuedAt < session.queue[bestIndex].enqueuedAt)
      || (score === bestScore && bestIndex >= 0 && job.enqueuedAt === session.queue[bestIndex].enqueuedAt && job.sequence < session.queue[bestIndex].sequence)
    ) {
      bestIndex = index;
      bestScore = score;
    }
  }

  return bestIndex;
}

function nextQueueDelayMs(session) {
  const now = Date.now();
  let delay = null;

  for (const job of session.queue) {
    if (session.activeChats.has(job.remoteJid)) continue;
    const remaining = Math.max(0, job.readyAt - now);
    delay = delay === null ? remaining : Math.min(delay, remaining);
  }

  return delay;
}

async function processSessionQueue(session) {
  if (sessions.get(session.slug) !== session) return;

  if (session.status !== 'ready') {
    if (session.queue.length) scheduleQueue(session, 2000);
    return;
  }

  while (session.activeJobs < config.queueConcurrency) {
    const index = pickNextQueueIndex(session);
    if (index < 0) break;

    const [job] = session.queue.splice(index, 1);
    session.activeJobs += 1;
    session.activeChats.add(job.remoteJid);

    processIncomingJob(session, job)
      .catch((error) => {
        console.error(`[${session.slug}:${job.customerPhone || job.remoteJid}] erro na fila:`, error?.message || error);
      })
      .finally(() => {
        session.activeJobs = Math.max(0, session.activeJobs - 1);
        session.activeChats.delete(job.remoteJid);
        scheduleQueue(session);
      });
  }

  const delay = nextQueueDelayMs(session);
  if (delay !== null && session.activeJobs < config.queueConcurrency) scheduleQueue(session, delay);
}

function startTyping(session, remoteJid) {
  let stopped = false;

  const update = () => {
    session.sock?.sendPresenceUpdate?.('composing', remoteJid).catch(() => {});
  };

  update();
  const interval = setInterval(update, config.typingPresenceIntervalMs);
  interval.unref?.();

  return async () => {
    if (stopped) return;
    stopped = true;
    clearInterval(interval);
    await session.sock?.sendPresenceUpdate?.('paused', remoteJid).catch(() => {});
  };
}

function sessionClientId(slug) {
  return `${config.sessionPrefix}-${slug}`;
}

function sessionAuthPath(slug) {
  return path.join(config.authDataPath, sessionClientId(slug));
}

function persistedSessionSlugs() {
  const prefix = `${config.sessionPrefix}-`;

  try {
    if (!fs.existsSync(config.authDataPath)) return [];
    return fs.readdirSync(config.authDataPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
      .map((entry) => sanitizeSlug(entry.name.slice(prefix.length)))
      .filter((slug) => slug && fs.existsSync(path.join(sessionAuthPath(slug), 'creds.json')));
  } catch (error) {
    console.warn('Nao foi possivel listar sessoes WhatsApp salvas:', error?.message || error);
    return [];
  }
}

function jidUser(jid) {
  return String(jid || '').split('@')[0];
}

function jidPhone(jid) {
  return jidUser(jid).split(':')[0];
}

function isLidJid(jid) {
  return String(jid || '').toLowerCase().endsWith('@lid');
}

function phoneCandidateFromJid(jid) {
  const value = String(jid || '').toLowerCase();
  if (!value || isLidJid(value)) return '';
  if (value.endsWith('@s.whatsapp.net') || value.endsWith('@c.us')) return jidPhone(jid);
  return '';
}

function isGroupJid(jid) {
  return String(jid || '').endsWith('@g.us');
}

function isStatusJid(jid) {
  return String(jid || '') === 'status@broadcast';
}

function normalizeOutboundJid(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return raw;

  const digits = cleanPhone(raw);
  if (digits.length >= 10 && digits.length <= 13) return `${digits}@s.whatsapp.net`;
  return '';
}

function messageText(message = {}) {
  const content = message.message || {};
  return String(
    content.conversation
    || content.extendedTextMessage?.text
    || content.imageMessage?.caption
    || content.videoMessage?.caption
    || content.buttonsResponseMessage?.selectedDisplayText
    || content.listResponseMessage?.title
    || content.templateButtonReplyMessage?.selectedDisplayText
    || '',
  ).trim();
}

function base64ImageBuffer(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const base64 = raw.includes(',') ? raw.split(',').pop() : raw;

  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

async function sendPaymentQrImage(session, remoteJid, result, quotedMessage) {
  const buffer = base64ImageBuffer(result?.payment?.qr_code_base64);
  if (!buffer?.length) return;

  await session.sock.sendMessage(remoteJid, {
    image: buffer,
    caption: 'QR Code Pix do sinal.',
  }, { quoted: quotedMessage });
}

async function sendOutboundText(session, payload = {}) {
  if (!session?.sock || session.status !== 'ready') {
    const error = new Error('Sessao WhatsApp nao esta pronta para envio.');
    error.status = 409;
    throw error;
  }

  const to = normalizeOutboundJid(payload.to || payload.chat_id || payload.remote_jid || payload.phone);
  const text = String(payload.text || payload.message || '').trim();
  if (!to) {
    const error = new Error('Destino WhatsApp invalido.');
    error.status = 400;
    throw error;
  }
  if (!text) {
    const error = new Error('Mensagem vazia.');
    error.status = 400;
    throw error;
  }

  const result = await session.sock.sendMessage(to, { text });
  return {
    ok: true,
    to,
    message_id: result?.key?.id || null,
  };
}

function baileysStatusCode(error) {
  return error?.output?.statusCode || error?.statusCode || error?.data?.statusCode || null;
}

function baileysReasonName(statusCode) {
  return statusCode ? DisconnectReason?.[statusCode] || '' : '';
}

function baileysErrorMessage(error, statusCode) {
  return String(error?.message || baileysReasonName(statusCode) || 'Falha de conexao');
}

function isRestartRequired(error, statusCode) {
  return statusCode === DisconnectReason?.restartRequired
    || String(error?.message || '').toLowerCase().includes('restart required');
}

function isInvalidAuthDisconnect(statusCode) {
  return statusCode === DisconnectReason?.loggedOut || statusCode === DisconnectReason?.badSession;
}

function isPermanentDisconnect(statusCode) {
  return [
    DisconnectReason?.loggedOut,
    DisconnectReason?.badSession,
    DisconnectReason?.connectionReplaced,
    DisconnectReason?.forbidden,
    DisconnectReason?.multideviceMismatch,
  ].includes(statusCode);
}

function reconnectDelayMs(session) {
  session.reconnectAttempts = (session.reconnectAttempts || 0) + 1;
  return Math.min(2000 + (session.reconnectAttempts - 1) * 1500, 15000);
}

function whatsappBrowser() {
  return Browsers?.ubuntu?.('Chrome') || ['Ubuntu', 'Chrome', '22.04.4'];
}

function clearSessionAuth(slug) {
  fs.rmSync(sessionAuthPath(slug), { recursive: true, force: true });
}

function scheduleReconnect(session, generation, delayMs) {
  setTimeout(() => {
    if (sessions.get(session.slug) === session && session.generation === generation && ['starting', 'qr', 'reconnecting', 'restarting'].includes(session.status)) {
      connectSession(session).catch((error) => {
        session.status = 'error';
        session.lastError = error?.message || 'Erro ao reconectar WhatsApp.';
        session.updatedAt = new Date().toISOString();
      });
    }
  }, delayMs);
}

async function connectSession(session) {
  const generation = (session.generation || 0) + 1;
  session.generation = generation;

  const authPath = sessionAuthPath(session.slug);
  fs.mkdirSync(authPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const latest = await fetchLatestBaileysVersion().catch(() => ({}));
  const sock = makeWASocket({
    auth: state,
    browser: whatsappBrowser(),
    connectTimeoutMs: config.connectTimeoutMs,
    defaultQueryTimeoutMs: config.connectTimeoutMs,
    keepAliveIntervalMs: 20000,
    logger,
    printQRInTerminal: false,
    qrTimeout: config.qrTimeoutMs,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    ...(Array.isArray(latest.version) ? { version: latest.version } : {}),
  });

  session.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    if (sessions.get(session.slug) !== session || session.generation !== generation) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.qr = qr;
      session.status = 'qr';
      session.lastError = '';
      session.updatedAt = new Date().toISOString();
      console.log(`\nQR Code gerado para "${session.slug}". Ele tambem esta disponivel no painel.\n`);
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'connecting') {
      session.status = session.qr ? 'qr' : 'starting';
      session.updatedAt = new Date().toISOString();
    }

    if (connection === 'open') {
      session.qr = '';
      session.status = 'ready';
      session.phone = jidPhone(sock.user?.id);
      session.wasReady = true;
      session.authResetCount = 0;
      session.reconnectAttempts = 0;
      session.lastError = '';
      session.updatedAt = new Date().toISOString();
      console.log(`WhatsApp QR pronto para "${session.slug}".`);
      scheduleQueue(session);
    }

    if (connection === 'close') {
      const statusCode = baileysStatusCode(lastDisconnect?.error);
      const restartRequired = isRestartRequired(lastDisconnect?.error, statusCode);
      const invalidAuth = isInvalidAuthDisconnect(statusCode);
      const shouldResetAuth = invalidAuth && !session.wasReady && (session.authResetCount || 0) < 2;
      const shouldReconnect = shouldResetAuth || !isPermanentDisconnect(statusCode);
      const errorMessage = baileysErrorMessage(lastDisconnect?.error, statusCode);
      const reasonName = baileysReasonName(statusCode);
      const reasonDetail = [errorMessage, reasonName || statusCode].filter(Boolean).join(' / ');

      if (shouldResetAuth) {
        session.authResetCount = (session.authResetCount || 0) + 1;
        session.qr = '';
        session.status = 'starting';
        session.lastError = '';
        session.updatedAt = new Date().toISOString();
        clearSessionAuth(session.slug);
        console.warn(`Credenciais invalidas para "${session.slug}". Limpando sessao local e gerando novo QR:`, reasonDetail);
        scheduleReconnect(session, generation, 800);
        return;
      }

      session.status = shouldReconnect ? (restartRequired ? 'restarting' : 'reconnecting') : 'disconnected';
      session.lastError = shouldReconnect ? '' : errorMessage;
      session.updatedAt = new Date().toISOString();
      const logMessage = shouldReconnect
        ? (restartRequired ? 'WhatsApp reiniciando conexao' : 'WhatsApp reconectando')
        : 'WhatsApp desconectado';
      console[shouldReconnect ? 'info' : 'warn'](`${logMessage} para "${session.slug}":`, reasonDetail || 'sem detalhe');

      if (shouldReconnect && sessions.get(session.slug) === session) {
        scheduleReconnect(session, generation, reconnectDelayMs(session));
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages = [] }) => {
    if (sessions.get(session.slug) !== session || session.generation !== generation) return;

    for (const message of messages) {
      await handleIncomingMessage(session, message);
    }
  });
}

async function handleIncomingMessage(session, msg) {
  const remoteJid = msg.key?.remoteJid || '';
  const messageId = msg.key?.id || '';
  if (rememberMessage(session, messageId)) return;
  if (msg.key?.fromMe) return;
  if (isStatusJid(remoteJid)) return;
  if (config.ignoreGroups && isGroupJid(remoteJid)) return;

  const body = messageText(msg);
  if (!body) return;

  const participant = msg.key?.participant || msg.participant || '';
  const phoneCandidates = uniqueValues([
    phoneCandidateFromJid(remoteJid),
    phoneCandidateFromJid(participant),
    msg.pushName,
  ]);
  const customerPhone = phoneCandidates
    .map(cleanPhone)
    .find((candidate) => candidate.length >= 10 && candidate.length <= 13) || '';

  await enqueueIncomingMessage(session, {
    msg,
    body,
    remoteJid,
    chatId: remoteJid,
    customerPhone,
    from: remoteJid,
    messageId,
    timestamp: Number(msg.messageTimestamp || 0),
    phoneCandidates,
  });
}

async function processIncomingJob(session, job) {
  let stopTyping = async () => {};
  try {
    stopTyping = startTyping(session, job.remoteJid);

    const result = await askHoralisAgent(session, {
      body: job.body,
      chatId: job.chatId,
      customerPhone: job.customerPhone,
      from: job.from,
      messageId: job.messageId,
      messageIds: job.messageIds,
      messageCount: job.messageCount,
      timestamp: job.timestamp,
      phoneCandidates: job.phoneCandidates,
    });

    const reply = String(result.reply || '').trim();
    if (!reply) return;

    await sleep(estimatedTypingDelayMs(reply));
    await session.sock.sendMessage(job.remoteJid, { text: reply }, { quoted: job.msg });

    if (result?.payment?.qr_code_base64) await sleep(config.paymentQrDelayMs);
    await sendPaymentQrImage(session, job.remoteJid, result, job.msg);
    console.log(`[${session.slug}:${job.customerPhone || job.remoteJid}] ${shortLogText(job.body)} -> ${result.status || 'answered'} (${result.routed_by || 'unknown'}, prioridade ${job.priority}, partes ${job.messageCount || 1})`);
  } catch (error) {
    console.error(`[${session.slug}:${job.customerPhone || job.remoteJid}] erro ao responder:`, error?.message || error);
    try {
      await session.sock?.sendMessage(job.remoteJid, {
        text: 'Tive uma instabilidade por aqui. Vou pedir para uma pessoa da equipe continuar seu atendimento.',
      }, { quoted: job.msg });
    } catch (replyError) {
      console.error('Nao consegui enviar mensagem de fallback:', replyError?.message || replyError);
    }
  } finally {
    await stopTyping();
  }
}

function startSession(rawSlug, { restored = false } = {}) {
  const slug = sanitizeSlug(rawSlug);
  if (!slug) {
    const error = new Error('Slug invalido.');
    error.status = 400;
    throw error;
  }

  const existing = sessions.get(slug);
  if (existing && ['starting', 'qr', 'ready', 'reconnecting', 'restarting'].includes(existing.status)) return existing;
  if (!existing && sessions.size >= config.maxSessions) {
    const error = new Error(`Limite de ${config.maxSessions} sessoes WhatsApp atingido neste worker.`);
    error.status = 429;
    throw error;
  }

  const now = new Date().toISOString();
  const session = {
    slug,
    status: restored ? 'reconnecting' : 'starting',
    qr: '',
    phone: null,
    lastError: '',
    startedAt: now,
    updatedAt: now,
    authResetCount: 0,
    reconnectAttempts: 0,
    seenMessages: new Set(),
    queue: [],
    queueSequence: 0,
    queueTimer: null,
    queueTimerDueAt: 0,
    activeJobs: 0,
    activeChats: new Set(),
    sock: null,
    wasReady: false,
    generation: 0,
  };

  sessions.set(slug, session);
  connectSession(session).catch((error) => {
    session.status = 'error';
    session.lastError = error?.message || 'Erro ao iniciar WhatsApp.';
    session.updatedAt = new Date().toISOString();
    console.error(`Erro ao iniciar sessao "${slug}":`, error);
  });

  return session;
}

function restorePersistedSessions() {
  const slugs = persistedSessionSlugs();
  if (!slugs.length) return;

  const restored = slugs.slice(0, config.maxSessions);
  if (slugs.length > restored.length) {
    console.warn(`Encontradas ${slugs.length} sessoes salvas, mas WHATSAPP_MAX_SESSIONS=${config.maxSessions}. Restaurando apenas: ${restored.join(', ')}`);
  }

  console.log(`Restaurando ${restored.length} sessao(oes) WhatsApp salva(s): ${restored.join(', ')}`);
  for (const slug of restored) startSession(slug, { restored: true });
}

async function stopSession(rawSlug) {
  const slug = sanitizeSlug(rawSlug);
  const session = sessions.get(slug);
  if (!session) return null;

  try {
    await session.sock?.logout?.();
  } catch (error) {
    console.warn(`Falha ao deslogar "${slug}":`, error?.message || error);
  }

  try {
    session.sock?.end?.(new Error('Sessao encerrada pelo Horalis.'));
  } catch (error) {
    console.warn(`Falha ao encerrar socket "${slug}":`, error?.message || error);
  }

  try {
    clearSessionAuth(slug);
  } catch (error) {
    console.warn(`Falha ao limpar credenciais "${slug}":`, error?.message || error);
  }

  session.status = 'disconnected';
  session.qr = '';
  session.updatedAt = new Date().toISOString();
  session.queue = [];
  session.activeChats?.clear?.();
  session.activeJobs = 0;
  if (session.queueTimer) clearTimeout(session.queueTimer);
  session.queueTimer = null;
  sessions.delete(slug);
  return session;
}

function routePath(url) {
  return new URL(url, `http://${config.host}:${config.port}`).pathname.split('/').filter(Boolean);
}

function getRequestKey(req) {
  const headerKey = req.headers['x-horalis-channel-key'];
  if (headerKey) return String(headerKey);

  const auth = req.headers.authorization || '';
  return String(auth).match(/^Bearer\s+(.+)$/i)?.[1] || '';
}

function requireRequestKey(req) {
  if (getRequestKey(req) !== config.channelApiKey) {
    const error = new Error('Chave invalida.');
    error.status = 401;
    throw error;
  }
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });

  const parts = routePath(req.url);
  if (!parts.length || parts[0] === 'health') {
    const sessionList = [...sessions.values()];
    return json(res, 200, {
      ok: true,
      service: 'horalis-whatsapp-qr',
      driver: 'baileys',
      sessions: sessions.size,
      max_sessions: config.maxSessions,
      pending_messages: sessionList.reduce((total, session) => total + (session.queue?.length || 0), 0),
      active_jobs: sessionList.reduce((total, session) => total + (session.activeJobs || 0), 0),
    });
  }

  if (parts[0] === 'sessions' && parts[1]) {
    requireRequestKey(req);

    const slug = parts[1];
    const action = parts[2] || 'status';

    if (action === 'start' && req.method === 'POST') {
      await readJson(req).catch(() => ({}));
      const session = startSession(slug);
      return json(res, 200, publicSession(session));
    }

    if (action === 'status' && req.method === 'GET') {
      const session = sessions.get(sanitizeSlug(slug));
      return json(res, 200, session ? publicSession(session) : {
        slug: sanitizeSlug(slug),
        status: 'disconnected',
        qr: '',
        phone: null,
        last_error: null,
      });
    }

    if (action === 'logout' && req.method === 'POST') {
      const session = await stopSession(slug);
      return json(res, 200, session ? publicSession(session) : {
        slug: sanitizeSlug(slug),
        status: 'disconnected',
        qr: '',
        phone: null,
        last_error: null,
      });
    }

    if (action === 'send' && req.method === 'POST') {
      const session = sessions.get(sanitizeSlug(slug));
      if (!session) return json(res, 404, { detail: 'Sessao WhatsApp nao encontrada.' });

      const payload = await readJson(req);
      const result = await sendOutboundText(session, payload);
      return json(res, 200, result);
    }
  }

  return json(res, 404, { detail: 'Nao encontrado.' });
}

requireConfig();

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('Erro HTTP no worker:', error);
    json(res, error?.status || 500, { detail: error?.message || 'Erro interno.' });
  });
});

server.listen(config.port, config.host, () => {
  console.log(`WhatsApp QR backend Baileys ouvindo em http://${config.host}:${config.port}`);
  restorePersistedSessions();
});
