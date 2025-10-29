// tailwind.config.js
 const defaultTheme = require('tailwindcss/defaultTheme');

 /** @type {import('tailwindcss').Config} */
 module.exports = {
   darkMode: ["class"],
   // <<< ADICIONADO safelist PARA DEBUG >>>
   safelist: [
     'text-cyan-600',
     'text-cyan',
     'text-cyan-700',
     'bg-cyan-600',
     'bg-cyan',
     'bg-cyan-700',
     'bg-cyan-800',
     'hover:bg-cyan-700',
     'hover:bg-cyan-50', // Para o link do painel
     'bg-cyan-50',     // Para a tag da Hero section
     'border-cyan-100', // Para a tag da Hero section
     // Adicione outras classes ciano se houver (ex: cyan-500, cyan-700)
     // Adicione classes de ícone se suspeitar delas também
     'w-4', 'h-4', 'w-5', 'h-5', 'w-6', 'h-6', 'w-8', 'h-8', 'ml-1', 'ml-2', // Tamanhos comuns usados
     'text-white', // Essencial para ícones em fundo ciano
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