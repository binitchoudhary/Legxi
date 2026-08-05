import { ConcurrencyConflictError } from '../exceptions/ApplicationErrors';
import { logger } from '../../shared/logger';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxJitterMs?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Utility class for executing operations with a retry policy (exponential backoff + jitter).
 */
export class RetryExecutor {
  constructor(private readonly options: RetryOptions = {}) {}

  /**
   * Executes a given operation. If an error meets the retry condition (default: ConcurrencyConflictError),
   * retries the operation up to maxRetries times with random jitter backoff.
   */
  public async executeWithRetry<T>(
    operationName: string,
    context: Record<string, unknown>,
    operation: () => Promise<T>
  ): Promise<T> {
    const maxRetries = this.options.maxRetries ?? 3;
    const baseDelayMs = this.options.baseDelayMs ?? 50;
    const maxJitterMs = this.options.maxJitterMs ?? 150;
    const shouldRetry = this.options.shouldRetry ?? ((err: any) => err instanceof ConcurrencyConflictError);

    let attempt = 1;
    const startTime = performance.now();

    while (true) {
      try {
        const result = await operation();
        const durationMs = performance.now() - startTime;
        logger.info({ ...context, attempt, transaction_duration_ms: durationMs }, `${operationName} completed successfully.`);
        return result;
      } catch (error) {
        if (shouldRetry(error) && attempt <= maxRetries) {
          // Log retry observability payload
          logger.warn({
            ...context,
            attempt,
            conflictType: (error as any)?.code || (error as any)?.name || 'RetryableError'
          }, `Retryable error encountered during ${operationName}. Retrying...`);

          // Calculate backoff with jitter
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * maxJitterMs);
          await this.sleep(delay);

          attempt++;
        } else {
          // If max retries reached or it's a non-retryable error, rethrow
          if (shouldRetry(error)) {
            const durationMs = performance.now() - startTime;
            logger.error({
              ...context,
              attempt,
              conflictType: (error as any)?.code || (error as any)?.name || 'RetryableError',
              metric: 'retry_exhausted_count',
              transaction_duration_ms: durationMs
            }, `Max retries reached during ${operationName}. Operation failed.`);
          }
          throw error;
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
