import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiPath = path.resolve(__dirname, '../api/v1/[...path].js');

const BRAZIL_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

function cleanPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeWhatsAppPhone(value) {
  let digits = cleanPhone(value);
  if (!digits) return '';

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits.startsWith('55') && (digits.length === 11 || digits.length === 12) && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (!digits.startsWith('55')) digits = `55${digits}`;

  if (!/^55\d{10,11}$/.test(digits)) return '';

  const national = digits.slice(2);
  const ddd = national.slice(0, 2);
  const subscriber = national.slice(2);

  if (!BRAZIL_DDDS.has(ddd)) return '';
  if (/^(\d)\1+$/.test(national) || /^(\d)\1+$/.test(subscriber)) return '';
  if (subscriber.length === 9 && subscriber[0] !== '9') return '';
  if (subscriber.length === 8 && !/^[2-9]/.test(subscriber)) return '';

  return digits;
}

function loadAgentRuntime() {
  let source = fs.readFileSync(apiPath, 'utf8');
  source = source.replace(/import[\s\S]*?from '\.\.\/_lib\/horalis\.js';\n/, '');
  source = source.replace(/^import[^\n]+;\n/gm, '');
  source = source.replace('export default async function handler', 'async function handler');
  source = source.replace('export async function handleWebRequest', 'async function handleWebRequest');
  source = source.replace(/export const (GET|POST|PUT|PATCH|DELETE|OPTIONS) = handleWebRequest;\n/g, '');

  const sandbox = {
    console,
    Intl,
    Date,
    Number,
    String,
    Array,
    Object,
    RegExp,
    Set,
    Promise,
    JSON,
    Math,
    URL,
    Response,
    Headers,
    Buffer,
    process: { env: {} },
    cleanPhone,
    normalizeWhatsAppPhone,
    isUuid: (value) => /^[0-9a-z-]{3,}$/i.test(String(value || '')),
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  vm.runInContext(`
    getAvailableSlotsForClinic = async function(_clinic, args) {
      if (args.date === '2099-01-09') {
        return {
          slots: [
            args.date + 'T12:30:00.000Z',
            args.date + 'T14:30:00.000Z',
          ],
          professional: null,
        };
      }

      const slotsByProfessional = {
        'pro-maria': [args.date + 'T17:00:00.000Z', args.date + 'T18:00:00.000Z'],
        'pro-joao': [args.date + 'T18:00:00.000Z', args.date + 'T19:00:00.000Z'],
        'pro-bia': [args.date + 'T16:00:00.000Z'],
      };
      const slots = args.professionalId
        ? (slotsByProfessional[args.professionalId] || [])
        : [args.date + 'T17:00:00.000Z', args.date + 'T18:00:00.000Z', args.date + 'T19:00:00.000Z'];
      const professionalNames = {
        'pro-maria': 'Maria',
        'pro-joao': 'Joao',
        'pro-bia': 'Bia',
      };
      return {
        slots,
        professional: args.professionalId ? { id: args.professionalId, nome: professionalNames[args.professionalId] || 'Profissional' } : null,
      };
    };

    createAppointmentFromPayload = async function(_clinic, payload, payment = {}) {
      return {
        id: 'appt-' + Math.random().toString(16).slice(2),
        ...payload,
        start_time: payload.start_time,
        end_time: payload.start_time,
        status: payload.status || 'confirmado',
        payment_status: payment.status || payload.payment_status || 'free',
      };
    };

    createMercadoPagoPayment = async function() {
      return {
        id: 'pay-test',
        status: 'pending',
        point_of_interaction: { transaction_data: { qr_code: 'pix-code' } },
      };
    };
  `, sandbox);

  return sandbox;
}

const services = [
  { id: 'svc-corte', nome_servico: 'Corte de cabelo', duracao_minutos: 30, preco: 50, active: true },
  { id: 'svc-barba', nome_servico: 'Barba', duracao_minutos: 20, preco: 35, active: true },
  { id: 'svc-corte-infantil', nome_servico: 'Corte infantil', duracao_minutos: 30, preco: 45, active: true },
  { id: 'svc-sobrancelha', nome_servico: 'Design de sobrancelha', duracao_minutos: 25, preco: 40, active: true },
];

const professionals = [
  { id: 'pro-maria', nome: 'Maria', cargo: 'Cabeleireira', servicos: ['svc-corte', 'svc-corte-infantil'], active: true },
  { id: 'pro-joao', nome: 'Joao', cargo: 'Barbeiro', servicos: ['svc-corte', 'svc-barba'], active: true },
  { id: 'pro-bia', nome: 'Bia', cargo: 'Designer', servicos: ['svc-sobrancelha'], active: true },
];

const clinic = {
  id: 'clinic-test',
  slug: 'salao-teste',
  nome_salao: 'Salao Teste',
  sinal_valor: 0,
  horario_trabalho_detalhado: {
    monday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '13:00', hasLunch: false },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00', hasLunch: false },
  },
};

