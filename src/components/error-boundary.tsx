'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-border bg-card/50 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
          <h3 className="text-sm font-medium mb-1">Something went wrong</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm">
            {this.state.error?.message || 'An unexpected error occurred in this section.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
