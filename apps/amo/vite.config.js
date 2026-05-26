import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5174,
    host: '0.0.0.0',
    watch: {
      // ressources/ and the public/lpc symlink hold 150K+ LPC sprite PNGs — never watch them
      ignored: ['**/ressources/**', '**/public/lpc/**'],
    },
    proxy: {
      // WebSocket + HTTP for Socket.io
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,
        changeOrigin: true,
      },
      // REST endpoints (status, future admin)
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
