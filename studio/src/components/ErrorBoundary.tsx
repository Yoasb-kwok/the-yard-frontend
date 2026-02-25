import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorBoundaryFallback({ onRetry, onReload }: { onRetry: () => void; onReload: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-800 mb-2">發生錯誤</h1>
          <p className="text-sm text-red-700 mb-4">頁面發生錯誤，請重試或重新整理。</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              重試
            </button>
            <button
              type="button"
              onClick={onReload}
              className="px-4 py-2 rounded-md border border-red-600 text-red-600 text-sm font-medium hover:bg-red-50"
            >
              重新整理
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Catches runtime errors in child tree and shows a fallback UI instead of white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <ErrorBoundaryFallback onRetry={this.handleRetry} onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}
