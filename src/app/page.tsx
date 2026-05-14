import { Suspense } from 'react'
import App from '@/components/App'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

export default function Page() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-base" />}>
        <App />
      </Suspense>
    </ErrorBoundary>
  )
}
