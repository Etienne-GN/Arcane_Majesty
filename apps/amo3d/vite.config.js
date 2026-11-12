import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const rules = fileURLToPath(new URL('../../packages/rules/index.js', import.meta.url));

export default defineConfig({
    base: './',   // relative paths, so the build also runs from a phone's file system (Capacitor)
    resolve: {
        // amo's engine-free rules, shared through packages/rules — no copies.
        alias: { '@rules': rules },
    },
    server: {
        port: 5190,
        strictPort: true,
        fs: { allow: ['../..'] },
    },
});
