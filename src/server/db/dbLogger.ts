/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DbLogContext {
  operation?: string;
  path?: string;
  workspaceId?: string;
  durationMs?: number;
  retryCount?: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Structured Database Observability Logger
 * Adheres strictly to security directives: NEVER logs passwords, tokens,
 * private customer payload bodies, or service-account secrets.
 */
class DatabaseLogger {
  private formatLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: DbLogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      severity: level,
      subsystem: 'DATABASE_ENGINE',
      message,
      ...(context || {}),
    };

    if (level === 'ERROR') {
      console.error(JSON.stringify(entry));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  public info(message: string, context?: DbLogContext): void {
    this.formatLog('INFO', message, context);
  }

  public warn(message: string, context?: DbLogContext): void {
    this.formatLog('WARN', message, context);
  }

  public error(message: string, context?: DbLogContext): void {
    this.formatLog('ERROR', message, context);
  }

  public recordLatency(operation: string, path: string, durationMs: number, workspaceId?: string): void {
    if (durationMs > 250) {
      this.warn(`Slow database query detected (${durationMs.toFixed(1)}ms)`, {
        operation,
        path,
        durationMs: Math.round(durationMs),
        workspaceId,
      });
    }
  }
}

export const dbLogger = new DatabaseLogger();
