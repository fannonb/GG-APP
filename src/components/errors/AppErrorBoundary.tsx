import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorPage } from '@/components/errors/ErrorPage'

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info)
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorPage
          title="Something went wrong"
          message="The app ran into an unexpected problem. You can try again or return to the home screen."
          details={
            import.meta.env.DEV
              ? `${this.state.error.message}\n\n${this.state.error.stack ?? ''}`
              : undefined
          }
          primaryAction={{
            label: 'Try again',
            onClick: this.handleRetry,
          }}
          secondaryAction={{
            label: 'Reload page',
            onClick: () => window.location.reload(),
          }}
        />
      )
    }

    return this.props.children
  }
}
