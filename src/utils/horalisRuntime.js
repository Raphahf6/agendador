export const DEFAULT_PRIMARY_COLOR = '#0E7490';

const DEFAULT_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?q=80&w=2000&auto=format&fit=crop',
    alt: 'Ambiente do estabelecimento',
  },
];

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function cleanDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function firstArray(...values) {
  return values.find(Array.isArray) || [];
}

export function getErrorMessage(error, fallback = 'Nao foi possivel concluir a operacao agora.') {
  const detail = error?.response?.data?.detail
    || error?.response?.data?.message
    || error?.response?.data?.error_description
    || error?.response?.data?.error;

  if (detail) return String(detail);
  if (error?.response?.status === 404) return 'Recurso nao encontrado. Aguarde a publicacao da ultima versao e tente novamente.';
  if (error?.response?.status === 405) return 'Metodo nao permitido para esta rota. A API pode estar em uma versao antiga.';
  if (error?.response?.status === 504) return 'A API ficou indisponivel por instantes. Tente novamente em alguns segundos.';
  if (error?.message === 'Network Error' || error?.message === 'Failed to fetch') return 'Sem conexao com a API no momento.';
  if (error?.message) return String(error.message);
  return fallback;
}

export function normalizePhoto(photo, index = 0) {
  if (typeof photo === 'string') return photo.trim() ? { url: photo.trim(), alt: `Foto ${index + 1}` } : null;
  const source = asObject(photo);
  const url = String(source.url || source.src || source.publicUrl || '').trim();
  if (!url) return null;
  return {
    ...source,
    url,
    alt: source.alt || source.name || `Foto ${index + 1}`,
  };
}

export function normalizePhotos(value, fallback = []) {
  const photos = asArray(value).map(normalizePhoto).filter(Boolean);
  return photos.length ? photos : fallback;
}

export function normalizeAmenities(value) {
  if (Array.isArray(value)) {
    return value.reduce((acc, key) => {
      if (key) acc[key] = true;
      return acc;
    }, {});
  }
  return asObject(value);
}

export function normalizeService(service, index = 0) {
  const source = asObject(service);
  const name = String(source.nome_servico || source.nome || source.name || 'Servico').trim();
  const duration = Number(source.duracao_minutos ?? source.duration_minutes ?? source.duration ?? 30);
  const price = Number(source.preco ?? source.price ?? source.valor ?? 0);

  return {
    ...source,
    id: source.id || source.service_id || `service-${index}`,
    nome_servico: name || 'Servico',
    descricao: source.descricao || source.description || '',
    duracao_minutos: Number.isFinite(duration) && duration > 0 ? duration : 30,
    preco: Number.isFinite(price) ? price : 0,
    active: source.active !== false && source.ativo !== false,
  };
}

export function normalizeProfessional(professional, index = 0) {
  const source = asObject(professional);
  const services = Array.isArray(source.servicos)
    ? source.servicos
    : Array.isArray(source.services)
      ? source.services
      : [];

  return {
    ...source,
    id: source.id || source.professional_id || `professional-${index}`,
    nome: source.nome || source.name || 'Profissional',
    cargo: source.cargo || source.role || 'Profissional',
    foto_url: source.foto_url || source.photo_url || source.avatar_url || '',
    descricao: source.descricao || source.description || '',
    servicos: services,
    active: source.active !== false && source.ativo !== false,
  };
}

export function unwrapApiPayload(payload) {
  if (Array.isArray(payload)) return { servicos: payload };
  if (!payload || typeof payload !== 'object') return null;

  const data = payload.data;
  const shouldUnwrapData = data
    && typeof data === 'object'
    && !Array.isArray(data)
    && !payload.servicos
    && !payload.services
    && !payload.profissionais
    && !payload.professionals;

  return shouldUnwrapData ? data : payload;
}

export function normalizePublicClinicPayload(payload, fallbackSlug = '') {
  const source = unwrapApiPayload(payload);
  if (!source) return null;

  const nested = asObject(source.data);
  const services = firstArray(source.servicos, source.services, nested.servicos, nested.services)
    .map(normalizeService)
    .filter((service) => service.active !== false);

  const professionals = firstArray(source.profissionais, source.professionals, nested.profissionais, nested.professionals)
    .map(normalizeProfessional)
    .filter((professional) => professional.active !== false);

  return {
    ...source,
    id: source.id || source.slug || fallbackSlug,
    salao_id: source.salao_id || source.slug || fallbackSlug,
    slug: source.slug || source.salao_id || fallbackSlug,
    nome_salao: source.nome_salao || source.nome || source.name || 'Horalis',
    cor_primaria: source.cor_primaria || source.primary_color || DEFAULT_PRIMARY_COLOR,
    cor_secundaria: source.cor_secundaria || source.secondary_color || '#FFFFFF',
    telefone: source.telefone || source.whatsapp || '',
    endereco_completo: source.endereco_completo || source.address || '',
    horario_trabalho_detalhado: asObject(source.horario_trabalho_detalhado || source.schedule),
    comodidades: normalizeAmenities(source.comodidades || source.amenities),
    redes_sociais: asObject(source.redes_sociais || source.socials),
    fotos_carousel: normalizePhotos(source.fotos_carousel || source.photos || source.images, []),
    servicos: services,
    profissionais: professionals,
    sinal_valor: Number(source.sinal_valor || 0),
  };
}

export function defaultHeroPhotos(photos) {
  return normalizePhotos(photos, DEFAULT_PHOTOS);
}
