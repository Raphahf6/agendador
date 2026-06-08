import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const heroImageUrl = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1800&auto=format&fit=crop';

const primaryButtonClass = 'bg-cyan-800 hover:bg-cyan-700 focus:ring-cyan-500';
const inputClass = 'w-full h-12 rounded-lg border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-70';

const IconField = ({ icon: IconComponent, ...props }) => (
  <div className="relative">
    <IconComponent className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
    <input className={inputClass} {...props} />
  </div>
);

function parseApiError(error) {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return 'Nao foi possivel criar sua conta agora. Revise os dados e tente novamente.';
}

function ProfissionalSignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nomeSalao: '',
    whatsapp: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
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

  const handleSubmit = async (event) => {
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
      setError(parseApiError(err));
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      navigate(`/painel/${response.data.slug}/agendamentos`, { replace: true });
    } catch (err) {
      console.error('Conta criada, mas o login automatico falhou:', err);
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,1fr)]">
        <aside
          className="relative hidden bg-cover bg-center lg:block"
          style={{ backgroundImage: `url(${heroImageUrl})` }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-cyan-950/55" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <Link to="/" className="w-fit text-3xl font-bold tracking-normal">
              Hora<span className="text-cyan-200">lis</span>
            </Link>

            <div className="max-w-md space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Teste gratuito</p>
                <h1 className="text-4xl font-bold leading-tight">
                  Crie sua clinica e comece a agendar hoje.
                </h1>
              </div>
              <div className="grid gap-3 text-sm text-cyan-50">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-cyan-200" />
                  <span>7 dias liberados automaticamente</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-cyan-200" />
                  <span>Sem cartao e sem confirmacao de e-mail</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-cyan-200" />
                  <span>Acesso direto ao painel apos o cadastro</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:hidden">
              <Link to="/" className="text-4xl font-bold tracking-normal">
                Hora<span className="text-cyan-700">lis</span>
              </Link>
            </div>

            <div className="mb-7">
              <p className="mb-2 inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800">
                <CalendarDays className="h-4 w-4" />
                7 dias gratis
              </p>
              <h2 className="text-3xl font-bold tracking-normal text-gray-950">
                Cadastro gratuito
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Crie sua conta, entre no painel e configure sua agenda sem etapa de pagamento.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label htmlFor="nomeSalao" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Nome da clinica
                  </label>
                  <IconField
                    id="nomeSalao"
                    icon={Building2}
                    type="text"
                    placeholder="Ex: Clinica Aurora"
                    value={formData.nomeSalao}
                    onChange={(event) => updateField('nomeSalao', event.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="whatsapp" className="mb-1.5 block text-sm font-medium text-gray-700">
                    WhatsApp para contato
                  </label>
                  <IconField
                    id="whatsapp"
                    icon={Phone}
                    type="tel"
                    inputMode="tel"
                    placeholder="11987654321"
                    value={formData.whatsapp}
                    onChange={(event) => updateField('whatsapp', event.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                    E-mail de acesso
                  </label>
                  <IconField
                    id="email"
                    icon={Mail}
                    type="email"
                    placeholder="voce@clinica.com"
                    value={formData.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Senha
                    </label>
                    <IconField
                      id="password"
                      icon={Lock}
                      type="password"
                      placeholder="Min. 6 caracteres"
                      value={formData.password}
                      onChange={(event) => updateField('password', event.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Confirmar senha
                    </label>
                    <IconField
                      id="confirmPassword"
                      icon={Lock}
                      type="password"
                      placeholder="Repita a senha"
                      value={formData.confirmPassword}
                      onChange={(event) => updateField('confirmPassword', event.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
              </div>

              <p className="mt-5 text-center text-xs leading-5 text-gray-500">
                Ao criar a conta, voce inicia automaticamente seu teste gratuito de 7 dias.
              </p>
            </form>

            <div className="mt-5 text-center text-sm text-gray-600">
              Ja tem uma conta?{' '}
              <Link to="/login" className="font-semibold text-cyan-700 hover:underline">
                Entrar no painel
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProfissionalSignupPage;
