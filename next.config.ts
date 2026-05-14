import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling the Node.js ONNX runtime on the server;
  // @huggingface/transformers is used only in 'use client' code via dynamic import.
  serverExternalPackages: ['@huggingface/transformers'],

  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node$': false, // browser doesn't have this — omit to avoid bundle errors
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
