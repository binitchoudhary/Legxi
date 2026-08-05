import { Bid, Prisma } from '@prisma/client';
import { BaseRepository, DbClient } from './base.repository';
import { ulid } from 'ulidx';

export class BidRepository extends BaseRepository<Bid, Prisma.BidCreateInput, Prisma.BidUpdateInput> {
  protected get modelName() {
    return 'bid';
  }

  constructor() {
    super('bid');
  }

  async createBid(
    data: Omit<Prisma.BidCreateInput, 'id' | 'createdAt'>,
    tx?: DbClient
  ): Promise<Bid> {
    return this.create(
      {
        ...data,
        id: ulid(),
      },
      tx
    );
  }
}
