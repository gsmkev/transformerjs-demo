import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Archivo',
  description: 'Tu vault personal de documentos — 100% privado, funciona sin internet.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Archivo',
  },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4f46e5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('archivo_theme');var sys=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='light'||(!s&&!sys)){document.documentElement.classList.add('light');}var a=localStorage.getItem('archivo_a11y');if(a){try{var p=JSON.parse(a);if(p.textSize==='large')document.documentElement.classList.add('a11y-large');if(p.contrast==='high')document.documentElement.classList.add('a11y-contrast');if(p.motion==='reduced')document.documentElement.classList.add('a11y-motion');}catch(e){}}}catch(e){}})();` }} />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  )
}
