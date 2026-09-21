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
    // Fixed port, not a suggestion: fail loudly on a stale process rather
    // than silently drifting to another port. Kill whatever's squatting
    // on 5178.
    strictPort: true,
    // Bound to the LAN like lpc_forge (host: true) so the user can reach
    // it from another machine on their network, e.g. 192.168.0.206:5178.
    // Write endpoints behind the /api proxy stay unauthenticated — this
    // is still a trusted-home-network tool, not exposed to the internet.
    host: true,
    proxy: {
      // 3003, not 3002 — apps/amo's own game server (server/index.js)
      // hardcodes 3002 for its Socket.io/REST backend. Both tools used to
      // claim the same port; whichever started first silently won, and
      // the other looked broken with no explanation. Fixed ports across
      // all 3 apps: amo 5174/3002, lpc_forge 5177/3001, sprite_ledger
      // 5178/3003 -- see each app's README/CLAUDE.md.
      '/api': 'http://localhost:3003'
    }
  }
})
