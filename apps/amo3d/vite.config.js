import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const amoSrc = fileURLToPath(new URL('../amo/src', import.meta.url));

export default defineConfig({
    resolve: {
        // The POC imports amo's pure rule modules directly — no copies.
        alias: { '@amo': amoSrc },
    },
    server: {
        port: 5190,
        strictPort: true,
        fs: { allow: ['..'] },
    },
});
