import { FastifyInstance } from 'fastify';
import { AuctionController } from '../controllers/AuctionController';
import { IAuctionService } from '../services/IAuctionService';
import { AuctionListQuerySchema, AuctionIdParamSchema } from '../dto/auction.dto';
import { RequestIdHeaderSchema } from '../dto/headers.dto';

import Redis from 'ioredis';
import { IBidService } from '../services/IBidService';

export default async function auctionRoutes(app: FastifyInstance, opts: { 
  auctionService: IAuctionService,
  bidService: IBidService,
  redisClient: Redis
}) {
  const controller = new AuctionController(opts.auctionService, opts.bidService, opts.redisClient);

  app.get('/', {
    schema: {
      headers: RequestIdHeaderSchema,
      querystring: AuctionListQuerySchema
    }
  }, controller.listAuctions.bind(controller));

  app.get('/:id', {
    schema: {
      headers: RequestIdHeaderSchema,
      params: AuctionIdParamSchema
    }
  }, controller.getAuction.bind(controller));

  app.get('/:id/snapshot', {
    schema: {
      headers: RequestIdHeaderSchema,
      params: AuctionIdParamSchema
    }
  }, controller.getSnapshot.bind(controller));
}
