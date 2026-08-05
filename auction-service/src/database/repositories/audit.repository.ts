import { AuditLog, Prisma } from '@prisma/client';
import { BaseRepository, DbClient } from './base.repository';

export class AuditRepository extends BaseRepository<AuditLog, Prisma.AuditLogCreateInput, Prisma.AuditLogUpdateInput> {
  protected get modelName() {
    return 'auditLog';
  }

  constructor() {
    super('auditLog');
  }

  async createAuditLog(
    data: Omit<Prisma.AuditLogCreateInput, 'id' | 'createdAt'>,
    tx?: DbClient
  ): Promise<AuditLog> {
    const { ulid } = await import('ulidx');
    return this.create(
      {
        ...data,
        id: ulid(),
      },
      tx
    );
  }
}
