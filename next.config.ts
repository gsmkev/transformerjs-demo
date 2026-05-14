import type { NextConfig } from 'next'
import withSerwist from '@serwist/next'

const nextConfig: NextConfig = {
  // Exclude heavy native binaries from Next.js file-tracing.
  // @huggingface/transformers is loaded only via dynamic import in 'use client' code
  // (browser-only). The ONNX Node.js runtime and sharp native libraries must never
  // ship inside the serverless function — they are 350+ MB of native binaries that
  // the browser doesn't use.
  outputFileTracingExcludes: {
    '*': [
      './node_modules/onnxruntime-node/**',
      './node_modules/@img/**',
      './node_modules/sharp/**',
      './node_modules/@mlc-ai/**', // WebLLM — browser-only, model weights downloaded at runtime
    ],
  },

  webpack(config) {
    // Alias out Node.js-only packages so the client bundle doesn't try to import them.
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node$': false,
      'sharp$': false,
    }
    return config
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin'    },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ]
  },
}

export default withSerwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // Disable in dev — SW caching interferes with hot reload
  disable: process.env.NODE_ENV === 'development',
  // Allow precaching JS chunks up to 10 MB (the ONNX WASM at 23 MB is excluded
  // intentionally — Transformers.js manages its own Cache Storage for that file)
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
})(nextConfig)
