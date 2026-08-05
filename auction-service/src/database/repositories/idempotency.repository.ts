import { IdempotencyKey, Prisma } from '@prisma/client';
import { BaseRepository, DbClient } from './base.repository';

export class IdempotencyRepository extends BaseRepository<IdempotencyKey, Prisma.IdempotencyKeyCreateInput, Prisma.IdempotencyKeyUpdateInput> {
  protected get modelName() {
    return 'idempotencyKey';
  }

  constructor() {
    super('idempotencyKey');
  }

  async checkIdempotency(key: string, tx?: DbClient): Promise<IdempotencyKey | null> {
    return this.findById(key, tx);
  }

  async saveIdempotency(
    key: string,
    requestPayload: unknown,
    responseStatus: number,
    responseBody: unknown,
    tx?: DbClient
  ): Promise<IdempotencyKey> {
    return this.create(
      {
        key,
        requestPayload: requestPayload ? (requestPayload as Prisma.InputJsonValue) : Prisma.JsonNull,
        responseStatus,
        responseBody: responseBody ? (responseBody as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      tx
    );
  }
}
