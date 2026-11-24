import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
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
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: resolve(process.cwd(), 'index.html'), motion: resolve(process.cwd(), 'motion.html') },
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'graphics-vendor';
          if (id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react/') || id.includes('/node_modules/scheduler/')) return 'react-vendor';
          if (id.includes('/node_modules/gsap/')) return 'motion-vendor';
        }
      }
    }
  }
});
