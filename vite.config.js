import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy de desarrollo para evitar CORS: todo lo que empiece con /api va al backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true, // WebSocket support
        // No reescribimos el path: /api/* -> http://localhost:8080/api/*
      }
    }
  },
  base: '/'
})
