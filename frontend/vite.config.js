import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The browser calls /api and /media on the SAME address as the page; Vite passes them to Django.
    // So one address works everywhere: localhost:5173 or a demo tunnel (https://….trycloudflare.com).
    // changeOrigin: false keeps the original address, so links Django builds (images, "next page") point to the right place
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false },
      '/media': { target: 'http://127.0.0.1:8000', changeOrigin: false },
    },
    allowedHosts: ['.trycloudflare.com'], // Cloudflare quick tunnel for demos
  },
})
