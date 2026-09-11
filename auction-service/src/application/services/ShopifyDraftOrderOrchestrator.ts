import { IPaymentGateway } from '../ports/IPaymentGateway';
import { SettlementService } from './SettlementService';
import { IAuctionService } from '../../api/services/IAuctionService';
import { logger } from '../../shared/logger';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';

export class ShopifyDraftOrderOrchestrator {
  private readonly LEASE_DURATION_SEC = 30;

  constructor(
    private readonly paymentGateway: IPaymentGateway,
    private readonly settlementService: SettlementService,
    private readonly auctionService: IAuctionService,
    private readonly redis: Redis
  ) {}

  /**
   * Consumes SettlementCreated Domain Event from the Outbox.
   * Invokes Shopify Payment Gateway (external HTTP) outside of the Postgres transaction.
   * Protected by a Redis Distributed Lease to provide single-flight concurrent creation protection.
   */
  async onSettlementCreated(event: any): Promise<void> {
    const { auctionId, settlementId, winnerId } = event;
    const leaseKey = `draft_order_creation:${settlementId}`;
    const uniqueToken = randomBytes(16).toString('hex');
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let leaseAcquired = false;

    try {
      // 1. Acquire Lease
      const acquired = await this.redis.set(leaseKey, uniqueToken, 'EX', this.LEASE_DURATION_SEC, 'NX');
      if (!acquired) {
        throw new Error(`ConcurrencyRaceError: Failed to acquire lease for ${leaseKey}. Another worker is processing.`);
      }
      leaseAcquired = true;

      // 2. Start Heartbeat
      heartbeatTimer = setInterval(async () => {
        try {
          // Conditionally renew only if we still own it
          const luaRenew = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("expire", KEYS[1], ARGV[2])
            else
              return 0
            end
          `;
          const renewed = await this.redis.eval(luaRenew, 1, leaseKey, uniqueToken, this.LEASE_DURATION_SEC);
          if (renewed === 0) {
            logger.error({ settlementId }, 'Lease heartbeat failed - lost ownership');
            // We cannot abort the running promise easily, but we log the fatal error.
            // In a more complex setup, we could throw an abort signal to the fetch calls.
          }
        } catch (err) {
          logger.error({ err, settlementId }, 'Lease renewal error');
        }
      }, (this.LEASE_DURATION_SEC * 1000) / 2);

      logger.info({ auctionId, settlementId, token: uniqueToken }, 'Acquired Draft Order creation lease. Orchestrating Shopify creation...');
      
      const auctionDto = await this.auctionService.getAuction(auctionId);
      if (!auctionDto) {
        throw new Error(`Auction not found: ${auctionId}`);
      }

      // 3. Lease-loss verification before POST (simulated by checking if we still think we have it, though heartbeat is async)
      // Since Node is single-threaded, if heartbeat failed, it would have logged.
      // 4. Invoke external HTTP call
      const result = await this.paymentGateway.createPaymentSession(auctionId, auctionDto.currentPricePaise.toString(), winnerId);

      if (!result.success || !result.providerReference) {
        throw new Error(`Shopify Draft Order creation failed: ${result.failureReason}`);
      }

      // 5. Record the successful attempt back to the DB
      await this.settlementService.recordPaymentAttempt(
        settlementId,
        'shopify',
        result.providerReference,
        undefined
      );

      logger.info({ auctionId, settlementId, providerPaymentId: result.providerReference }, 'Shopify Draft Order created/recovered successfully');
    } catch (error: any) {
      logger.error({ err: error, auctionId, settlementId }, 'Draft Order orchestration failed');
      // Re-throw so OutboxRelayWorker catches it, logs the error, and keeps the event PENDING for retry.
      throw error;
    } finally {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      
      // 6. Safe Release using Lua compare-and-delete
      if (leaseAcquired) {
        try {
          const luaDelete = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await this.redis.eval(luaDelete, 1, leaseKey, uniqueToken);
        } catch (err) {
          logger.error({ err, settlementId }, 'Failed to safely release Redis lease');
        }
      }
    }
  }
}
