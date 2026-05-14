import { defineConfig } from 'vite';

// COEP: credentialless (not require-corp) is required so the browser can fetch
// cross-origin model files from HuggingFace CDN, which doesn't send a
// Cross-Origin-Resource-Policy header. credentialless still enables
// SharedArrayBuffer (multi-threaded ONNX) via COOP: same-origin.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  server:  { headers: isolationHeaders },
  preview: { headers: isolationHeaders },

  worker: {
    format: 'es',
  },

  optimizeDeps: {
    // Transformers.js uses dynamic imports for ONNX WASM files; pre-bundling
    // rewrites those internal paths and causes 404s at runtime.
    exclude: ['@huggingface/transformers'],
  },

  build: {
    target: 'esnext',
  },
});
