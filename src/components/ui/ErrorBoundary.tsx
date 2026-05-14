'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="min-h-screen bg-base flex items-center justify-center p-6">
          <div className="card max-w-md w-full space-y-3 text-center">
            <p className="text-err font-semibold">Something went wrong</p>
            <p className="text-xs text-dim break-words">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="text-xs text-accent underline"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
