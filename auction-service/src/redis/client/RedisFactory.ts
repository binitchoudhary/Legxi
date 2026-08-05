import Redis, { RedisOptions, ClusterOptions, Cluster } from 'ioredis';
import { redisConfig } from '../../config';
import { logger } from '../../shared/logger';

export enum RedisTopology {
  STANDALONE = 'STANDALONE',
  SENTINEL = 'SENTINEL',
  CLUSTER = 'CLUSTER',
}

export class RedisFactory {
  /**
   * Creates a Redis client matching the specified topology and configuration.
   */
  static createClient(topology: RedisTopology = RedisTopology.STANDALONE, name: string = 'default'): Redis | Cluster {
    const commonOptions: RedisOptions = {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 100, 3000); // Exponential backoff up to 3s
      },
      reconnectOnError(err) {
        if (err.message.includes('READONLY')) return true;
        return false;
      },
      connectionName: name,
    };

    let client: Redis | Cluster;

    if (topology === RedisTopology.CLUSTER) {
      const clusterNodes = [{ host: new URL(redisConfig.url).hostname, port: Number(new URL(redisConfig.url).port) }];
      const clusterOptions: ClusterOptions = {
        redisOptions: commonOptions,
        clusterRetryStrategy(times) {
          return Math.min(times * 100, 3000);
        },
      };
      client = new Redis.Cluster(clusterNodes, clusterOptions);
    } else if (topology === RedisTopology.SENTINEL) {
      const sentinelOptions: RedisOptions = {
        ...commonOptions,
        sentinels: [{ host: new URL(redisConfig.url).hostname, port: Number(new URL(redisConfig.url).port) }],
        name: 'mymaster',
      };
      client = new Redis(sentinelOptions);
    } else {
      client = new Redis(redisConfig.url, commonOptions);
    }

    client.on('connect', () => logger.info({ clientName: name, topology }, 'Redis client connected'));
    client.on('error', (err) => logger.error({ err, clientName: name }, 'Redis client connection error'));
    client.on('close', () => logger.warn({ clientName: name }, 'Redis client connection closed'));

    return client;
  }
}
