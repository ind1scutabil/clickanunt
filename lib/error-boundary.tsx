'use client';
import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // In production, log to error tracking service (Sentry)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error) || (
          <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
            <div className="max-w-md text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Something went wrong</h1>
              <p className="text-gray-600 mb-6">{this.state.error.message}</p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Go Home
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for client-side error handling
 */
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error ${context ? `in ${context}` : ''}:`, error);
    // Send to Sentry or error tracking service
    window.__SENTRY__?.captureException?.(error, { tags: { context } });
  };

  return { handleError };
}

declare global {
  interface Window {
    __SENTRY__?: {
      captureException?: (error: Error, context?: { tags?: { context?: string } }) => void;
    };
  }
}
