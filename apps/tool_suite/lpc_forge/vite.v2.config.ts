import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// LPC Forge v2 (see v2/SPEC.md). Same API server (:3001) as v1; v1 on 5177,
// v2 on 5179. @game points at the game's source so the Forge renders with the
// game's own layout, palette and animation-resolution code.
const GAME_SRC = fileURLToPath(new URL('../../amo/src', import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('./v2', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: {
      '@game': GAME_SRC,
      '@v2': fileURLToPath(new URL('./v2/src', import.meta.url)),
    },
  },
  server: {
    port: 5179,
    strictPort: true,
    host: true,
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), GAME_SRC] },
    proxy: { '/api': 'http://localhost:3001', '/lpc': 'http://localhost:3001' },
  },
  build: { outDir: fileURLToPath(new URL('./dist-v2', import.meta.url)), emptyOutDir: true },
})
