import { defineConfig } from 'vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Standalone dev server for the viewer: `npm run bloom`
export default defineConfig({
  root: here,
  base: './',
  // viewer/assets/model.glb is served at / and copied into the build
  publicDir: 'assets',
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
    allowedHosts: true,
    headers: { 'X-Frame-Options': 'ALLOWALL' },
  },
  preview: { host: '0.0.0.0', port: 5180, allowedHosts: true },
  build: { outDir: '../../dist/bloom', emptyOutDir: true, assetsDir: 'assets' },
});