const settings = {
  opening_message: 'Oi, tudo bem? Posso te ajudar a agendar. Qual servico voce gostaria de fazer?',
  handoff_message: 'Vou chamar uma pessoa da equipe para continuar seu atendimento.',
  fallback_message: 'Vou confirmar essa informacao com a equipe e ja retorno com seguranca.',
};

function appendHistory(history, message, result) {
  history.push({ role: 'user', content: message });
  history.push({
    role: 'assistant',
    content: result.reply,
    status: result.status || '',
    routed_by: result.routed_by || '',
    field: result.field || '',
    plan: result.plan || null,
    actions: Array.isArray(result.actions) ? result.actions : [],
    slots: Array.isArray(result.slots) ? result.slots : [],
    appointment: result.appointment || null,
    payment: result.payment || null,
  });
}

async function runScenario(runtime, scenario) {
  const history = Array.isArray(scenario.initialHistory)
    ? scenario.initialHistory.map((entry) => ({ ...entry }))
    : [];
  const scenarioClinic = scenario.clinic
    ? { ...clinic, ...scenario.clinic }
    : clinic;
  const outputs = [];
  const errors = [];

  for (const message of scenario.messages) {
    const result = await runtime.tryHybridAgentResponse({
      message,
      history,
      clinic: scenarioClinic,
      services,
      professionals,
      settings,
    });

    if (!result) {
      outputs.push({ status: 'openai_required', field: '', reply: 'returned null and would call OpenAI' });
      continue;
    }
    outputs.push(result);
    if (result.routed_by === 'hybrid') appendHistory(history, message, result);
  }

  const summary = outputs.map((item, index) => ({
    turn: index,
    status: item.status,
    field: item.field,
    reply: String(item.reply || '').slice(0, 140),
  }));

  for (const check of scenario.checks || []) {
    const output = outputs[check.turn];
    if (!output) {
      errors.push(`turn ${check.turn} missing`);
      continue;
    }
    if (output.routed_by !== 'hybrid') errors.push(`turn ${check.turn} would use OpenAI`);
    if (check.status && output.status !== check.status) errors.push(`turn ${check.turn} status ${output.status}, expected ${check.status}`);
    if (check.field && output.field !== check.field) errors.push(`turn ${check.turn} field ${output.field}, expected ${check.field}`);
    if (check.contains && !String(output.reply || '').toLowerCase().includes(check.contains.toLowerCase())) {
      errors.push(`turn ${check.turn} reply did not contain "${check.contains}"`);
    }
    if (check.professionalId && output.plan?.professional_id !== check.professionalId) {
      errors.push(`turn ${check.turn} professional ${output.plan?.professional_id}, expected ${check.professionalId}`);
    }
    if (check.serviceId && output.plan?.service_id !== check.serviceId) {
      errors.push(`turn ${check.turn} service ${output.plan?.service_id}, expected ${check.serviceId}`);
    }
    if (check.customerPhone && output.plan?.customer_phone !== check.customerPhone) {
      errors.push(`turn ${check.turn} customer phone ${output.plan?.customer_phone}, expected ${check.customerPhone}`);
    }
    if (check.anyStatus && !check.anyStatus.includes(output.status)) {
      errors.push(`turn ${check.turn} status ${output.status}, expected one of ${check.anyStatus.join(', ')}`);
    }
    if (check.paymentStatus && output.payment?.status !== check.paymentStatus) {
      errors.push(`turn ${check.turn} payment status ${output.payment?.status}, expected ${check.paymentStatus}`);
    }
  }

  return {
    outputs,
    errors,
    summary,
    checked: scenario.checks?.length || 0,
  };
}

