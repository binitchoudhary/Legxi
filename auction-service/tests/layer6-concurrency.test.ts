import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaAuctionTransactionAdapter } from '../src/infrastructure/adapters/PrismaAuctionTransactionAdapter';
import { BidAmount } from '../src/domain/value-objects/BidAmount';
import { AuctionEngine } from '../src/domain/engine/AuctionEngine';
import { IncrementPolicy } from '../src/domain/policies/IncrementPolicy';
import { BidValidationPolicy } from '../src/domain/policies/BidValidationPolicy';
import { AuctionStatePolicy } from '../src/domain/policies/AuctionStatePolicy';
import { ReservePricePolicy } from '../src/domain/policies/ReservePricePolicy';
import { AuctionExtensionPolicy } from '../src/domain/policies/AuctionExtensionPolicy';
import { AuctionClosingPolicy } from '../src/domain/policies/AuctionClosingPolicy';
import { WinnerDeterminationPolicy } from '../src/domain/policies/WinnerDeterminationPolicy';
import { Bid } from '../src/domain/models/Bid';
import { BidIntent } from '../src/domain/models/BidIntent';
import { AntiSnipingConfig } from '../src/domain/config/AntiSnipingConfig';
import { ulid } from 'ulidx';
import { v4 as uuid } from 'uuid';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let pool: Pool;
let prisma: PrismaClient;
let adapter: PrismaAuctionTransactionAdapter;
let engine: AuctionEngine;

const antiSnipingConfig: AntiSnipingConfig = {
  triggerWindowMs: 60_000,
  extensionDurationMs: 60_000,
  maxExtensions: 50
};

beforeAll(async () => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/legxi_auction';
  pool = new Pool({ connectionString });
  const pgAdapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter: pgAdapter });
  adapter = new PrismaAuctionTransactionAdapter();
  engine = new AuctionEngine(
    new IncrementPolicy(),
    new BidValidationPolicy(),
    new AuctionStatePolicy(),
    new ReservePricePolicy(),
    new AuctionExtensionPolicy(),
    new AuctionClosingPolicy(),
    new WinnerDeterminationPolicy()
  );
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

