import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an unhandled error]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 text-rose-400">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  MarineWorld Application Notice
                </h1>
                <p className="text-sm text-slate-400">
                  An unexpected error occurred during page rendering.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                  Error Message
                </div>
                <div className="text-xs font-mono text-slate-300 break-words whitespace-pre-wrap">
                  {this.state.error.toString()}
                </div>
              </div>
            )}

            {this.state.errorInfo?.componentStack && (
              <details className="text-xs text-slate-400 cursor-pointer space-y-1">
                <summary className="font-semibold text-slate-300 hover:text-white transition">
                  View Component Stack Details
                </summary>
                <pre className="mt-2 p-3 bg-slate-950 rounded-lg overflow-x-auto font-mono text-[11px] text-slate-500 leading-relaxed">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
