import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // API_PROXY_TARGET (sin prefijo VITE_, así no llega al navegador) elige el backend del proxy de
  // desarrollo: localhost:8000 por defecto, o el de Render. changeOrigin porque Render enruta por el Host.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy: { '/api': { target: env.API_PROXY_TARGET || 'http://localhost:8000', changeOrigin: true } } },
    // TZ fija: las fechas con hora se muestran en la zona del navegador y las pruebas esperan la hora
    // de Colombia. Sin esto fallan en GitHub Actions, que corre en UTC.
    test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js', testTimeout: 15000,
      env: { TZ: 'America/Bogota' },
      coverage: { provider: 'v8', include: ['src/**/*.{js,jsx}'], exclude: ['src/main.jsx', 'src/test/**', 'src/mocks/browser.js', 'src/app/CatalogPage.jsx'], reporter: ['text'] },
    },
  }
})
