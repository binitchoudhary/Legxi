import Redis from 'ioredis';
import { logger } from '../../shared/logger';

export interface RedisHealthStatus {
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  connectedClients?: string;
  usedMemory?: string;
  fragmentationRatio?: string;
  evictedKeys?: string;
  expiredKeys?: string;
  role?: string;
  connectedSlaves?: string;
  clusterEnabled?: string;
}

export class RedisHealthMonitor {
  constructor(private client: Redis) {}

  private extractInfoValue(info: string, key: string): string | undefined {
    const match = info.match(new RegExp(`^${key}:(.*)`, 'm'));
    return match ? match[1].trim() : undefined;
  }

  async checkHealth(): Promise<RedisHealthStatus> {
    try {
      const start = Date.now();
      const ping = await this.client.ping();
      const latencyMs = Date.now() - start;

      if (ping !== 'PONG') {
        throw new Error('Unexpected PING response');
      }

      const infoMemory = await this.client.info('memory');
      const infoClients = await this.client.info('clients');
      const infoStats = await this.client.info('stats');
      const infoReplication = await this.client.info('replication');
      const infoCluster = await this.client.info('cluster');

      return {
        status: latencyMs > 500 ? 'degraded' : 'ok',
        latencyMs,
        connectedClients: this.extractInfoValue(infoClients, 'connected_clients'),
        usedMemory: this.extractInfoValue(infoMemory, 'used_memory_human'),
        fragmentationRatio: this.extractInfoValue(infoMemory, 'mem_fragmentation_ratio'),
        evictedKeys: this.extractInfoValue(infoStats, 'evicted_keys'),
        expiredKeys: this.extractInfoValue(infoStats, 'expired_keys'),
        role: this.extractInfoValue(infoReplication, 'role'),
        connectedSlaves: this.extractInfoValue(infoReplication, 'connected_slaves'),
        clusterEnabled: this.extractInfoValue(infoCluster, 'cluster_enabled'),
      };
    } catch (error) {
      logger.error({ err: error }, 'Redis comprehensive health check failed');
      return { status: 'down' };
    }
  }
}
