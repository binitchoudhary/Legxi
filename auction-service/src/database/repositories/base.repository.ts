import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../index';

export type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
export type DbClient = PrismaClient | TransactionClient;

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected constructor(protected readonly model: string) {}

  protected getClient(tx?: DbClient): Record<string, unknown> {
    const target = tx ? (tx as unknown as Record<string, unknown>) : (prisma as unknown as Record<string, unknown>);
    return target[this.modelName] as Record<string, unknown>;
  }

  protected abstract get modelName(): string;

  async findById(id: string, tx?: DbClient): Promise<T | null> {
    const client = this.getClient(tx);
    return (client as { findUnique: (args: unknown) => Promise<T | null> }).findUnique({ where: { id } });
  }

  async create(data: CreateInput, tx?: DbClient): Promise<T> {
    const client = this.getClient(tx);
    return (client as { create: (args: unknown) => Promise<T> }).create({ data });
  }

  async update(id: string, data: UpdateInput, tx?: DbClient): Promise<T> {
    const client = this.getClient(tx);
    return (client as { update: (args: unknown) => Promise<T> }).update({ where: { id }, data });
  }

  async delete(id: string, tx?: DbClient): Promise<T> {
    const client = this.getClient(tx);
    return (client as { delete: (args: unknown) => Promise<T> }).delete({ where: { id } });
  }

  async findMany(where: any = {}, orderBy: any = {}, limit: number = 10, cursor?: string, tx?: DbClient): Promise<T[]> {
    const client = this.getClient(tx);
    const args: any = {
      where,
      orderBy,
      take: limit,
    };
    if (cursor) {
      args.cursor = { id: cursor };
      args.skip = 1;
    }
    return (client as { findMany: (args: unknown) => Promise<T[]> }).findMany(args);
  }
}
