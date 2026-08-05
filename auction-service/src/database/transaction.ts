import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './index';

export type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
export type DbClient = PrismaClient | TransactionClient;

const MAX_RETRIES = 3;

/**
 * Executes a callback within a serializable transaction.
 * Automatically retries if a serialization failure (40001) occurs.
 */
export async function withSerializableTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          return await callback(tx);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        }
      );
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2034 corresponds to a database serialization failure
        if (error.code === 'P2034' || (error.meta?.code === '40001')) {
          attempt++;
          if (attempt >= retries) throw error;
          await new Promise((res) => setTimeout(res, Math.random() * 100 * attempt));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('Transaction failed after max retries');
}

/**
 * Optimistic Locking Helper
 * Validates version and increments it in the update payload.
 */
export function optimisticUpdate(currentVersion: number): { version: number } {
  return { version: currentVersion + 1 };
}

/**
 * Optimistic Locking Condition Helper
 * Adds version condition to the where clause.
 */
export function optimisticCondition(id: string, currentVersion: number) {
  return { id, version: currentVersion };
}
