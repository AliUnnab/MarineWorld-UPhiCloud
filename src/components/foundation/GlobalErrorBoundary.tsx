import { Component, type ErrorInfo, type ReactNode } from "react";
import { diagnostics } from "@/lib/services/clientDiagnosticsService";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      diagnostics.recordLog({
        level: "WARN",
        category: "RENDER",
        message: error?.message || "Render issue recovered",
        stack: error?.stack,
        context: {
          componentStack: errorInfo?.componentStack,
        },
      });
    } catch {
      // silent
    }
  }

  public render() {
    return this.props.children;
  }
}
