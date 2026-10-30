import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    headers: { 'X-Frame-Options': 'ALLOWALL' },
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true }
    }
  },
  preview: { host: '0.0.0.0', port: 4173 },
  build: { outDir: 'dist', emptyOutDir: true }
});
