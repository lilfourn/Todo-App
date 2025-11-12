/**
 * React Error Boundary Component
 * 
 * Catches errors in the React component tree and displays a fallback UI
 * Prevents the entire app from crashing due to render errors
 * Automatically logs errors to the error tracking service
 * 
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <h1>Something went wrong</h1>
 *       <button onClick={reset}>Try Again</button>
 *     </div>
 *   )}
 *   onError={(error, errorInfo) => {
 *     // Custom error handling
 *   }}
 * >
 *   <App />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, type ReactNode } from 'react';
import { logger, getUserFriendlyMessage } from '../lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches React render errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details when an error is caught
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error with component stack trace
    logger.error(error, {
      componentStack: errorInfo.componentStack,
      context: 'react_error_boundary',
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error state to recover from error
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  /**
   * Render fallback UI when error is caught
   */
  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      const { error } = this.state;

      // If fallback is a function, call it with error and reset callback
      if (typeof fallback === 'function') {
        return fallback(error, this.resetError);
      }

      // If fallback is a ReactNode, render it directly
      if (fallback) {
        return fallback;
      }

      // Default fallback UI matching the app's styling
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '20px',
              }}
            >
              ⚠️
            </div>
            
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1a202c',
                marginBottom: '16px',
              }}
            >
              Something went wrong
            </h1>
            
            <p
              style={{
                fontSize: '16px',
                color: '#4a5568',
                marginBottom: '24px',
                lineHeight: '1.5',
              }}
            >
              {getUserFriendlyMessage(error)}
            </p>

            {/* Show technical details in development only */}
            {import.meta.env.DEV && (
              <details
                style={{
                  marginBottom: '24px',
                  textAlign: 'left',
                  background: '#f7fafc',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: '#2d3748',
                    marginBottom: '8px',
                  }}
                >
                  Technical Details (Development Only)
                </summary>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: '#e53e3e',
                    fontSize: '12px',
                    margin: 0,
                  }}
                >
                  {error.name}: {error.message}
                </pre>
              </details>
            )}

            <button
              onClick={this.resetError}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

// Export as both default and named export for flexibility
export default ErrorBoundary;
