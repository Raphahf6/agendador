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

const config = {
  apiBaseUrl: process.env.HORALIS_API_BASE_URL || 'http://host.docker.internal:8787/api/v1',
  channelApiKey: process.env.HORALIS_CHANNEL_API_KEY || '',
  sessionPrefix: process.env.WHATSAPP_SESSION_NAME || 'horalis-dev',
  ignoreGroups: process.env.WHATSAPP_IGNORE_GROUPS !== 'false',
  replyDelayMs: Number(process.env.WHATSAPP_REPLY_DELAY_MS || 350),
  port: Number(process.env.WHATSAPP_QR_PORT || process.env.PORT || 8788),
  host: process.env.WHATSAPP_QR_HOST || '0.0.0.0',
  authDataPath: process.env.WHATSAPP_AUTH_DATA_PATH || './.baileys_auth',
  connectTimeoutMs: Number(process.env.WHATSAPP_CONNECT_TIMEOUT_MS || 60000),
  qrTimeoutMs: Number(process.env.WHATSAPP_QR_TIMEOUT_MS || 60000),
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
    'Access-Control-Allow-Headers': 'Content-Type',
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

  let customerPhone = '';

  try {
    const participant = msg.key?.participant || msg.participant || '';
    const phoneCandidates = uniqueValues([
      phoneCandidateFromJid(remoteJid),
      phoneCandidateFromJid(participant),
      msg.pushName,
    ]);
    customerPhone = phoneCandidates
      .map(cleanPhone)
      .find((candidate) => candidate.length >= 10 && candidate.length <= 13) || '';

    await session.sock?.sendPresenceUpdate?.('composing', remoteJid).catch(() => {});

    const result = await askHoralisAgent(session, {
      body,
      chatId: remoteJid,
      customerPhone,
      from: remoteJid,
      messageId,
      timestamp: Number(msg.messageTimestamp || 0),
      phoneCandidates,
    });

    const reply = String(result.reply || '').trim();
    if (!reply) return;

    await sleep(config.replyDelayMs);
    await session.sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });
    await sendPaymentQrImage(session, remoteJid, result, msg);
    await session.sock?.sendPresenceUpdate?.('paused', remoteJid).catch(() => {});
    console.log(`[${session.slug}:${customerPhone || remoteJid}] ${body} -> ${result.status || 'answered'} (${result.routed_by || 'unknown'})`);
  } catch (error) {
    console.error(`[${session.slug}:${customerPhone || remoteJid}] erro ao responder:`, error?.message || error);
    try {
      await session.sock?.sendMessage(remoteJid, {
        text: 'Tive uma instabilidade por aqui. Vou pedir para uma pessoa da equipe continuar seu atendimento.',
      }, { quoted: msg });
    } catch (replyError) {
      console.error('Nao consegui enviar mensagem de fallback:', replyError?.message || replyError);
    }
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

  console.log(`Restaurando ${slugs.length} sessao(oes) WhatsApp salva(s): ${slugs.join(', ')}`);
  for (const slug of slugs) startSession(slug, { restored: true });
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
    return json(res, 200, {
      ok: true,
      service: 'horalis-whatsapp-qr',
      driver: 'baileys',
      sessions: sessions.size,
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
