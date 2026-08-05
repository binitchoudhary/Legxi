import { buildApp } from './app';
import { appConfig } from './config';
import { logger } from './shared/logger';
import { closeDatabase } from './database';
import { closeRedis } from './redis';
import { closeWorkers } from './workers';
// import { closeSockets } from './ws'; // WS will be implemented in Phase 2.6

const app = buildApp();

async function start() {
  try {
    await app.listen({ port: appConfig.port, host: appConfig.host });
    logger.info(`🚀 Server running on http://${appConfig.host}:${appConfig.port}`);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // 1. HTTP Server
    logger.info('Shutting down HTTP server...');
    await app.close();
    
    // 2. Socket.io (To be implemented)
    logger.info('Shutting down WebSockets...');
    if (app.io) {
      await new Promise<void>((resolve) => app.io.close(() => resolve()));
    }

    // 3. BullMQ
    logger.info('Shutting down BullMQ Workers...');
    await closeWorkers();

    // 4. Redis
    logger.info('Shutting down Redis...');
    await closeRedis();

    // 5. Prisma
    logger.info('Shutting down Prisma...');
    await closeDatabase();

    // 6. Logger
    logger.info('Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Unhandled Rejection');
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
  gracefulShutdown('uncaughtException');
});

start();