const scenarios = [
  {
    name: 'fluxo completo com qualquer profissional',
    messages: ['oi', 'corte de cabelo', 'qualquer um', 'amanha a tarde', 'primeira opcao', 'Ana Lima', '11987654321', 'sim'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, field: 'professional_id' },
      { turn: 2, field: 'date' },
      { turn: 3, status: 'slots_found', field: 'start_time' },
      { turn: 7, status: 'booking_created' },
    ],
  },
  {
    name: 'cliente reconhecido pelo whatsapp pula nome e telefone',
    initialHistory: [{
      role: 'assistant',
      content: 'Cliente reconhecido: Ana Lima.',
      plan: {
        action: 'answer',
        customer_name: 'Ana Lima',
        customer_phone: '5511987654321',
        customer_email: 'ana@teste.com',
        confidence: 1,
      },
    }],
    messages: ['oi', 'barba', 'sexta tarde', 'primeira', 'sim'],
    checks: [
      { turn: 0, field: 'service_id', contains: 'Ana' },
      { turn: 2, status: 'slots_found' },
      { turn: 3, field: 'confirm_booking', customerPhone: '5511987654321' },
      { turn: 4, status: 'booking_created' },
    ],
  },
  {
    name: 'cliente comecou pela disponibilidade',
    messages: ['tem vaga amanha?', '2', '15h', 'Carlos Souza', '11988887777', 'pode confirmar'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, status: 'slots_found', field: 'start_time', professionalId: 'pro-joao' },
      { turn: 5, status: 'booking_created' },
    ],
  },
  {
    name: 'apelido de servico e profissional na mesma frase',
    messages: ['queria fazer a barbinha com joao sexta as 15h', '15h', 'me chama de Bia', '21999998888', 'sim'],
    checks: [
      { turn: 0, field: 'customer_name', professionalId: 'pro-joao' },
      { turn: 2, field: 'customer_phone' },
      { turn: 4, status: 'booking_created' },
    ],
  },
  {
    name: 'off topic volta para agendamento',
    messages: ['meu cabelo ta um caos kkk', 'corte', '1', 'maria', 'dia 20 as 15h'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, field: 'professional_id', serviceId: 'svc-corte' },
      { turn: 4, field: 'customer_name', professionalId: 'pro-maria' },
    ],
  },
  {
    name: 'pergunta horario de funcionamento e volta ao servico',
    messages: ['voces abrem sabado?', 'design de sobrancelha', 'amanha cedo'],
    checks: [
      { turn: 0, field: 'service_id', contains: 'horario de funcionamento' },
      { turn: 1, status: 'slots_found', field: 'start_time', professionalId: 'pro-bia' },
      { turn: 2, status: 'slots_found', field: 'date', professionalId: 'pro-bia' },
    ],
  },
  {
    name: 'preco antes de agendar',
    messages: ['quanto fica a barba?', 'sexta de tarde', '15h', 'Rafa Lima', '11911112222', 'fechado'],
    checks: [
      { turn: 0, status: 'answered', contains: 'R$' },
      { turn: 1, status: 'slots_found', professionalId: 'pro-joao' },
      { turn: 5, status: 'booking_created' },
    ],
  },
  {
    name: 'cliente rejeita horarios e agente pergunta novo periodo',
    messages: ['quero corte de cabelo', 'qualquer profissional', 'amanha a tarde', 'nao gostei desses horarios'],
    checks: [
      { turn: 3, field: 'date', contains: 'outro dia' },
    ],
  },
  {
    name: 'handoff humano',
    messages: ['quero falar com uma pessoa'],
    checks: [
      { turn: 0, status: 'handoff' },
    ],
  },
  {
    name: 'servico por apelido curto',
    messages: ['faz sobrancelhas?', 'amanha', 'primeira opcao', 'Julia', '11922223333', 'sim'],
    checks: [
      { turn: 0, field: 'date', serviceId: 'svc-sobrancelha' },
      { turn: 1, status: 'slots_found', professionalId: 'pro-bia' },
      { turn: 5, status: 'booking_created' },
    ],
  },
  {
    name: 'cliente manda data e horario antes do servico',
    messages: ['sexta as 15 tem algo?', 'barba', '15h', 'Marcos', '11933334444', 'isso mesmo'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, field: 'customer_name', serviceId: 'svc-barba', professionalId: 'pro-joao' },
      { turn: 5, status: 'booking_created' },
    ],
  },
  {
    name: 'cliente escolhe qualquer profissional por numero',
    messages: ['quero corte de cabelo', '3', 'amanha a tarde'],
    checks: [
      { turn: 0, field: 'professional_id' },
      { turn: 1, field: 'date' },
      { turn: 2, status: 'slots_found' },
    ],
  },
  {
    name: 'cliente escolhe profissional pelo nome direto',
    messages: ['corte de cabelo com maria amanha as 15', '15h', 'Paula Mendes', '11944445555', 'confirmado'],
    checks: [
      { turn: 0, field: 'customer_name', professionalId: 'pro-maria' },
      { turn: 4, status: 'booking_created' },
    ],
  },
  {
    name: 'cliente pergunta lista de servicos',
    messages: ['quais servicos voces fazem?', 'barbinha', 'sexta tarde'],
    checks: [
      { turn: 0, field: 'service_id', contains: 'servicos disponiveis' },
      { turn: 1, field: 'date', serviceId: 'svc-barba' },
      { turn: 2, status: 'slots_found', professionalId: 'pro-joao' },
    ],
  },
  {
    name: 'cliente manda so periodo depois do servico',
    messages: ['barba', 'amanha depois do almoco'],
    checks: [
      { turn: 0, field: 'date', serviceId: 'svc-barba' },
      { turn: 1, status: 'slots_found', field: 'start_time' },
    ],
  },
  {
    name: 'cliente agradece no meio e bot mantem disponibilidade',
    messages: ['quero barba', 'valeu', 'sexta a tarde'],
    checks: [
      { turn: 0, field: 'date' },
      { turn: 1, status: 'answered' },
      { turn: 2, status: 'slots_found' },
    ],
  },
  {
    name: 'cliente fala numero depois de lista de servicos',
    messages: ['quero agendar', '4', 'amanha'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, field: 'date', serviceId: 'svc-sobrancelha' },
      { turn: 2, status: 'slots_found', professionalId: 'pro-bia' },
    ],
  },
  {
    name: 'cliente sem acento e com typo leve',
    messages: ['quero fazer sombrancelha amanha'],
    checks: [
      { turn: 0, anyStatus: ['needs_info', 'slots_found'] },
    ],
  },
  {
    name: 'cliente pergunta domingo e escolhe servico',
    messages: ['funciona domingo?', 'corte infantil'],
    checks: [
      { turn: 0, field: 'service_id', contains: 'domingo' },
      { turn: 1, anyStatus: ['needs_info', 'slots_found'], serviceId: 'svc-corte-infantil' },
    ],
  },
  {
    name: 'cliente pede encaixe hoje',
    messages: ['tem encaixe hoje pra barba?', 'joao'],
    checks: [
      { turn: 0, status: 'slots_found', serviceId: 'svc-barba' },
      { turn: 1, status: 'slots_found', professionalId: 'pro-joao' },
    ],
  },
  {
    name: 'cliente manda telefone junto com nome',
    messages: ['corte de cabelo', 'qualquer', 'sexta tarde', 'primeira', 'Meu nome e Leo 11955556666', 'sim'],
    checks: [
      { turn: 5, status: 'booking_created' },
    ],
  },
  {
    name: 'cliente fala endereco fora do escopo',
    messages: ['qual o endereco dai?', 'barba'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, field: 'date', serviceId: 'svc-barba' },
    ],
  },
  {
    name: 'cliente escolhe outro horario depois da confirmacao',
    messages: ['barba sexta tarde', '15h', 'Neto Silva', '11966667777', 'nao, outro horario'],
    checks: [
      { turn: 4, field: 'start_time' },
    ],
  },
  {
    name: 'cliente confirma com beleza',
    messages: ['barba sexta tarde', '15h', 'Neto Silva', '11966667777', 'beleza'],
    checks: [
      { turn: 4, status: 'booking_created' },
    ],
  },
  {
    name: 'cliente manda saudacao longa',
    messages: ['boa tarde tudo bem?', 'queria ver horario pra corte infantil'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, anyStatus: ['needs_info', 'slots_found'], serviceId: 'svc-corte-infantil' },
    ],
  },
  {
    name: 'cliente pergunta valor generico',
    messages: ['quanto custa?', 'barba'],
    checks: [
      { turn: 0, field: 'price_service_id' },
      { turn: 1, status: 'answered', contains: 'R$' },
    ],
  },
  {
    name: 'cliente fala quero fazer sem servico',
    messages: ['quero fazer um negocio ai', 'sobrancelha'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, field: 'date', serviceId: 'svc-sobrancelha' },
    ],
  },
  {
    name: 'cliente pede primeiro disponivel',
    messages: ['quero corte de cabelo', 'primeiro disponivel', 'amanha'],
    checks: [
      { turn: 1, field: 'date' },
      { turn: 2, status: 'slots_found' },
    ],
  },
  {
    name: 'cliente escolhe slot por horario escrito',
    messages: ['barba sexta tarde', '15 horas', 'Diego Alves', '11977778888', 'ta certo'],
    checks: [
      { turn: 1, field: 'customer_name' },
      { turn: 4, status: 'booking_created' },
    ],
  },
  {
    name: 'cliente escolhe horario fora das opcoes',
    messages: ['barba sexta tarde', '18 horas'],
    checks: [
      { turn: 0, status: 'slots_found', field: 'start_time' },
      { turn: 1, field: 'start_time', contains: 'nao encontrei' },
    ],
  },
  {
    name: 'onda2 mensagem truncada quero cortar',
    messages: ['cortar cabelo amanha', 'qualquer', 'primeira', 'Luan', '11910101010', 'sim'],
    checks: [
      { turn: 0, field: 'professional_id', serviceId: 'svc-corte' },
      { turn: 5, status: 'booking_created' },
    ],
  },
  {
    name: 'onda2 pergunta tem horario hoje de tarde',
    messages: ['tem horario hoje de tarde?', 'corte infantil', 'maria'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, anyStatus: ['slots_found', 'needs_info'], serviceId: 'svc-corte-infantil' },
      { turn: 2, anyStatus: ['slots_found', 'needs_info'], professionalId: 'pro-maria' },
    ],
  },
  {
    name: 'onda2 cliente so fala profissional primeiro',
    messages: ['quero com a Bia', 'sobrancelha', 'amanha'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, field: 'date', serviceId: 'svc-sobrancelha' },
      { turn: 2, status: 'slots_found', professionalId: 'pro-bia' },
    ],
  },
  {
    name: 'onda2 cliente fala fazer a mao fora catalogo',
    messages: ['queria fazer a mao amanha'],
    checks: [
      { turn: 0, field: 'service_id' },
    ],
  },
  {
    name: 'onda2 cliente pergunta se precisa pagar sinal',
    messages: ['precisa pagar sinal?', 'barba sexta'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, status: 'slots_found', serviceId: 'svc-barba' },
    ],
  },
  {
    name: 'onda3 com sinal gera pix e nao confirma antes de pagar',
    clinic: { sinal_valor: 25 },
    messages: ['barba sexta tarde', 'primeira', 'Ana Lima', '11987654321', 'ana@teste.com', 'sim'],
    checks: [
      { turn: 5, status: 'payment_created', paymentStatus: 'pending', contains: 'Pix copia e cola' },
    ],
  },
  {
    name: 'onda2 cliente troca servico antes de escolher horario',
    messages: ['corte de cabelo amanha', 'na verdade barba', 'primeira', 'Andre', '11920202020', 'sim'],
    checks: [
      { turn: 0, anyStatus: ['needs_info', 'slots_found'], serviceId: 'svc-corte' },
      { turn: 1, anyStatus: ['needs_info', 'slots_found'], serviceId: 'svc-barba' },
      { turn: 5, status: 'booking_created' },
    ],
  },
  {
    name: 'onda2 cliente escolhe segunda opcao profissional',
    messages: ['quero corte de cabelo', 'segunda opcao', 'sexta tarde'],
    checks: [
      { turn: 1, field: 'date', professionalId: 'pro-joao' },
      { turn: 2, status: 'slots_found', professionalId: 'pro-joao' },
    ],
  },
  {
    name: 'onda2 cliente escolhe opcao qualquer por numero quatro inexistente',
    messages: ['corte de cabelo', '4'],
    checks: [
      { turn: 1, field: 'professional_id' },
    ],
  },
  {
    name: 'onda2 cliente usa audio transcrito confuso',
    messages: ['oi eu queria ver se tem como marcar uma coisa no cabelo tipo aparar sabe', 'qualquer um', 'sexta de tarde'],
    checks: [
      { turn: 0, field: 'professional_id', serviceId: 'svc-corte' },
      { turn: 2, status: 'slots_found' },
    ],
  },
  {
    name: 'onda2 cliente pergunta valor e ja data',
    messages: ['quanto fica barba amanha?', 'joao'],
    checks: [
      { turn: 0, status: 'answered', contains: 'R$' },
      { turn: 1, status: 'slots_found', professionalId: 'pro-joao' },
    ],
  },
  {
    name: 'onda2 cliente diz depois das 16',
    messages: ['barba sexta depois das 16', '16h', 'Rui', '11930303030', 'sim'],
    checks: [
      { turn: 0, field: 'customer_name' },
      { turn: 4, status: 'booking_created' },
    ],
  },
  {
    name: 'onda2 cliente responde ok em vez de nome',
    messages: ['barba sexta tarde', 'primeira', 'ok'],
    checks: [
      { turn: 1, field: 'customer_name' },
      { turn: 2, field: 'customer_name' },
    ],
  },
  {
    name: 'onda2 cliente manda nome curto',
    messages: ['barba sexta tarde', 'primeira', 'Li', '11940404040', 'confirmar'],
    checks: [
      { turn: 2, field: 'customer_phone' },
      { turn: 4, status: 'booking_created' },
    ],
  },
  {
    name: 'onda2 cliente manda telefone com simbolos',
    messages: ['barba sexta tarde', 'primeira', 'Lucas Moura', '(11) 94040-4040', 'sim'],
    checks: [
      { turn: 4, status: 'booking_created', customerPhone: '5511940404040' },
    ],
  },
  {
    name: 'onda2 telefone com codigo do pais ja normalizado',
    messages: ['barba sexta tarde', 'primeira', 'Carla Dias', '+55 (21) 98765-4321'],
    checks: [
      { turn: 3, field: 'confirm_booking', customerPhone: '5521987654321' },
    ],
  },
  {
    name: 'onda2 telefone invalido pede novamente',
    messages: ['barba sexta tarde', 'primeira', 'Renata Lima', '12345', '11960606060'],
    checks: [
      { turn: 3, field: 'customer_phone' },
      { turn: 4, field: 'confirm_booking', customerPhone: '5511960606060' },
    ],
  },
  {
    name: 'onda2 telefone sem ddd orienta exemplo',
    messages: ['barba sexta tarde', 'primeira', 'Renata Lima', '988776655', '11960606060'],
    checks: [
      { turn: 3, field: 'customer_phone', contains: 'DDD' },
      { turn: 4, field: 'confirm_booking', customerPhone: '5511960606060' },
    ],
  },
  {
    name: 'onda2 cliente pergunta disponibilidade sem acento',
    messages: ['disponibilidade pra sabado corte?', 'corte de cabelo'],
    checks: [
      { turn: 0, anyStatus: ['needs_info', 'slots_found'] },
      { turn: 1, anyStatus: ['needs_info', 'slots_found'], serviceId: 'svc-corte' },
    ],
  },
  {
    name: 'onda2 cliente quer cancelar',
    messages: ['quero cancelar meu horario'],
    checks: [
      { turn: 0, anyStatus: ['handoff', 'needs_info'] },
    ],
  },
  {
    name: 'onda2 cliente quer remarcar',
    messages: ['preciso remarcar'],
    checks: [
      { turn: 0, anyStatus: ['handoff', 'needs_info'] },
    ],
  },
  {
    name: 'onda2 cliente manda emoji textual',
    messages: ['oiii :) queria uma barbinha', 'sexta'],
    checks: [
      { turn: 0, field: 'date', serviceId: 'svc-barba' },
      { turn: 1, status: 'slots_found' },
    ],
  },
  {
    name: 'onda2 cliente pede horario mais cedo',
    messages: ['barba sexta tarde', 'mais cedo'],
    checks: [
      { turn: 1, field: 'customer_name' },
    ],
  },
  {
    name: 'onda2 cliente pergunta formas de pagamento',
    messages: ['aceita pix?', 'corte de cabelo'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, field: 'professional_id', serviceId: 'svc-corte' },
    ],
  },
  {
    name: 'onda2 cliente manda tudo junto nome telefone',
    messages: ['quero barba sexta 15h sou Pedro 11950505050', 'sim'],
    checks: [
      { turn: 0, anyStatus: ['needs_confirmation', 'slots_found'], serviceId: 'svc-barba', customerPhone: '5511950505050' },
      { turn: 1, anyStatus: ['booking_created', 'needs_confirmation'] },
    ],
  },
  {
    name: 'onda2 cliente fala corte para crianca',
    messages: ['tem corte pra crianca amanha?', 'maria'],
    checks: [
      { turn: 0, anyStatus: ['needs_info', 'slots_found'], serviceId: 'svc-corte-infantil' },
      { turn: 1, anyStatus: ['slots_found', 'needs_info'], professionalId: 'pro-maria' },
    ],
  },
  {
    name: 'onda2 cliente responde tanto faz ao profissional',
    messages: ['corte de cabelo', 'tanto faz', 'amanha'],
    checks: [
      { turn: 1, field: 'date' },
      { turn: 2, status: 'slots_found' },
    ],
  },
  {
    name: 'onda2 cliente pede tabela',
    messages: ['me manda a tabela', 'corte infantil'],
    checks: [
      { turn: 0, field: 'price_service_id' },
      { turn: 1, status: 'answered', contains: 'R$' },
    ],
  },
  {
    name: 'onda2 cliente xinga cabelo e escolhe depois',
    messages: ['ta horrivel aqui kkkk preciso resolver', 'barba nao, corte', 'qualquer', 'sexta tarde'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, anyStatus: ['needs_info', 'slots_found'], serviceId: 'svc-corte' },
      { turn: 3, status: 'slots_found' },
    ],
  },
  {
    name: 'onda3 cliente pede link de agendamento',
    messages: ['me manda o link de agendamento'],
    checks: [
      { turn: 0, status: 'answered', contains: 'https://horalis.app/agendar/salao-teste' },
    ],
  },
  {
    name: 'onda3 horario 9 horas nao vira nona opcao',
    initialHistory: [{
      role: 'assistant',
      content: 'Encontrei estes horarios para corte de cabelo: 09:00, 10:00, 11:00, 12:00, 12:30, 13:00, 13:15, 13:20, 13:30.',
      status: 'slots_found',
      field: 'start_time',
      slots: [
        '2099-01-02T12:00:00.000Z',
        '2099-01-02T13:00:00.000Z',
        '2099-01-02T14:00:00.000Z',
        '2099-01-02T15:00:00.000Z',
        '2099-01-02T15:30:00.000Z',
        '2099-01-02T16:00:00.000Z',
        '2099-01-02T16:15:00.000Z',
        '2099-01-02T16:20:00.000Z',
        '2099-01-02T16:30:00.000Z',
      ],
      plan: {
        action: 'list_slots',
        service_id: 'svc-corte',
        professional_preference: 'any',
        date: '2099-01-02',
        field: 'start_time',
      },
    }],
    messages: ['9 horas'],
    checks: [
      { turn: 0, field: 'customer_name', contains: '09:00' },
    ],
  },
  {
    name: 'onda3 saudacao depois de agendamento nao reconfirma',
    initialHistory: [
      {
        role: 'assistant',
        content: 'Vou confirmar: Barba em sexta 15:00 para Ana Lima. Posso confirmar?',
        status: 'needs_confirmation',
        field: 'confirm_booking',
        plan: {
          action: 'confirm_booking',
          service_id: 'svc-barba',
          professional_id: 'pro-joao',
          date: '2099-01-02',
          start_time: '2099-01-02T18:00:00.000Z',
          customer_name: 'Ana Lima',
          customer_phone: '5511987654321',
          field: 'confirm_booking',
        },
      },
      { role: 'user', content: 'sim' },
      {
        role: 'assistant',
        content: 'Prontinho, Ana. Seu horario ficou confirmado para 02/01, 15:00.',
        status: 'booking_created',
        plan: {
          action: 'create_booking',
          service_id: 'svc-barba',
          professional_id: 'pro-joao',
          date: '2099-01-02',
          start_time: '2099-01-02T18:00:00.000Z',
          customer_name: 'Ana Lima',
          customer_phone: '5511987654321',
        },
        appointment: {
          id: 'appt-confirmed',
          serviceName: 'Barba',
          professionalName: 'Joao',
          startTime: '2099-01-02T18:00:00.000Z',
          status: 'confirmado',
        },
      },
    ],
    messages: ['oi'],
    checks: [
      { turn: 0, status: 'answered', contains: 'ja esta confirmado' },
    ],
  },
];

