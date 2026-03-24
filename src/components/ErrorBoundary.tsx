import React from 'react'
import { Button } from '@/components/ui/button'

type ErrorBoundaryProps = {
  children: React.ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
  retryKey: number
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
    retryKey: 0,
  }

  static getDerivedStateFromError(error: Error) {
    return { error, retryKey: 0 }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState((current) => ({
      error: null,
      retryKey: current.retryKey + 1,
    }))
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-card p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Something went wrong</h2>
            <div className="mt-4">
              <Button type="button" onClick={this.handleRetry}>
                Try again
              </Button>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              {this.state.error.message || 'Unknown error'}
            </p>
          </div>
        </div>
      )
    }

    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>
  }
}
