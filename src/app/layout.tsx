import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-outfit',   // kept as --font-outfit for CSS var compat
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Papeleo',
  description: 'Digitaliza y organiza tus documentos — 100% privado, funciona sin internet.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Papeleo',
  },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d9488',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('papeleo_theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='light'||(s===null&&!d)){document.documentElement.classList.add('light');}})();` }} />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  )
}
