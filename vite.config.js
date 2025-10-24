import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import jsconfigPaths from 'vite-jsconfig-paths' 

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    jsconfigPaths() 
  ],
  
  // --- ADIÇÃO PARA CORRIGIR O BUG DO FULLCALENDAR ---
  optimizeDeps: {
    include: [
      '@fullcalendar/react',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/interaction',
      'date-fns/locale/pt-BR', // Inclui o locale na otimização
    ],
    // Excluir explicitamente pode não ser necessário se o 'include' funcionar,
    // mas se o 'include' sozinho não funcionar, tente adicionar 'exclude'
    // exclude: [
    //   '@fullcalendar/react',
    //   '@fullcalendar/daygrid',
    //   '@fullcalendar/timegrid',
    //   '@fullcalendar/interaction',
    // ]
  }
  // --- FIM DA ADIÇÃO ---
})