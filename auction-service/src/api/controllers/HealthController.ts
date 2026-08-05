import { FastifyRequest, FastifyReply } from 'fastify';
import { IHealthService } from '../services/IHealthService';

export class HealthController {
  constructor(private readonly healthService: IHealthService) {}

  async checkHealth(request: FastifyRequest, reply: FastifyReply) {
    const response = await this.healthService.checkHealth();
    
    const statusCode = response.status === 'ok' || response.status === 'degraded' ? 200 : 503;
    return reply.status(statusCode).send(response);
  }
}
