import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Sprite Ledger v2 — the redesigned UI (see v2/SPEC.md). Same API server
// (:3003) and data as v1, its own port so both can run side by side:
// v1 on 5178, v2 on 5180.
export default defineConfig({
  root: fileURLToPath(new URL('./v2', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: {
      // v1's typed API client and pure helpers, shared rather than copied
      '@shared': fileURLToPath(new URL('./src/services', import.meta.url)),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    host: true,
    proxy: { '/api': 'http://localhost:3003' },
  },
  build: { outDir: fileURLToPath(new URL('./dist-v2', import.meta.url)), emptyOutDir: true },
})
