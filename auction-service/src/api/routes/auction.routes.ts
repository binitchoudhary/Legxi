import { FastifyInstance } from 'fastify';
import { AuctionController } from '../controllers/AuctionController';
import { IAuctionService } from '../services/IAuctionService';
import { AuctionListQuerySchema, AuctionIdParamSchema } from '../dto/auction.dto';
import { RequestIdHeaderSchema } from '../dto/headers.dto';

export default async function auctionRoutes(app: FastifyInstance, opts: { auctionService: IAuctionService }) {
  const controller = new AuctionController(opts.auctionService);

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
}
