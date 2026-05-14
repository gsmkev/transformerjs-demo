import { defineConfig } from 'vite';

// credentialless: allows cross-origin fetches to tessdata CDN without
// Cross-Origin-Resource-Policy header, while still enabling SharedArrayBuffer
// for multi-threaded WASM via COOP: same-origin.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  server:  { headers: isolationHeaders },
  preview: { headers: isolationHeaders },

  optimizeDeps: {
    // Tesseract.js loads its worker and WASM files via dynamic paths at runtime;
    // pre-bundling breaks those internal resolutions.
    exclude: ['tesseract.js'],
  },

  build: {
    target: 'esnext',
  },
});