const runtime = loadAgentRuntime();
let checkedTurns = 0;
let failedTurns = 0;
let failedScenarios = 0;

for (const scenario of scenarios) {
  const result = await runScenario(runtime, scenario);
  checkedTurns += result.checked;
  failedTurns += result.errors.length;
  if (!result.errors.length) {
    console.log(`PASS ${scenario.name}`);
  } else {
    failedScenarios += 1;
    console.error(`FAIL ${scenario.name}:`);
    for (const error of result.errors) console.error(`  - ${error}`);
    console.error(JSON.stringify(result.summary, null, 2));
  }
}

try {
  checkedTurns += 1;
  const floating = runtime.parseRequiredDate('2099-01-02T09:00:00', 'data invalida').toISOString();
  const parts = runtime.slotTimeParts(floating);
  if (parts.hour === 9 && parts.minute === 0) {
    console.log('PASS horario flutuante 09:00 preserva fuso de Sao Paulo');
  } else {
    failedTurns += 1;
    failedScenarios += 1;
    console.error(`FAIL horario flutuante 09:00 preserva fuso de Sao Paulo: ${parts.hour}:${parts.minute}`);
  }
} catch (error) {
  failedTurns += 1;
  failedScenarios += 1;
  console.error(`FAIL horario flutuante 09:00 preserva fuso de Sao Paulo: ${error.message}`);
}

