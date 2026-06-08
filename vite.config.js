import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import jsconfigPaths from 'vite-jsconfig-paths'
import { fileURLToPath, URL } from 'node:url'

function horalisApiDevServer() {
  return {
    name: 'horalis-api-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/v1', async (req, res, next) => {
        try {
          const { default: handler } = await import('./api/v1/[...path].js')
          await handler(req, res)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] ??= value
  })

  return {
    resolve: {
      alias: {
        'firebase/auth': fileURLToPath(new URL('./src/lib/supabaseAuthCompat.js', import.meta.url)),
      },
    },
    plugins: [
      react(),
      jsconfigPaths(),
      horalisApiDevServer(),
    ],
    optimizeDeps: {
      include: [
        '@fullcalendar/react',
        '@fullcalendar/daygrid',
        '@fullcalendar/timegrid',
        '@fullcalendar/interaction',
        'date-fns/locale/pt-BR',
      ],
    },
  }
})
