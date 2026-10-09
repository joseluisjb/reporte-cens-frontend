import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js', testTimeout: 15000,
    coverage: { provider: 'v8', include: ['src/**/*.{js,jsx}'], exclude: ['src/main.jsx', 'src/test/**', 'src/mocks/browser.js', 'src/app/CatalogPage.jsx'], reporter: ['text'] },
  },
})
