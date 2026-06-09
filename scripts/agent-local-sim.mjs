import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiPath = path.resolve(__dirname, '../api/v1/[...path].js');

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
    cleanPhone: (value) => String(value || '').replace(/\D/g, ''),
    isUuid: (value) => /^[0-9a-z-]{3,}$/i.test(String(value || '')),
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  vm.runInContext(`
    getAvailableSlotsForClinic = async function(_clinic, args) {
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
  const history = [];
  const outputs = [];
  const errors = [];

  for (const message of scenario.messages) {
    const result = await runtime.tryHybridAgentResponse({
      message,
      history,
      clinic,
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
    if (check.anyStatus && !check.anyStatus.includes(output.status)) {
      errors.push(`turn ${check.turn} status ${output.status}, expected one of ${check.anyStatus.join(', ')}`);
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
    messages: ['oi', 'corte de cabelo', 'qualquer um', 'amanha a tarde', 'primeira opcao', 'Ana Lima', '11999999999', 'sim'],
    checks: [
      { turn: 0, field: 'service_id' },
      { turn: 1, field: 'professional_id' },
      { turn: 2, field: 'date' },
      { turn: 3, status: 'slots_found', field: 'start_time' },
      { turn: 7, status: 'booking_created' },
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
      { turn: 4, status: 'booking_created' },
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
      { turn: 0, anyStatus: ['needs_confirmation', 'slots_found'], serviceId: 'svc-barba' },
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
