import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Keep the in-app documentation link available in a standalone production build.
const compatibilityReport = {
  name: 'include-compatibility-report',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'docs/COMPATIBILITY_REPORT.md',
      source: readFileSync(new URL('./docs/COMPATIBILITY_REPORT.md', import.meta.url)),
    });
  },
};

export default defineConfig({
  plugins: [compatibilityReport],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    headers: { 'X-Frame-Options': 'ALLOWALL' },
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/api/nexus': { target: 'http://127.0.0.1:5001', changeOrigin: true }
    }
  },
  preview: { host: '0.0.0.0', port: 4173 },
  build: { outDir: 'dist', emptyOutDir: true }
});
