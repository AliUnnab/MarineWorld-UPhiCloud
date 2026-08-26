import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { diagnostics } from "@/lib/services/clientDiagnosticsService";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    diagnostics.recordLog({
      level: "FATAL",
      category: "RENDER",
      message: error.message || "React component lifecycle failure",
      stack: error.stack,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas text-graphite flex items-center justify-center p-6 antialiased font-sans">
          <div className="max-w-xl w-full bg-white border border-line rounded-3xl p-8 sm:p-10 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-4">
              <AlertTriangle className="w-3.5 h-3.5" />
              SYSTEM RECOVERY INTERFACE
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-graphite tracking-tight mb-3">
              Application Workspace Interrupted
            </h1>

            <p className="text-stone text-sm sm:text-base leading-relaxed mb-6">
              An unexpected runtime error occurred while rendering the interface. Your session data remains safe, and the incident has been recorded in the local diagnostic ledger.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left overflow-x-auto text-xs font-mono text-slate-700 max-h-36">
                <strong>Error:</strong> {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-error-reload"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-royal text-white font-bold text-sm hover:bg-navy transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                id="btn-error-home"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-canvas border border-line text-graphite font-bold text-sm hover:bg-mist transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
