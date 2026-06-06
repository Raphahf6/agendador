import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Loader2,
  Lock,
  Mail,
  Phone,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const primaryButtonClass = 'bg-cyan-800 hover:bg-cyan-700 focus:ring-cyan-500';
const inputClass = 'h-12 w-full rounded-lg border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-70';

const IconInput = ({ icon: IconComponent, ...props }) => (
  <div className="relative">
    <IconComponent className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
    <input className={inputClass} {...props} />
  </div>
);

function parseSignupError(error) {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return 'Nao foi possivel criar sua conta agora. Tente novamente.';
}

function SignupModalContent({ closeModal, isModalOpen }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nomeSalao: '',
    whatsapp: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const updateFormField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (error) setError('');
  };

  const validate = () => {
    const phoneDigits = formData.whatsapp.replace(/\D/g, '');
    if (formData.nomeSalao.trim().length < 2) return 'Informe o nome da sua clinica ou sala.';
    if (phoneDigits.length < 10 || phoneDigits.length > 11) return 'Informe um WhatsApp valido com DDD.';
    if (formData.password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (formData.password !== formData.confirmPassword) return 'As senhas nao coincidem.';
    return null;
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    let response;

    try {
      response = await axios.post(`${API_BASE_URL}/auth/register-owner`, {
        nome_salao: formData.nomeSalao.trim(),
        whatsapp: formData.whatsapp.replace(/\D/g, ''),
        email: formData.email.trim(),
        password: formData.password,
      });
    } catch (err) {
      setError(parseSignupError(err));
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      toast.success('Conta criada. Teste gratis iniciado!');
      closeModal();
      navigate(`/painel/${response.data.slug}/visaoGeral`, { replace: true });
    } catch (err) {
      console.error('Conta criada, mas o login automatico falhou:', err);
      toast.success('Conta criada. Entre com seu e-mail e senha.');
      closeModal();
      navigate('/login?cadastro=sucesso', {
        replace: true,
        state: {
          signupSuccess: true,
          email: formData.email.trim(),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isModalOpen) return null;

  return (
    <div className="relative mx-auto flex max-h-[95vh] w-full max-w-lg flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-2xl sm:p-8">
      <button
        onClick={closeModal}
        className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        aria-label="Fechar"
        type="button"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="mb-6 border-b border-gray-100 pb-5 pr-10">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">7 dias gratis</p>
        <h2 className="text-2xl font-bold text-gray-950">
          Cadastre sua clinica
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Sem cartao e sem confirmacao de e-mail. Ao finalizar, voce entra direto no painel.
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <IconInput
          id="modalNomeSalao"
          icon={Building2}
          type="text"
          placeholder="Nome da clinica"
          value={formData.nomeSalao}
          onChange={(event) => updateFormField('nomeSalao', event.target.value)}
          disabled={loading}
          required
        />

        <IconInput
          id="modalWhatsapp"
          icon={Phone}
          type="tel"
          inputMode="tel"
          placeholder="WhatsApp com DDD"
          value={formData.whatsapp}
          onChange={(event) => updateFormField('whatsapp', event.target.value)}
          disabled={loading}
          required
        />

        <IconInput
          id="modalEmail"
          icon={Mail}
          type="email"
          placeholder="E-mail de acesso"
          value={formData.email}
          onChange={(event) => updateFormField('email', event.target.value)}
          disabled={loading}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <IconInput
            id="modalPassword"
            icon={Lock}
            type="password"
            placeholder="Senha"
            value={formData.password}
            onChange={(event) => updateFormField('password', event.target.value)}
            disabled={loading}
            required
          />

          <IconInput
            id="modalConfirmPassword"
            icon={Lock}
            type="password"
            placeholder="Confirmar senha"
            value={formData.confirmPassword}
            onChange={(event) => updateFormField('confirmPassword', event.target.value)}
            disabled={loading}
            required
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <button
          type="submit"
          className={`flex h-12 w-full items-center justify-center rounded-lg px-4 text-sm font-bold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${primaryButtonClass}`}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <>
              Criar conta gratis
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-gray-100 pt-5 text-center text-sm text-gray-600">
        Ja tem uma conta?{' '}
        <Link to="/login" className="font-semibold text-cyan-700 hover:underline">
          Entrar no painel
        </Link>
      </div>
    </div>
  );
}

export default SignupModalContent;
