import { defineConfig } from 'vite';
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';

export default defineConfig({
  plugins: [crossOriginIsolation()],

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