async function createLiveAuction(id: string, startingPricePaise: bigint, minIncrementPaise: bigint): Promise<void> {
  const now = new Date();
  await prisma.auction.create({
    data: {
      id,
      shopifyProductId: `gid://shopify/Product/TEST-${id}`,
      startTime: new Date(now.getTime() - 3600_000),
      endTime: new Date(now.getTime() + 3600_000),
      status: 'LIVE',
      startingPricePaise,
      minIncrementPaise,
      currentPricePaise: startingPricePaise,
      version: 1,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });
}

async function cleanupAuction(auctionId: string): Promise<void> {
  await prisma.$executeRawUnsafe(`DELETE FROM outbox_events WHERE payload::text LIKE '%${auctionId}%'`);
  await prisma.bidIntent.deleteMany({ where: { auctionId } });
  
  // Clear winningBidId to avoid foreign key violation when deleting bids
  await prisma.auction.updateMany({ 
    where: { id: auctionId }, 
    data: { winningBidId: null } 
  });
  
  await prisma.settlement.deleteMany({ where: { auctionId } });
  await prisma.auction.updateMany({ where: { id: auctionId }, data: { winningBidId: null } });
  await prisma.payment.deleteMany({ where: { auctionId } });
  await prisma.bidIntent.deleteMany({ where: { auctionId } });
  await prisma.bid.deleteMany({ where: { auctionId } });
  await prisma.auction.deleteMany({ where: { id: auctionId } });
}

describe('Layer 6 - Admin vs Bid Concurrency', () => {
  const AUCTION_ID_1 = '01TESTCONCURRENCY000000001';
  const AUCTION_ID_2 = '01TESTCONCURRENCY000000002';
  const STARTING_PRICE = 10000n;
  const MIN_INCREMENT = 500n;

  beforeEach(async () => {
    await cleanupAuction(AUCTION_ID_1);
    await cleanupAuction(AUCTION_ID_2);
    await createLiveAuction(AUCTION_ID_1, STARTING_PRICE, MIN_INCREMENT);
    await createLiveAuction(AUCTION_ID_2, STARTING_PRICE, MIN_INCREMENT);
  });

  afterAll(async () => {
    await cleanupAuction(AUCTION_ID_1);
    await cleanupAuction(AUCTION_ID_2);
  });

  it('Test A — Bid starts first, Admin force-close waits', async () => {
    const currentTime = new Date();
    let order: string[] = [];
    
    // Signals
    let bidLockAcquired: () => void;
    const bidLockAcquiredPromise = new Promise<void>(resolve => { bidLockAcquired = resolve; });


    // Promise 1: Bid (acquires lock first, holds it artificially)
    const bidPromise = adapter.executeWithLock(AUCTION_ID_1, async (auction, txContext) => {
      order.push('BID_ACQUIRED_LOCK');
      bidLockAcquired!(); // Signal that bid has the lock
      
      // Artificial delay to ensure Admin reaches the FOR UPDATE lock and WAITS
      await sleep(200);

      const bidAmount = new BidAmount((STARTING_PRICE + MIN_INCREMENT).toString());
      const bidId = ulid();
      const intentId = uuid();
      const bid = new Bid(bidId, AUCTION_ID_1, 'user-bidder', bidAmount, false, currentTime);
      const intent = new BidIntent(intentId, AUCTION_ID_1, 'user-bidder', bidAmount, bidId, currentTime);
      
      const evalResult = engine.evaluateBid(auction, bid, currentTime, antiSnipingConfig);
      await txContext.persistBid(evalResult.updatedAuction, bid, intent);
      await txContext.updateAuction(evalResult.updatedAuction);
      console.log('BID_COMMITTING. currentPrice in DB should be:', evalResult.updatedAuction.getCurrentPrice().toString());
      order.push('BID_COMMITTING');
    });

    // Start Admin force-close only AFTER Bid has acquired the lock
    await bidLockAcquiredPromise;
    // Tiny sleep to ensure Admin hits the lock before Bid finishes sleeping
    await sleep(20);

    // Promise 2: Admin force-close (will block at FOR UPDATE until Bid completes)
    const adminPromise = adapter.executeWithLock(AUCTION_ID_1, async (auction, txContext) => {
      order.push('ADMIN_ACQUIRED_LOCK'); // This should only happen AFTER BID_COMMITTING

      console.log('ADMIN_ACQUIRED_LOCK. Read currentPrice:', auction.getCurrentPrice().toString());
      // Critical concurrency assertion: after Bid committed and released the lock,
      // Admin's SELECT ... FOR UPDATE (ReadCommitted) must return the committed row.
      // The hydrated Auction domain object must reflect the updated currentPricePaise.
      expect(auction.getCurrentPrice().toString()).toBe((STARTING_PRICE + MIN_INCREMENT).toString());

      // Force close
      const closedAuction = auction.withExtendedEndTime(currentTime).withStatus('ENDED');
      await txContext.updateAuction(closedAuction);
      await txContext.logAudit({
        action: 'ADMIN_FORCE_CLOSE',
        actorId: 'admin_123',
        details: { newStatus: 'ENDED' }
      });

      order.push('ADMIN_COMMITTING');
    });

    await Promise.all([bidPromise, adminPromise]);

    // Verify ordering
    expect(order).toEqual(['BID_ACQUIRED_LOCK', 'BID_COMMITTING', 'ADMIN_ACQUIRED_LOCK', 'ADMIN_COMMITTING']);

    // Verify final state
    const finalAuction = await prisma.auction.findUnique({ where: { id: AUCTION_ID_1 } });
    expect(finalAuction!.status).toBe('ENDED');
    expect(finalAuction!.version).toBe(4); // Base 1 -> Bid 2 -> Admin (withExtendedEndTime 3 -> withStatus 4)
    expect(finalAuction!.currentPricePaise).toBe(STARTING_PRICE + MIN_INCREMENT); // Bid succeeded before close

    // Verify Outbox audit record exists and is exactly 1 for admin
    const outboxRecords = await prisma.outboxEvent.findMany();
    const auditRecords = outboxRecords.filter(r => r.eventType === 'AUDIT_LOG_ENTRY' && JSON.stringify(r.payload).includes('ADMIN_FORCE_CLOSE') && JSON.stringify(r.payload).includes(AUCTION_ID_1));
    expect(auditRecords.length).toBe(1);
  });

  it('Test B — Admin force-close starts first, Bid waits and is rejected', async () => {
    const currentTime = new Date();
    let order: string[] = [];

    // Signals
    let adminLockAcquired: () => void;
    const adminLockAcquiredPromise = new Promise<void>(resolve => { adminLockAcquired = resolve; });

    // Promise 1: Admin force-close (acquires lock first, holds it)
    const adminPromise = adapter.executeWithLock(AUCTION_ID_2, async (auction, txContext) => {
      order.push('ADMIN_ACQUIRED_LOCK');
      adminLockAcquired!();
      
      // Artificial delay to ensure Bid reaches FOR UPDATE lock and WAITS
      await sleep(200);

      const closedAuction = auction.withExtendedEndTime(currentTime).withStatus('ENDED');
      await txContext.updateAuction(closedAuction);
      await txContext.logAudit({
        action: 'ADMIN_FORCE_CLOSE',
        actorId: 'admin_123',
        details: { newStatus: 'ENDED' }
      });

      order.push('ADMIN_COMMITTING');
    });

    await adminLockAcquiredPromise;
    await sleep(20);

    // Promise 2: Bid attempts concurrently
    let bidRejected = false;
    const bidPromise = adapter.executeWithLock(AUCTION_ID_2, async (auction, txContext) => {
      order.push('BID_ACQUIRED_LOCK'); // Will happen after Admin commits
      
      // By the time bid acquires lock, auction is ENDED
      expect(auction.getStatus().getValue()).toBe('ENDED');

      const bidAmount = new BidAmount((STARTING_PRICE + MIN_INCREMENT).toString());
      const bidId = ulid();
      const intentId = uuid();
      const bid = new Bid(bidId, AUCTION_ID_2, 'user-bidder', bidAmount, false, currentTime);
      const intent = new BidIntent(intentId, AUCTION_ID_2, 'user-bidder', bidAmount, bidId, currentTime);
      
      // This will throw DomainError (AuctionNotActiveError)
      engine.evaluateBid(auction, bid, currentTime, antiSnipingConfig);
    }).catch(err => {
      order.push('BID_REJECTED');
      bidRejected = true;
      expect(err.code).toBe('AUCTION_NOT_ACTIVE');
    });

    await Promise.all([adminPromise, bidPromise]);

    // Verify ordering
    expect(order).toEqual(['ADMIN_ACQUIRED_LOCK', 'ADMIN_COMMITTING', 'BID_ACQUIRED_LOCK', 'BID_REJECTED']);
    expect(bidRejected).toBe(true);

    // Verify final state
    const finalAuction = await prisma.auction.findUnique({ where: { id: AUCTION_ID_2 } });
    expect(finalAuction!.status).toBe('ENDED');
    expect(finalAuction!.version).toBe(3); // Base 1 -> Admin 3
    expect(finalAuction!.currentPricePaise).toBe(STARTING_PRICE); // Bid was rejected, price didn't change

    // Verify Outbox audit record exists
    const outboxRecords = await prisma.outboxEvent.findMany();
    const auditRecords = outboxRecords.filter(r => r.eventType === 'AUDIT_LOG_ENTRY' && JSON.stringify(r.payload).includes('ADMIN_FORCE_CLOSE') && JSON.stringify(r.payload).includes(AUCTION_ID_2));
    expect(auditRecords.length).toBe(1);

    // Verify no bids created
    const bids = await prisma.bid.findMany({ where: { auctionId: AUCTION_ID_2 } });
    expect(bids.length).toBe(0);
  });
});
