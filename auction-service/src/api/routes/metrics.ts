import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { MetricsStore } from '../../infrastructure/telemetry/MetricsStore';

// Internal/Reverse-proxy middleware mockup
const requireInternalNetwork = async (req: FastifyRequest, res: FastifyReply) => {
  // Mock logic: checks if IP is from private subnet or bypass token is present
  // If not, throws 403 Forbidden
};

export const createMetricsRouter = (metricsStore: MetricsStore): FastifyPluginAsync => {
  return async (fastify, opts) => {
    
    fastify.addHook('preHandler', requireInternalNetwork);

    fastify.get('/metrics', async (req: FastifyRequest, res: FastifyReply) => {
      res.header('Content-Type', 'text/plain; version=0.0.4');
      res.send(metricsStore.getPrometheusMetrics());
    });
  };
};
