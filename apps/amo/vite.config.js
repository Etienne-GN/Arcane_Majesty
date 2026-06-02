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
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendors into their own chunks so the
        // browser caches them across app deploys and downloads them in parallel
        // with the app code (instead of one ~2.3MB monolith).
        manualChunks: {
          phaser: ['phaser'],
          socketio: ['socket.io-client'],
        },
      },
    },
  },
});
