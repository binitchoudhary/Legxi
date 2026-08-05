import pino from 'pino';
import { loggerConfig, appConfig } from '../../config';

export const logger = pino({
  level: loggerConfig.level,
  transport:
    appConfig.env === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    env: appConfig.env,
  },
});

export const getChildLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};
