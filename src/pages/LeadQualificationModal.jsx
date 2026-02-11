import React, { useState } from 'react';
import { X, MessageCircle, ArrowRight, User, Briefcase, Users, Store,Smartphone } from 'lucide-react';

const LeadQualificationModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    nomeNegocio: '',
    tipoNegocio: '', // Barbearia, Salão, Estética, etc
    tamanhoEquipe: '' // Eu sozinho, 2-5, 5-10, 10+
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 1. Constrói a mensagem personalizada
    const msg = `🚀 *Quero profissionalizar a minha Agenda!*%0A%0A` +
      `👤 *Nome:* ${formData.nome}%0A` +
      `📱 *Zap:* ${formData.whatsapp}%0A` +
      `🏢 *Negócio:* ${formData.nomeNegocio}%0A` +
      `✂️ *Ramo:* ${formData.tipoNegocio}%0A` +
      `👥 *Equipe:* ${formData.tamanhoEquipe}%0A%0A` +
      `Gostaria de saber mais sobre a implantação!`;

    // 2. Redireciona para o seu WhatsApp com a mensagem pronta
    // Substitua pelo SEU número real
    const myNumber = "5511936200327"; 
    window.open(`https://wa.me/${myNumber}?text=${msg}`, '_blank');
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Análise Gratuita</h3>
            <p className="text-xs text-slate-500">Conte um pouco sobre seu negócio</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Nome */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Seu Nome</label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input 
                required
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Como podemos te chamar?"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Seu WhatsApp</label>
            <div className="relative">
              <Smartphone className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input 
                required
                name="whatsapp"
                type="tel"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="(DDD) 99999-9999"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             {/* Tipo de Negócio */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Tipo de Negócio</label>
                <div className="relative">
                  <Store className="w-5 h-5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select 
                    required
                    name="tipoNegocio"
                    value={formData.tipoNegocio}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all appearance-none text-slate-600"
                  >
                    <option value="" disabled>Selecione...</option>
                    <option value="Barbearia">Barbearia</option>
                    <option value="Salão de Beleza">Salão de Beleza</option>
                    <option value="Clínica de Estética">Clínica de Estética</option>
                    <option value="Esmalteria/Lash">Esmalteria / Lash</option>
                    <option value="Studio de Tatuagem">Studio de Tatuagem</option>
                    <option value="Autônomo">Sou Autônomo(a)</option>
                  </select>
                </div>
             </div>

             {/* Tamanho da Equipe (CRUCIAL PARA PRECIFICAÇÃO) */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Tamanho da Equipe</label>
                <div className="relative">
                  <Users className="w-5 h-5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select 
                    required
                    name="tamanhoEquipe"
                    value={formData.tamanhoEquipe}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all appearance-none text-slate-600"
                  >
                    <option value="" disabled>Quantos profissionais?</option>
                    <option value="Eu trabalho sozinho(a)">Eu trabalho sozinho(a)</option>
                    <option value="2 a 5 pessoas">2 a 5 pessoas</option>
                    <option value="6 a 10 pessoas">6 a 10 pessoas</option>
                    <option value="Mais de 10">Mais de 10 (Rede/Franquia)</option>
                  </select>
                </div>
             </div>
          </div>

          {/* Nome do Negócio (Opcional ou no fim) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Nome do Estabelecimento</label>
            <div className="relative">
              <Briefcase className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input 
                name="nomeNegocio"
                value={formData.nomeNegocio}
                onChange={handleChange}
                placeholder="Ex: Barbearia do Zé"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 mt-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 group"
          >
            Falar com Especialista <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="text-center text-[10px] text-slate-400">
            Seus dados estão seguros. Entraremos em contato via WhatsApp.
          </p>

        </form>
      </div>
    </div>
  );
};

export default LeadQualificationModal;