try {
  checkedTurns += 1;
  const result = await runtime.executeAgentPlan({
    action: 'create_booking',
    service_id: 'svc-corte',
    date: '2099-01-09',
    start_time: '2099-01-09T14:30:00.000Z',
    customer_name: 'Ana Lima',
    customer_phone: '5511987654321',
  }, {
    clinic,
    services,
    professionals,
    settings,
    message: 'pode agendar as 09:30',
  });
  const parts = runtime.slotTimeParts(result.appointment?.startTime || result.appointment?.start_time);
  if (result.status === 'booking_created' && parts.hour === 9 && parts.minute === 30) {
    console.log('PASS horario explicito 09:30 vence ISO deslocado da IA');
  } else {
    failedTurns += 1;
    failedScenarios += 1;
    console.error(`FAIL horario explicito 09:30 vence ISO deslocado da IA: status=${result.status} horario=${parts.hour}:${parts.minute}`);
  }
} catch (error) {
  failedTurns += 1;
  failedScenarios += 1;
  console.error(`FAIL horario explicito 09:30 vence ISO deslocado da IA: ${error.message}`);
}

try {
  checkedTurns += 1;
  const lidPhone = runtime.firstNormalizedPayloadPhone({
    external_id: '123312906739842@lid',
    from: '123312906739842@lid',
    metadata: {
      whatsapp_chat_id: '123312906739842@lid',
      whatsapp_from: '123312906739842@lid',
    },
  });
  const realPhone = runtime.firstNormalizedPayloadPhone({
    from: '5511987654321@s.whatsapp.net',
  });
  if (!lidPhone && realPhone === '5511987654321') {
    console.log('PASS whatsapp lid nao vira telefone e numero real continua valido');
  } else {
    failedTurns += 1;
    failedScenarios += 1;
    console.error(`FAIL whatsapp lid nao vira telefone: lid=${lidPhone || '(vazio)'} real=${realPhone || '(vazio)'}`);
  }
} catch (error) {
  failedTurns += 1;
  failedScenarios += 1;
  console.error(`FAIL whatsapp lid nao vira telefone: ${error.message}`);
}

const passedTurns = checkedTurns - failedTurns;
const passRate = checkedTurns ? passedTurns / checkedTurns : 0;
const threshold = 0.7;

console.log(`\nLocal agent checked turns: ${passedTurns}/${checkedTurns} (${(passRate * 100).toFixed(1)}%)`);
console.log(`Failed scenarios: ${failedScenarios}/${scenarios.length}`);

if (passRate < threshold) {
  process.exitCode = 1;
} else {
  console.log(`Threshold met: ${(threshold * 100).toFixed(0)}% local accuracy without OpenAI.`);
}
