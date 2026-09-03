import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5178,
    // Bound to the LAN like lpc_forge (host: true) so the user can reach
    // it from another machine on their network, e.g. 192.168.0.206:5178.
    // Write endpoints behind the /api proxy stay unauthenticated — this
    // is still a trusted-home-network tool, not exposed to the internet.
    host: true,
    proxy: {
      '/api': 'http://localhost:3002'
    }
  }
})
