import { Payment, Prisma } from '@prisma/client';
import { BaseRepository, DbClient } from './base.repository';
import { ulid } from 'ulidx';

export class DepositRepository extends BaseRepository<Payment, Prisma.PaymentCreateInput, Prisma.PaymentUpdateInput> {
  protected get modelName() {
    return 'payment';
  }

  constructor() {
    super('payment');
  }

  async createDeposit(
    data: Omit<Prisma.PaymentCreateInput, 'id'>,
    tx?: DbClient
  ): Promise<Payment> {
    return this.create(
      {
        ...data,
        id: ulid(),
      },
      tx
    );
  }
}
