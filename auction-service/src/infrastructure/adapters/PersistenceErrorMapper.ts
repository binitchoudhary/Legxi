import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, InfrastructureError } from '../../shared/errors';
import { ConcurrencyConflictError } from '../../application/exceptions/ApplicationErrors';

/**
 * PersistenceErrorMapper
 *
 * Pure exception translation component.
 * Catches Prisma-specific errors and translates them to domain-meaningful
 * errors from the shared error hierarchy.
 *
 * This component MUST NOT contain:
 * - Retry logic
 * - Logging
 * - Metrics
 * - Transaction management
 * - Business decisions
 */

/**
 * Wraps a persistence operation and translates any Prisma-specific errors
 * into domain errors. Non-Prisma errors pass through unchanged.
 */
export async function mapPersistenceError<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw translatePrismaError(error);
    }
    throw error;
  }
}

/**
 * Translates a known Prisma error code into the corresponding domain error.
 *
 * Prisma Error Code Reference:
 *   P2002 — Unique constraint violation
 *   P2025 — Record not found (update/delete on missing row)
 *   P2034 — Serialization failure (handled by transaction retry layer, re-thrown as-is)
 */
function translatePrismaError(error: Prisma.PrismaClientKnownRequestError): Error {
  switch (error.code) {
    case 'P2002': {
      const target = (error.meta?.target as string[])?.join(', ') ?? 'unknown field';
      return new ConflictError(`Unique constraint violation on: ${target}`);
    }
    case 'P2025': {
      return new NotFoundError('Record not found');
    }
    case 'P2034': {
      // Serialization failure. Mapped to ConcurrencyConflictError to trigger RetryExecutor.
      return new ConcurrencyConflictError('Serialization failure during optimistic update');
    }
    default: {
      return new InfrastructureError(
        `Database error [${error.code}]: ${error.message}`,
        error
      );
    }
  }
}
