import { defineConfig } from 'vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// NEON ORBIT — one WebGL scene, no external assets beyond the local fonts.
// `npm run orbit` serves it on :5200.
export default defineConfig({
  root: here,
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5200,
    strictPort: true,
    allowedHosts: true,
    headers: { 'X-Frame-Options': 'ALLOWALL' },
  },
  preview: { host: '0.0.0.0', port: 5200, allowedHosts: true },
  build: {
    outDir: '../dist/orbit',
    emptyOutDir: true,
    assetsDir: 'assets',
    target: 'es2020',
  },
});
