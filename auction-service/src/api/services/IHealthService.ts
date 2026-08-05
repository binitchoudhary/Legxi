export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
  dependencies: {
    database: 'ok' | 'down';
    redis: 'ok' | 'down';
  };
}

export interface IHealthService {
  checkHealth(): Promise<HealthStatus>;
}
