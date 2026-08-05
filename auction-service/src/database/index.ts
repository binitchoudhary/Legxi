import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from '../shared/logger';
import { InfrastructureError } from '../shared/errors';

// Global singleton to prevent multiple instances in dev hot-reloads
declare global {
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = global.prisma || new PrismaClient({ 
  adapter,
  log: [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error']
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
  // @ts-ignore
  prisma.$on('query', (e: any) => {
    logger.info(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  });
}

export async function checkDatabaseHealth(): Promise<{ status: string; connected: boolean; }> {
  try {
    // Verify connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Attempt to verify migration status if migrations table exists
    // (In production, a dedicated startup script usually checks this)
    try {
      await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 1`;
    } catch {
      logger.warn('Prisma migrations table not found or inaccessible during health check');
    }

    return { status: 'healthy', connected: true };
  } catch (error) {
    logger.error({ err: error }, 'Database health check failed');
    return { status: 'unhealthy', connected: false };
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected gracefully');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting database');
    throw new InfrastructureError('Failed to disconnect database');
  }
}
