import pino from 'pino';
import { ENV } from '../config/env.js';

// Setup log rotation to store logs in local directory and rotate daily.
const transport = pino.transport({
  targets: [
    {
      level: 'debug',
      target: 'pino-roll',
      options: {
        file: './logs/partial_payment',
        frequency: 'daily',
        extension: '.log',
        mkdir: true,
        dateFormat: 'yyyy-MM-dd'
      }
    },
    // We can also log to stdout for Docker
    {
      level: 'debug',
      target: 'pino/file',
      options: {
        destination: 1 // stdout
      }
    }
  ]
});

// If in development mode and not DRY_RUN, we might want pino-pretty, but we stick to structured JSON everywhere as requested.
export const logger = pino({
  level: ENV.NODE_ENV === 'development' ? 'debug' : 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
}, transport);

// Helper function to create a child logger with requestId
export function getLogger(reqId) {
  if (!reqId) return logger;
  return logger.child({ requestId: reqId });
}
