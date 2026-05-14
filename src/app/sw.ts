import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  CacheableResponsePlugin,
} from 'serwist'

// Injected by @serwist/next at build time.
// WorkerGlobalScope is used instead of ServiceWorkerGlobalScope because
// the dom tsconfig lib exposes WorkerGlobalScope but not ServiceWorkerGlobalScope.
// Serwist/webpack compiles this file separately; tsc only checks types here.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}
declare const self: WorkerGlobalScope

// ── Cache names (never change these — they survive across app deployments) ──
// Tesseract.js fetches tessdata + WASM from CDN; it does NOT self-persist these
// in Cache Storage, so we must cache them in the SW. Other model libraries
// (Transformers.js, WebLLM) manage their own named caches and work offline
// without SW intervention once downloaded.
const TESSDATA_CACHE   = 'tessdata-v1'
const TESSWASM_CACHE   = 'tesseract-wasm-v1'
const STATIC_CDN_CACHE = 'static-cdn-v1'

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,

  runtimeCaching: [
    // ── Tesseract language data ─────────────────────────────────────────
    // Large .traineddata files (8–90 MB each). Cache forever — they are
    // content-addressed by version path so safe to never expire.
    {
      matcher: ({ url }) => url.hostname === 'tessdata.projectnaptha.com',
      handler: new CacheFirst({
        cacheName: TESSDATA_CACHE,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 20 }),
        ],
      }),
    },

    // ── Tesseract WASM core (jsDelivr) ─────────────────────────────────
    {
      matcher: ({ url }) =>
        url.hostname === 'cdn.jsdelivr.net' &&
        url.pathname.includes('tesseract'),
      handler: new CacheFirst({
        cacheName: TESSWASM_CACHE,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 10 }),
        ],
      }),
    },

    // ── Generic static CDN assets (fonts, icons from other CDNs) ───────
    {
      matcher: ({ url, sameOrigin }) =>
        !sameOrigin &&
        url.hostname !== 'tessdata.projectnaptha.com' &&
        url.hostname !== 'cdn.jsdelivr.net' &&
        // Don't intercept HuggingFace or MLC — those libs self-cache
        !url.hostname.includes('huggingface.co') &&
        !url.hostname.includes('mlc.ai') &&
        (url.pathname.endsWith('.woff2') ||
          url.pathname.endsWith('.woff') ||
          url.pathname.endsWith('.css')),
      handler: new CacheFirst({
        cacheName: STATIC_CDN_CACHE,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
      }),
    },

    // ── Next.js static chunks (immutable, content-hashed) ───────────────
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith('/_next/static/'),
      handler: new CacheFirst({
        cacheName: 'next-static',
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
      }),
    },

    // ── Next.js image optimization ────────────────────────────────────
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith('/_next/image'),
      handler: new StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
      }),
    },

    // ── Same-origin pages (app shell navigation) ──────────────────────
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages',
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 }),
        ],
        networkTimeoutSeconds: 3,
      }),
    },
  ],
})

serwist.addEventListeners()
