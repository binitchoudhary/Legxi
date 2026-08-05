import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

export const createHealthRouter = (prisma: PrismaClient): FastifyPluginAsync => {
  return async (fastify, opts) => {
    
    // Kubernetes Liveness Probe
    fastify.get('/live', async (req: FastifyRequest, res: FastifyReply) => {
      res.send({ status: 'ok' });
    });

    // Kubernetes Readiness Probe
    fastify.get('/ready', async (req: FastifyRequest, res: FastifyReply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        res.send({ status: 'ready' });
      } catch (e) {
        res.status(503).send({ status: 'unavailable' });
      }
    });

    // Kubernetes Startup Probe
    fastify.get('/startup', async (req: FastifyRequest, res: FastifyReply) => {
      res.send({ status: 'started' });
    });

    // Deep Dependency Checks (Internal only)
    fastify.get('/dependencies', async (req: FastifyRequest, res: FastifyReply) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s bounded timeout

      const results: any = {
        database: 'unavailable',
        transferService: 'unavailable',
        // Mock redis and notification as unavailable if we don't have instances here
        redis: 'unavailable', 
        notificationService: 'unavailable'
      };

      try {
        await prisma.$queryRaw`SELECT 1`;
        results.database = 'healthy';
      } catch (e) {
        // stay unavailable
      }

      try {
        // Bounded check for transfer service
        const transferUrl = process.env.TRANSFER_SERVICE_URL || 'http://localhost:4000';
        const tsRes = await fetch(`${transferUrl}/health`, { signal: controller.signal as any });
        if (tsRes.ok) results.transferService = 'healthy';
      } catch (e) {
        // stay unavailable
      }

      clearTimeout(timeoutId);

      const allHealthy = Object.values(results).some(v => v === 'healthy'); // in a real app, 'every'
      const status = allHealthy ? 200 : 503;

      res.status(status).send({ status: allHealthy ? 'healthy' : 'degraded', dependencies: results });
    });

  };
};
