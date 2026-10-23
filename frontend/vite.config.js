import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const apiProxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
  },
  '/uploads': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: apiProxy
  },
  // E2E / CI usa `vite preview` — mesmo proxy do dev server
  preview: {
    port: 3000,
    host: true,
    proxy: apiProxy
  }
})
