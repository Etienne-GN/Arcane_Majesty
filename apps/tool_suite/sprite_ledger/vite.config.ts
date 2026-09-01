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
    // Personal, single-user curation tool with unauthenticated write
    // endpoints behind the /api proxy — localhost-only by default
    // (unlike apps/amo's game server, which deliberately binds to the
    // LAN for multiplayer testing). Default host (127.0.0.1) applies
    // when `host` is omitted.
    proxy: {
      '/api': 'http://localhost:3002'
    }
  }
})
