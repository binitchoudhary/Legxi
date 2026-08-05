import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsQueryService } from '../../../application/services/analytics/AnalyticsQueryService';

// Mock frozen middleware check.
const requireAdmin = async (req: FastifyRequest, res: FastifyReply) => {
  // Middleware logic here
};

export const createAnalyticsRouter = (service: AnalyticsQueryService): FastifyPluginAsync => {
  return async (fastify, opts) => {
    
    // Apply auth middleware to all routes in this plugin
    fastify.addHook('preHandler', requireAdmin);

    fastify.get('/overview', async (req: FastifyRequest, res: FastifyReply) => {
      try {
        const dashboard = await service.getOverviewDashboard();
        res.send(dashboard);
      } catch (e: any) {
        res.status(500).send({ error: e.message });
      }
    });

  };
};
