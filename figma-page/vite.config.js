import { defineConfig } from 'vite';

/**
 * Static server for the token sheet generated from Parth's Figma team library.
 * No bundling needed - the page is plain HTML/CSS/JS - but serving over HTTP
 * keeps module imports and fetch('./tokens.json') working.
 */
export default defineConfig({
  root: 'figma-page',
  server: {
    host: '0.0.0.0',
    port: 5190,
    strictPort: true,
    allowedHosts: true,
    headers: { 'X-Frame-Options': 'ALLOWALL' }
  },
  preview: { host: '0.0.0.0', port: 5190 },
  build: { outDir: '../dist/figma-page', emptyOutDir: true }
});
