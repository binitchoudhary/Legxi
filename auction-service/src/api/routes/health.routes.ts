import { FastifyInstance } from 'fastify';
import { HealthController } from '../controllers/HealthController';
import { IHealthService } from '../services/IHealthService';

export default async function healthRoutes(app: FastifyInstance, opts: { healthService: IHealthService }) {
  const controller = new HealthController(opts.healthService);

  app.get('/', controller.checkHealth.bind(controller));
}
