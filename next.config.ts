import type { NextConfig } from 'next'

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

export default nextConfig
