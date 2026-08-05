import { IHealthService, HealthStatus } from '../../api/services/IHealthService';
import { checkDatabaseHealth } from '../../database';
import { checkRedisHealth } from '../../redis';

export class HealthService implements IHealthService {
  async checkHealth(): Promise<HealthStatus> {
    const dbOk = await checkDatabaseHealth();
    const redisOk = await checkRedisHealth();

    const isFullyOk = dbOk && redisOk;
    const isDown = !dbOk && !redisOk;

    let status: 'ok' | 'degraded' | 'down' = 'ok';
    if (isDown) status = 'down';
    else if (!isFullyOk) status = 'degraded';

    return {
      status,
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbOk ? 'ok' : 'down',
        redis: redisOk ? 'ok' : 'down',
      }
    };
  }
}
