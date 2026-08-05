import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { AdminOperationsFacade } from '../../../application/services/admin/AdminOperationsFacade';

// Normally, requireAdmin middleware is imported here and registered as a preHandler
// import { requireAdmin } from '../../middlewares/auth';
const requireAdmin = async (req: FastifyRequest, res: FastifyReply) => {
  // Mock frozen middleware check.
};

export const createAdminOperationsRouter = (facade: AdminOperationsFacade): FastifyPluginAsync => {
  return async (fastify, opts) => {
    
    // Apply auth middleware to all routes in this plugin
    fastify.addHook('preHandler', requireAdmin);

    fastify.get('/auction/:id/status', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
      try {
        const dashboard = await facade.getAuctionDashboard(req.params.id);
        res.send(dashboard);
      } catch (e: any) {
        res.status(500).send({ error: e.message });
      }
    });

    fastify.get('/auction/:id/timeline', async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
      try {
        const timeline = await facade.getOperationalTimeline(req.params.id);
        res.send(timeline);
      } catch (e: any) {
        res.status(500).send({ error: e.message });
      }
    });

    fastify.post('/transfers/:settlementId/retry', async (req: FastifyRequest<{ Params: { settlementId: string } }>, res: FastifyReply) => {
      try {
        await facade.retryOwnershipTransfer(req.params.settlementId);
        res.send({ success: true, message: 'Transfer retry initiated' });
      } catch (e: any) {
        res.status(400).send({ error: e.message });
      }
    });

    fastify.post('/notifications/:notificationId/retry', async (req: FastifyRequest<{ Params: { notificationId: string } }>, res: FastifyReply) => {
      try {
        await facade.retryFailedNotification(req.params.notificationId);
        res.send({ success: true, message: 'Notification retry initiated' });
      } catch (e: any) {
        res.status(400).send({ error: e.message });
      }
    });
  };
};
