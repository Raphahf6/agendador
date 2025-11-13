// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  // <<< ADICIONADO safelist PARA DEBUG >>>
  safelist: [
    // --- CORES ESTÁTICAS DE ALERTA E SUCESSO ---
    'text-red-700',
    'bg-red-50',
    'border-red-200',
    'text-green-400', // (Usado para o Check na Landing Page)
    'text-green-500',
    'text-green-700',
    'bg-green-600',
    'bg-red-800', // (Usado para Error Box no Painel)
    'text-red-100', // (Usado para Texto de Erro no Painel)
    'border-red-700',
    'text-red-400', // (Usado para Texto/Ícone de Excluir no Dark Mode)
    'hover:bg-red-400/20', // (Usado para Hover de Excluir no Dark Mode)


    // 🌟 CORES DINÂMICAS DO HORALIS (HEXADECIMAL) - ESSENCIAL 🌟
    // Fundo Base (Painel/Landing Page)
    'bg-[#1A2333]',
    'bg-[#181A25]', // (Do PainelLayout original)
    // Fundo Secundário (Cards/Tabela)
    'bg-[#243144]',
    'bg-[#111827]', // (Do Sidebar)
    // Borda/Divisor
    'border-[#34455C]',
    'border-gray-600', // (Inputs)

    // AÇÃO PRINCIPAL (Laranja) - Landing Page Botões
    'text-[#00ACC1]',
    'bg-[#00ACC1]',
    'hover:bg-[#E87B32]',

    // DESTAQUE SECUNDÁRIO (Azul) - Ícones e Foco no Painel
    'text-[#42A5F5]',
    'focus:ring-[#42A5F5]',
    'focus:border-[#42A5F5]',
    'hover:bg-[#42A5F5]/10',
    'hover:bg-[#42A5F5]/20',

    // Texto e Subtítulo (Dark Mode)
    'text-gray-300', // Texto de Label em Modais
    'text-gray-400', // Texto sutil genérico (TEXT_SUBTLE_DARK)
    'text-white',

    // --- CLASSES CIANO ORIGINAIS (Mantidas para segurança) ---
    'text-cyan-600', 'text-cyan', 'text-cyan-700',
    'bg-cyan-600', 'bg-cyan', 'bg-cyan-700', 'bg-cyan-800',
    'hover:bg-cyan-700', 'hover:bg-cyan-50', 'bg-cyan-50', 'border-cyan-100',

    // --- CLASSES DE SOMBRA (Cruciais para o visual chique do KpiCard) ---
    'shadow-sm', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
    'hover:shadow-xl', 'hover:shadow-2xl',

    // --- CLASSES DE TEXTO E UTILS GERAIS (Garantia de ícones e fontes) ---
    'text-gray-900', 'text-gray-700', 'text-gray-600', 'text-gray-500',
    'bg-gray-100',
    'w-4', 'h-4', 'w-5', 'h-5', 'w-6', 'h-6', 'w-8', 'h-8', 'ml-1', 'ml-2',
    'animate-spin',
  ],
  // <<< FIM DA ADIÇÃO >>>
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
      colors: { // Cores shadcn
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))", // Deve ser escuro!
        primary: { /* ... */ },
        secondary: { /* ... */ },
        destructive: { /* ... */ },
        muted: { /* ... */ },
        accent: { /* ... */ },
        popover: { /* ... */ },
        card: { /* ... */ },
      },
      borderRadius: { /* ... */ },
      keyframes: { /* ... */ },
      animation: { /* ... */ },
    },
  },
  plugins: [require("tailwindcss-animate")],
}