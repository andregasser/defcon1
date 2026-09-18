import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The API server (server/server.mjs) owns persistence. In dev, Vite proxies
// /api to it so the frontend talks to the same endpoints as in production.
const API_PORT = Number(process.env.DEFCON1_API_PORT ?? 7777)

export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? '/defcon1/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: mode === 'demo' ? undefined : {
      '/api': {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: mode === 'demo' ? 'dist-demo' : 'dist',
    sourcemap: false,
  },
  test: {
    // Pure logic runs in node; UI specs opt into jsdom via a file docblock.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}))
