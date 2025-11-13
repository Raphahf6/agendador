import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Clock, MapPin, Wifi, Car, Coffee, Users, Info,
  Phone, Instagram, Facebook, ArrowRight, CalendarCheck, MessageCircle
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

// Importações do Swiper (Para o Hero)
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// Mapeamento de comodidades (Mesmo do Microsite)
const amenitiesMap = {
  wifi: { icon: Wifi, label: 'Wi-Fi' },
  estacionamento: { icon: Car, label: 'Estacionamento' },
  cafe: { icon: Coffee, label: 'Café' },
};

// --- COMPONENTE PRINCIPAL DO PREVIEW ---
function BookingPagePreview({
  salaoId, nomeSalao, tagline, logoUrl, primaryColor,
  telefone, endereco, fotos, redesSociais, formasPagamento, comodidades
}) {

  const primary = primaryColor || '#0E7490';
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca serviços (apenas para popular a lista)
  useEffect(() => {
    let isMounted = true;
    const fetchServices = async () => {
      if (!salaoId) { if (isMounted) setLoading(false); return; }
      try {
        const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`);
        if (isMounted && response.data?.servicos) {
          setServices(response.data.servicos.slice(0, 3)); // Pega 3 para preview
        }
      } catch (err) { console.error(err); }
      finally { if (isMounted) setLoading(false); }
    };
    fetchServices();
    return () => { isMounted = false; };
  }, [salaoId]);

  // Fotos do Hero (Usa as do form ou placeholder)
  const photosToDisplay = fotos && fotos.length > 0 ? fotos : [
    { url: "https://images.unsplash.com/photo-1521528628468-f95155f9f688?q=80&w=1470&auto=format&fit=crop", alt: "Fachada" }
  ];

  return (
    // Container Base (Fundo Cinza Claro igual ao Microsite)
    <div className="w-full h-full bg-[#FAFAFA] font-sans overflow-y-auto custom-scrollbar relative">

      {/* 1. HERO SECTION (IMERSIVA) */}
      <div className="relative h-64 sm:h-80 w-full rounded-b-[2rem] shadow-lg overflow-hidden z-10">
        <Swiper
          modules={[Pagination, Autoplay, EffectFade]}
          slidesPerView={1}
          pagination={{ clickable: true, dynamicBullets: true }}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          effect="fade"
          loop={true}
          className="w-full h-full"
        >
          {photosToDisplay.map((p, i) => (
            <SwiperSlide key={i}>
              <div className="w-full h-full relative">
                <img src={p.url} alt="Capa" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Conteúdo do Hero */}
        <div className="absolute bottom-0 left-0 w-full p-6 text-white z-20">
          <div className="flex items-end justify-between">
            <div>
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl mb-3 border-2 border-white/20 shadow-lg object-cover" />
              )}
              <h1 className="text-2xl font-extrabold mb-1 leading-tight">
                {nomeSalao || "Seu Salão"}
              </h1>
              <p className="text-white/80 text-sm font-light line-clamp-2">
                {tagline || "Sua tagline aparecerá aqui."}
              </p>
            </div>
            {/* Status Badge Simulado */}
            <div className="hidden sm:flex items-center gap-1.5 bg-green-500/20 backdrop-blur-md border border-green-500/30 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-100 text-xs font-medium">Aberto</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INFO BAR (FLUTUANTE) */}
      <div className="relative -mt-6 mx-4 z-20">
        <div className="bg-white shadow-lg rounded-xl p-4 flex flex-col gap-4 border border-gray-100">
          {/* Localização */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-50 text-gray-500"><Icon icon={MapPin} className="w-4 h-4" /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide">Localização</h3>
              <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{endereco || "Endereço não configurado"}</p>
            </div>
          </div>
          <div className="h-px w-full bg-gray-100" />
          {/* Contato */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600"><Icon icon={MessageCircle} className="w-4 h-4" /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide">Contato</h3>
              <p className="text-gray-800 font-medium text-sm mt-0.5">{telefone || "(00) 00000-0000"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL */}
      <div className="px-4 py-8 space-y-8">

        {/* LISTA DE SERVIÇOS (Novo Design Limpo) */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Icon icon={CalendarCheck} className="w-5 h-5" style={{ color: primary }} />
            Nossos Serviços
          </h2>

          {loading ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="h-6 w-6" color={primary} /></div>
          ) : (
            <div className="space-y-3">
              {services.length > 0 ? services.map(service => (
                <div key={service.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{service.nome_servico}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <Icon icon={Clock} className="w-3 h-3" /> {service.duracao_minutos} min
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm" style={{ color: primary }}>
                      R$ {Number(service.preco).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-center text-xs text-gray-400 py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  Adicione serviços para ver aqui.
                </p>
              )}
            </div>
          )}
        </section>

        {/* DETALHES EXTRAS (Lateral no Desktop, Abaixo no Mobile) */}
        <section className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-6">

          {/* Horários */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center text-sm">
              <Icon icon={Clock} className="w-4 h-4 mr-2" style={{ color: primary }} />
              Horários
            </h3>
            <div className="space-y-1.5">
              {['Seg', 'Ter', 'Qua'].map(day => (
                <div key={day} className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">{day}</span>
                  <span className="text-gray-900 font-semibold">09:00 - 18:00</span>
                </div>
              ))}
              <div className="flex justify-between text-xs"><span className="text-gray-500 font-medium">Dom</span> <span className="text-red-400">Fechado</span></div>
            </div>
          </div>

          {/* Pagamento */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center text-sm">
             
              Pagamento
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              {formasPagamento || 'Dinheiro, Cartão, Pix.'}
            </p>
          </div>

          {/* Comodidades */}
          {comodidades && Object.keys(comodidades).length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center text-sm">
                <Icon icon={Users} className="w-4 h-4 mr-2" style={{ color: primary }} />
                Comodidades
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(comodidades).filter(([_, v]) => v).map(([k]) => {
                  const amenity = amenitiesMap[k];
                  return amenity && (
                    <span key={k} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-gray-50 border border-gray-200 text-gray-600">
                      {amenity.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-gray-400 bg-white border-t border-gray-100">
        Powered by <strong>Horalis</strong>
      </div>
    </div>
  );
}

export default BookingPagePreview;