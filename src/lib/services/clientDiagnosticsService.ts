/**
 * MarineWorld.City — Client Diagnostics & Resilience Engine
 * Captures, buffers, and persists operational client-side errors and warnings
 * without third-party vendor lock-in, enabling rapid debugging and telemetry.
 */

export interface DiagnosticLogEvent {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "FATAL";
  category: "NETWORK" | "AUTH" | "RENDER" | "ROUTING" | "SECURITY" | "PERFORMANCE";
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  url: string;
  userAgent: string;
}

const MAX_BUFFERED_LOGS = 100;
const STORAGE_KEY = "marineworld_diagnostic_logs_v1";

class ClientDiagnosticsService {
  private logs: DiagnosticLogEvent[] = [];
  private listeners: Set<(event: DiagnosticLogEvent) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.setupGlobalHandlers();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveToStorage() {
    try {
      const slice = this.logs.slice(-MAX_BUFFERED_LOGS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
    } catch {
      // Storage quota or disabled in private window
    }
  }

  private setupGlobalHandlers() {
    if (typeof window === "undefined") return;

    window.addEventListener("error", (event) => {
      this.recordLog({
        level: "ERROR",
        category: "RENDER",
        message: event.message || "Uncaught runtime exception",
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.recordLog({
        level: "ERROR",
        category: "NETWORK",
        message: event.reason?.message || String(event.reason) || "Unhandled Promise Rejection",
        stack: event.reason?.stack,
      });
    });
  }

  public recordLog(params: {
    level: "INFO" | "WARN" | "ERROR" | "FATAL";
    category: "NETWORK" | "AUTH" | "RENDER" | "ROUTING" | "SECURITY" | "PERFORMANCE";
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
  }) {
    const event: DiagnosticLogEvent = {
      id: `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level: params.level,
      category: params.category,
      message: params.message,
      stack: params.stack,
      context: params.context,
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "SSR",
    };

    this.logs.push(event);
    if (this.logs.length > MAX_BUFFERED_LOGS) {
      this.logs.shift();
    }
    this.saveToStorage();
    this.listeners.forEach((listener) => listener(event));

    if (params.level === "ERROR" || params.level === "FATAL") {
      console.error(`[MarineWorld Diagnostics - ${params.category}] ${params.message}`, params.context || "");
    }
  }

  public getRecentLogs(): DiagnosticLogEvent[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
  }

  public subscribe(callback: (event: DiagnosticLogEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const diagnostics = new ClientDiagnosticsService();
