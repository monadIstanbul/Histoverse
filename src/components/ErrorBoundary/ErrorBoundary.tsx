import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log real errors, not browser extension issues
    if (!error.message?.includes('extension') && 
        !error.message?.includes('validateDOMNesting')) {
      console.error('Uncaught error:', error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-void text-text flex items-center justify-center">
          <div className="max-w-md mx-auto text-center panel p-8 rounded-lg border border-red">
            <h2 className="text-title text-red mb-4">⚠️ Something went wrong</h2>
            <p className="text-dim mb-4">
              The application encountered an unexpected error.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary px-6 py-2"
            >
              Reload Application
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-dim cursor-pointer">Error Details (Dev Mode)</summary>
                <pre className="text-xs bg-void p-2 mt-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;