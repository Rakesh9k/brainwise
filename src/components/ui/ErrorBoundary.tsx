/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('BrainWise ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });

    // Handle stale deployment chunk mismatches (e.g. Vite dynamic import failure)
    const errorMsg = error?.message || '';
    const isChunkMismatch =
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('error loading dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('ChunkLoadError');

    if (isChunkMismatch) {
      const reloadKey = 'brainwise_chunk_reload_lock';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(reloadKey, String(now));
        console.warn('Stale build chunk detected. Automatically refreshing to latest application version...');
        window.location.reload();
      }
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleResetCache = (): void => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/?demo=1';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';

      return (
        <div className="min-h-screen bg-[#F5F5F4] text-[#242424] flex items-center justify-center p-6 selection:bg-[#FFF0E5] selection:text-[#C44D00]">
          <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E6E6E2] rounded-[20px] p-8 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] text-center space-y-6">
            <div className="flex justify-center">
              <img
                src="/brainwise-logo.png"
                alt="BrainWise"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-lg font-bold text-[#171717]">
                We ran into an unexpected view issue
              </h1>
              <p className="text-xs text-[#686864] leading-relaxed">
                The workspace encountered an interrupted render. Your Business Brain data is preserved.
                Click below to reload or recover the workspace session.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-[#FF7417] hover:bg-[#E55F08] text-white font-medium text-xs rounded-full shadow-xs cursor-pointer transition-colors"
              >
                Reload Workspace
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex-1 py-2.5 px-4 bg-[#FAFAF9] hover:bg-[#F0F0EE] border border-[#E6E6E2] text-[#242424] font-medium text-xs rounded-full cursor-pointer transition-colors"
              >
                Reset Session & Cache
              </button>
            </div>

            <details className="text-left bg-[#FAFAF9] border border-[#E6E6E2] rounded-[10px] p-3 text-[11px] text-[#686864] font-mono overflow-auto max-h-40">
              <summary className="cursor-pointer text-[#C44D00] font-semibold mb-1">
                Technical Diagnostics
              </summary>
              <p className="text-[#991B1B] font-semibold mb-1">{errorMessage}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="whitespace-pre-wrap text-[10px] text-[#858585]">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
