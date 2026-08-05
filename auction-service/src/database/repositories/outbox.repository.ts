import { OutboxEvent, Prisma } from '@prisma/client';
import { BaseRepository, DbClient } from './base.repository';
import { ulid } from 'ulidx';

export class OutboxRepository extends BaseRepository<OutboxEvent, Prisma.OutboxEventCreateInput, Prisma.OutboxEventUpdateInput> {
  protected get modelName() {
    return 'outboxEvent';
  }

  constructor() {
    super('outboxEvent');
  }

  /**
   * Appends an event to the outbox table for reliable background processing.
   * This MUST be called within the same transaction as the business state change.
   */
  async appendEvent(
    eventType: string,
    payload: unknown,
    tx: DbClient
  ): Promise<OutboxEvent> {
    return this.create(
      {
        id: ulid(),
        eventType,
        payload: payload ? (payload as Prisma.InputJsonValue) : Prisma.JsonNull,
        status: 'PENDING',
      },
      tx
    );
  }
}
