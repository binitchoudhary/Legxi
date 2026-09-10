import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Layer 2 — Local Auction Verification Fixtures
 * 
 * 10 deterministic seed scenarios covering the 9 ADR-002 AuctionStatus states
 * and key auction conditions (reserve price, idempotency, anti-sniping).
 * 
 * All shopifyProductIds use LOCAL-TEST-* prefixes to prevent any
 * interaction with production Shopify data.
 * 
 * Time offsets are relative to `now` to ensure correct lifecycle evaluation
 * by the server-authoritative time engine.
 */
async function main() {
  const now = new Date();
  const HOUR = 3600_000;
  const MIN = 60_000;

  // ── Cleanup existing local test data ──
  await prisma.bidIntent.deleteMany({ where: { auctionId: { startsWith: '01SEED' } } });
  // Delete bids referencing these auctions (need to clear winning_bid_id first)
  const seedAuctionIds = [
    '01SEEDSCHEDULED000000001',
    '01SEEDPREPARING000000002',
    '01SEEDLIVE00000000000003',
    '01SEEDLIVEBIDS0000000004',
    '01SEEDEXTENDED0000000005',
    '01SEEDENDING00000000006A',
    '01SEEDENDEDSOLD000000007',
    '01SEEDENDEDUNSOLD0000008',
    '01SEEDRESERVE0000000009A',
    '01SEEDIDEMPOTNCY000000AA',
  ];

  for (const id of seedAuctionIds) {
    await prisma.auction.updateMany({ where: { id }, data: { winningBidId: null } });
  }
  await prisma.bid.deleteMany({ where: { auctionId: { in: seedAuctionIds } } });
  await prisma.auction.deleteMany({ where: { id: { in: seedAuctionIds } } });

  // ═══════════════════════════════════════════════════════════════
  // 1. SCHEDULED — future start, no bids
  // ═══════════════════════════════════════════════════════════════
  await prisma.auction.create({
    data: {
      id: '01SEEDSCHEDULED000000001',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-SCHEDULED',
      startTime: new Date(now.getTime() + 24 * HOUR),
      endTime: new Date(now.getTime() + 48 * HOUR),
      status: 'SCHEDULED',
      startingPricePaise: 50000n,
      minIncrementPaise: 1000n,
      currentPricePaise: 50000n,
      version: 1,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. PREPARING — start approaching, no bids
  // ═══════════════════════════════════════════════════════════════
  await prisma.auction.create({
    data: {
      id: '01SEEDPREPARING000000002',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-PREPARING',
      startTime: new Date(now.getTime() + 2 * MIN),
      endTime: new Date(now.getTime() + 2 * HOUR),
      status: 'PREPARING',
      startingPricePaise: 30000n,
      minIncrementPaise: 500n,
      currentPricePaise: 30000n,
      version: 1,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. LIVE — active, no bids yet
  // ═══════════════════════════════════════════════════════════════
  await prisma.auction.create({
    data: {
      id: '01SEEDLIVE00000000000003',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-LIVE',
      startTime: new Date(now.getTime() - 1 * HOUR),
      endTime: new Date(now.getTime() + 2 * HOUR),
      status: 'LIVE',
      startingPricePaise: 20000n,
      minIncrementPaise: 500n,
      currentPricePaise: 20000n,
      version: 1,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. LIVE with bids — 3 bids, current highest bidder
  // ═══════════════════════════════════════════════════════════════
  await prisma.auction.create({
    data: {
      id: '01SEEDLIVEBIDS0000000004',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-LIVE-BIDS',
      startTime: new Date(now.getTime() - 2 * HOUR),
      endTime: new Date(now.getTime() + 1 * HOUR),
      status: 'LIVE',
      startingPricePaise: 10000n,
      minIncrementPaise: 500n,
      currentPricePaise: 11500n,
      version: 4,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  // Create 3 bids for auction #4
  const bid4A = '01SEEDBID4A000000000001';
  const bid4B = '01SEEDBID4B000000000002';
  const bid4C = '01SEEDBID4C000000000003';

  await prisma.bid.createMany({
    data: [
      { id: bid4A, auctionId: '01SEEDLIVEBIDS0000000004', userId: 'user-seed-alice', amountPaise: 10500n, isProxy: false, createdAt: new Date(now.getTime() - 90 * MIN) },
      { id: bid4B, auctionId: '01SEEDLIVEBIDS0000000004', userId: 'user-seed-bob', amountPaise: 11000n, isProxy: false, createdAt: new Date(now.getTime() - 60 * MIN) },
      { id: bid4C, auctionId: '01SEEDLIVEBIDS0000000004', userId: 'user-seed-carol', amountPaise: 11500n, isProxy: false, createdAt: new Date(now.getTime() - 30 * MIN) },
    ]
  });

  // Set winning bid to the highest
  await prisma.auction.update({
    where: { id: '01SEEDLIVEBIDS0000000004' },
    data: { winningBidId: bid4C }
  });

  // Create 3 BidIntents for auction #4
  await prisma.bidIntent.createMany({
    data: [
      { intentId: 'seed-intent-4a-alice-00000001', auctionId: '01SEEDLIVEBIDS0000000004', userId: 'user-seed-alice', amountPaise: 10500n, bidId: bid4A },
      { intentId: 'seed-intent-4b-bob-000000002', auctionId: '01SEEDLIVEBIDS0000000004', userId: 'user-seed-bob', amountPaise: 11000n, bidId: bid4B },
      { intentId: 'seed-intent-4c-carol-000003', auctionId: '01SEEDLIVEBIDS0000000004', userId: 'user-seed-carol', amountPaise: 11500n, bidId: bid4C },
    ]
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. EXTENDED — anti-sniping triggered
  // ═══════════════════════════════════════════════════════════════
  await prisma.auction.create({
    data: {
      id: '01SEEDEXTENDED0000000005',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-EXTENDED',
      startTime: new Date(now.getTime() - 3 * HOUR),
      endTime: new Date(now.getTime() + 5 * MIN),  // extended
      status: 'EXTENDED',
      startingPricePaise: 15000n,
      minIncrementPaise: 500n,
      currentPricePaise: 17000n,
      version: 5,
      extensionCount: 2,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. ENDING — bidding rejected, transitioning toward ENDED
  // ═══════════════════════════════════════════════════════════════
  await prisma.auction.create({
    data: {
      id: '01SEEDENDING00000000006A',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-ENDING',
      startTime: new Date(now.getTime() - 4 * HOUR),
      endTime: new Date(now.getTime() - 1 * MIN),  // just passed
      status: 'ENDING',
      startingPricePaise: 25000n,
      minIncrementPaise: 1000n,
      currentPricePaise: 30000n,
      version: 3,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. ENDED / sold — winner finalized
  // ═══════════════════════════════════════════════════════════════
  const bid7Winner = '01SEEDBID7WIN0000000001';

  await prisma.auction.create({
    data: {
      id: '01SEEDENDEDSOLD000000007',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-ENDED-SOLD',
      startTime: new Date(now.getTime() - 48 * HOUR),
      endTime: new Date(now.getTime() - 24 * HOUR),
      status: 'ENDED',
      startingPricePaise: 100000n,
      minIncrementPaise: 5000n,
      currentPricePaise: 150000n,
      version: 4,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  await prisma.bid.create({
    data: { id: bid7Winner, auctionId: '01SEEDENDEDSOLD000000007', userId: 'user-seed-winner', amountPaise: 150000n, isProxy: false }
  });

  await prisma.auction.update({
    where: { id: '01SEEDENDEDSOLD000000007' },
    data: { winningBidId: bid7Winner }
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. ENDED / unsold — no qualifying winner
  // ═══════════════════════════════════════════════════════════════
  await prisma.auction.create({
    data: {
      id: '01SEEDENDEDUNSOLD0000008',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-ENDED-UNSOLD',
      startTime: new Date(now.getTime() - 48 * HOUR),
      endTime: new Date(now.getTime() - 24 * HOUR),
      status: 'ENDED',
      startingPricePaise: 200000n,
      reservePricePaise: 500000n,
      minIncrementPaise: 10000n,
      currentPricePaise: 200000n,
      version: 1,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. RESERVE-price auction — bids below reserve
  // ═══════════════════════════════════════════════════════════════
  await prisma.auction.create({
    data: {
      id: '01SEEDRESERVE0000000009A',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-RESERVE',
      startTime: new Date(now.getTime() - 1 * HOUR),
      endTime: new Date(now.getTime() + 2 * HOUR),
      status: 'LIVE',
      startingPricePaise: 50000n,
      reservePricePaise: 200000n,
      minIncrementPaise: 5000n,
      currentPricePaise: 60000n,
      version: 2,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  await prisma.bid.create({
    data: { id: '01SEEDBID9RESERVE000001', auctionId: '01SEEDRESERVE0000000009A', userId: 'user-seed-reserve', amountPaise: 60000n, isProxy: false }
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. Idempotency fixture — BidIntent linked to accepted Bid
  // ═══════════════════════════════════════════════════════════════
  await prisma.auction.create({
    data: {
      id: '01SEEDIDEMPOTNCY000000AA',
      shopifyProductId: 'gid://shopify/Product/LOCAL-TEST-IDEMPOTENCY',
      startTime: new Date(now.getTime() - 2 * HOUR),
      endTime: new Date(now.getTime() + 1 * HOUR),
      status: 'LIVE',
      startingPricePaise: 10000n,
      minIncrementPaise: 500n,
      currentPricePaise: 10500n,
      version: 2,
      extensionCount: 0,
      extensionThresholdSec: 60,
      extensionDurationSec: 60,
      maxExtensions: 50,
    }
  });

  const bid10 = '01SEEDBIDAA0IDEMPOTENT1';
  await prisma.bid.create({
    data: { id: bid10, auctionId: '01SEEDIDEMPOTNCY000000AA', userId: 'user-seed-idempotent', amountPaise: 10500n, isProxy: false }
  });

  await prisma.auction.update({
    where: { id: '01SEEDIDEMPOTNCY000000AA' },
    data: { winningBidId: bid10 }
  });

  await prisma.bidIntent.create({
    data: {
      intentId: 'seed-intent-idempotent-replay',
      auctionId: '01SEEDIDEMPOTNCY000000AA',
      userId: 'user-seed-idempotent',
      amountPaise: 10500n,
      bidId: bid10,
    }
  });

  console.log('✅ Layer 2 — 10 local auction fixtures seeded successfully!');
  console.log('');
  console.log('Seeded scenarios:');
  console.log('  1. SCHEDULED  — 01SEEDSCHEDULED000000001');
  console.log('  2. PREPARING  — 01SEEDPREPARING000000002');
  console.log('  3. LIVE       — 01SEEDLIVE00000000000003');
  console.log('  4. LIVE+bids  — 01SEEDLIVEBIDS0000000004');
  console.log('  5. EXTENDED   — 01SEEDEXTENDED0000000005');
  console.log('  6. ENDING     — 01SEEDENDING00000000006A');
  console.log('  7. ENDED/sold — 01SEEDENDEDSOLD000000007');
  console.log('  8. ENDED/unso — 01SEEDENDEDUNSOLD0000008');
  console.log('  9. RESERVE    — 01SEEDRESERVE0000000009A');
  console.log('  10.IDEMPOTENT — 01SEEDIDEMPOTNCY000000AA');
}

main().catch(console.error).finally(() => prisma.$disconnect());
