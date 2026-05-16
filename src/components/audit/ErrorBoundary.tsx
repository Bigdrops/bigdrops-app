import { Component } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">History unavailable</p>
              <p className="mt-1">Something went wrong while loading the activity log.</p>
              {this.props.onRetry && (
                <button
                  onClick={this.props.onRetry}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
