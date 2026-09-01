import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5177,
    host: true,
    proxy: {
      '/api': 'http://localhost:3001'
    },
    watch: {
      ignored: ['**/dist/**', '**/public/**', '**/node_modules/**']
    }
  }
})
