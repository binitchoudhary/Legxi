/**
 * LEGXI Structured Logger
 *
 * All renderer output goes through this logger with unique LEGXI codes.
 * This enables searchable observability across production logs.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  code: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

// Singleton log buffer for testing and production drain
const logBuffer: LogEntry[] = [];

function emit(level: LogLevel, code: string, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    code,
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  logBuffer.push(entry);

  // Output to console based on environment
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEBUG_LOGGING === 'true') {
    const prefix = `[LEGXI ${code}]`;
    switch (level) {
      case 'info':
        // info logs suppressed in production
        break;
      case 'warn':
        console.warn(prefix, message, context ?? '');
        break;
      case 'error':
        console.error(prefix, message, context ?? '');
        break;
    }
  }
}

export const logger = {
  info: (code: string, message: string, context?: Record<string, unknown>) =>
    emit('info', code, message, context),

  warn: (code: string, message: string, context?: Record<string, unknown>) =>
    emit('warn', code, message, context),

  error: (code: string, message: string, context?: Record<string, unknown>) =>
    emit('error', code, message, context),

  /** Returns a copy of the log buffer. Useful for tests. */
  getBuffer: (): readonly LogEntry[] => [...logBuffer],

  /** Clears the log buffer. Useful for test teardown. */
  clearBuffer: (): void => {
    logBuffer.length = 0;
  },
};

// ─────────────────────────────────────────────
// Observability Code Reference
// ─────────────────────────────────────────────
// W-1001  Registry key miss, fallback used
// W-1002  Unsupported module attached to layout (manifest check)
// W-1003  Unknown media type, placeholder shown
// W-1004  Module skipped — empty data
// W-1005  Registry version miss, fallback to latest
//
// E-2001  Validation: missing schema_version
// E-2002  Validation: missing layout key
// E-2003  Validation: invalid role hierarchy
// E-2004  Validation: required configuration domain missing
//
// E-3001  WebSocket: connection failed
// E-3002  WebSocket: reconnection failed after max retries
//
// E-4001  Bid: submission failed
// E-4002  Bid: outbid during submission
// E-4003  Bid: authentication required
//
// E-5001  Hydration: React mismatch
//
// I-6001  Renderer: page rendered successfully
// I-6002  Renderer: module skipped (empty data)
// I-6003  Renderer: layout manifest compatibility validated
