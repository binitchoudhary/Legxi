import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

import { ITimeProvider } from '../src/application/ports/ITimeProvider';
import { AuctionRepositoryAdapter } from '../src/infrastructure/adapters/AuctionRepositoryAdapter';
import { BidRepositoryAdapter } from '../src/infrastructure/adapters/BidRepositoryAdapter';
import { AuctionTransactionRepositoryAdapter } from '../src/infrastructure/adapters/AuctionTransactionRepositoryAdapter';
import { AuctionLifecycleTransactionRepositoryAdapter } from '../src/infrastructure/adapters/AuctionLifecycleTransactionRepositoryAdapter';
import { BidTransactionRepositoryAdapter } from '../src/infrastructure/adapters/BidTransactionRepositoryAdapter';
import { NoOpEventPublisher } from '../src/infrastructure/adapters/NoOpEventPublisher';
import { AuctionRepository } from '../src/database/repositories/auction.repository';
import { BidRepository } from '../src/database/repositories/bid.repository';
import { RetryExecutor } from '../src/application/utils/RetryExecutor';
import { AdminService } from '../src/application/services/AdminService';
import { BidService } from '../src/application/services/BidService';
import { AuctionService } from '../src/application/services/AuctionService';
import { SettlementService } from '../src/application/services/SettlementService';
import { SettlementRepositoryAdapter } from '../src/infrastructure/adapters/SettlementRepositoryAdapter';
import {
  AuctionEngine,
  IncrementPolicy,
  AuctionStatePolicy,
  ReservePricePolicy,
  BidValidationPolicy,
  AuctionExtensionPolicy,
  AuctionClosingPolicy,
  WinnerDeterminationPolicy
} from '../src/domain';

class MockTimeProvider implements ITimeProvider {
  private currentTime: Date;

  constructor(initialTime?: Date) {
    this.currentTime = initialTime || new Date();
  }

  getCurrentTime(): Date {
    return this.currentTime;
  }

  advance(ms: number) {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }

  setTime(time: Date) {
    this.currentTime = time;
  }
}

import { prisma } from '../src/database';

async function fetchShopifyProducts() {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE || 'legxi.co';
  const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

  if (!SHOPIFY_TOKEN) throw new Error('Missing SHOPIFY_ADMIN_TOKEN');

  const query = `
    query getProducts {
      products(first: 20, query: "status:active") {
        nodes {
          id
          title
          vendor
          handle
        }
      }
    }
  `;

  const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_TOKEN },
    body: JSON.stringify({ query })
  });

  const result = await response.json();
  if (result.errors) throw new Error(JSON.stringify(result.errors));

  return result.data.products.nodes.map((n: any) => n.id);
}

async function run() {
  const isReset = process.argv.includes('--reset') || process.argv.includes('--clean');

  if (isReset) {
    console.log('Resetting demo data...');
    await prisma.settlement.deleteMany({});
    await prisma.bid.deleteMany({});
    await prisma.auction.deleteMany({});
    console.log('Data cleared.');
  }

  console.log('Discovering Shopify products...');
  const productIds = await fetchShopifyProducts();
  if (productIds.length < 10) {
    console.warn(`Only found ${productIds.length} active products. You may need more for a full demo.`);
  }

  // DI Setup with MockTimeProvider
  const timeProvider = new MockTimeProvider();
  
  // Need to shift time back 7 days so we can step through naturally
  timeProvider.setTime(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const eventPublisher = new NoOpEventPublisher();
  const retryExecutor = new RetryExecutor();
  const dbAuctionRepo = new AuctionRepository();
  const dbBidRepo = new BidRepository();
  
  const auctionRepoAdapter = new AuctionRepositoryAdapter(dbAuctionRepo);
  const bidRepoAdapter = new BidRepositoryAdapter(dbBidRepo);
  const bidTxRepoAdapter = new BidTransactionRepositoryAdapter();
  const auctionTxRepoAdapter = new AuctionTransactionRepositoryAdapter();
  const auctionLifecycleTxRepoAdapter = new AuctionLifecycleTransactionRepositoryAdapter();
  const settlementRepoAdapter = new SettlementRepositoryAdapter();

  const auctionEngine = new AuctionEngine(
    new IncrementPolicy(),
    new BidValidationPolicy(),
    new AuctionStatePolicy(),
    new ReservePricePolicy(),
    new AuctionExtensionPolicy(),
    new AuctionClosingPolicy(),
    new WinnerDeterminationPolicy()
  );

  const adminService = new AdminService(auctionRepoAdapter, eventPublisher, timeProvider);
  const auctionService = new AuctionService(
    auctionRepoAdapter, bidRepoAdapter, auctionTxRepoAdapter,
    auctionLifecycleTxRepoAdapter, eventPublisher, timeProvider,
    auctionEngine, retryExecutor
  );
  const bidService = new BidService(
    bidRepoAdapter, auctionRepoAdapter, bidTxRepoAdapter, eventPublisher,
    timeProvider, auctionEngine, retryExecutor, { triggerWindowMs: 120000, extensionDurationMs: 120000, maxExtensions: 3 }
  );
  const settlementService = new SettlementService(settlementRepoAdapter, eventPublisher);

  const demoIdentities = {
    admin: { user: { id: 'usr_admin', roles: ['ADMIN'] } },
    collector: { user: { id: 'usr_collector', roles: ['USER'] } },
    vip: { user: { id: 'usr_vip', roles: ['USER'] } },
  };

  const getProduct = (idx: number) => productIds[idx % productIds.length];

  // 1. Create 2 Ended & 1 Settled
  for (let i = 0; i < 3; i++) {
    const pId = getProduct(i);
    const auction = await adminService.createAuction({
      shopifyProductId: pId,
      startingPricePaise: (5000 + i * 1000) * 100,
      reservePricePaise: (10000 + i * 1000) * 100,
      minIncrementPaise: 500 * 100,
      startTime: new Date(timeProvider.getCurrentTime().getTime() + 1000).toISOString(),
      endTime: new Date(timeProvider.getCurrentTime().getTime() + 24 * 60 * 60 * 1000).toISOString()
    }, demoIdentities.admin as any);

    // Draft -> Published (directly via prisma since AdminService doesn't expose it)
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: 'PUBLISHED' }
    });
    
    // Advance to Active (via prisma)
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: 'ACTIVE' }
    });
    timeProvider.advance(2 * 1000);

    // Place Bids (Story)
    console.log(`Bidding story for old auction ${auction.id}`);
    const basePrice = (5000 + i * 1000) * 100;
    await bidService.placeBid(auction.id, demoIdentities.collector.user.id, basePrice.toString(), false, `idemp1_${i}`);
    timeProvider.advance(60 * 60 * 1000); // +1hr
    await bidService.placeBid(auction.id, demoIdentities.vip.user.id, (basePrice + 5000 * 100).toString(), false, `idemp2_${i}`);

    // Advance to End
    timeProvider.advance(24 * 60 * 60 * 1000);
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: 'CLOSED' }
    });
    await auctionService.closeAuction(auction.id);

    if (i === 0) { // Settle one
      console.log(`Settling auction ${auction.id}`);
      const settlement = await settlementService.initiateSettlement(auction.id, demoIdentities.vip.user.id);
      await settlementService.recordPaymentAttempt(settlement.settlementId, 'razorpay', 'pay_123');
      await settlementService.markPaymentCaptured(settlement.settlementId);
    }
  }

  // Jump to "Now"
  timeProvider.setTime(new Date());

  // 2. Create 5 Active Auctions
  for (let i = 3; i < 8; i++) {
    const pId = getProduct(i);
    const auction = await adminService.createAuction({
      shopifyProductId: pId,
      startingPricePaise: (25000 + i * 5000) * 100,
      reservePricePaise: null,
      minIncrementPaise: 1000 * 100,
      startTime: new Date(timeProvider.getCurrentTime().getTime() + 1000).toISOString(),
      endTime: new Date(timeProvider.getCurrentTime().getTime() + (i * 12) * 60 * 60 * 1000).toISOString()
    }, demoIdentities.admin as any);

    await prisma.auction.update({
      where: { id: auction.id },
      data: { 
        status: 'ACTIVE',
        startTime: new Date(timeProvider.getCurrentTime().getTime() - 24 * 60 * 60 * 1000) 
      }
    });

    console.log(`Bidding story for active auction ${auction.id}`);
    
    // Initial Bid
    const startPrice = 25000 + i * 5000;
    await bidService.placeBid(auction.id, demoIdentities.collector.user.id, (startPrice * 100).toString(), false, `idemp3_${i}`);
    
    // Step time and place competing bids
    timeProvider.advance(10000);
    await bidService.placeBid(auction.id, demoIdentities.vip.user.id, ((startPrice + 1500) * 100).toString(), false, `idemp4_${i}`);

    timeProvider.advance(10000);
    await bidService.placeBid(auction.id, demoIdentities.collector.user.id, ((startPrice + 3500) * 100).toString(), false, `idemp5_${i}`);
  }

  // 3. Create 2 Upcoming
  for (let i = 8; i < 10; i++) {
    const pId = getProduct(i);
    const auction = await adminService.createAuction({
      shopifyProductId: pId,
      startingPricePaise: 100000 * 100,
      reservePricePaise: null,
      minIncrementPaise: 5000 * 100,
      startTime: new Date(timeProvider.getCurrentTime().getTime() + 48 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(timeProvider.getCurrentTime().getTime() + 96 * 60 * 60 * 1000).toISOString()
    }, demoIdentities.admin as any);
    
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: 'PUBLISHED' }
    });
    // It remains PUBLISHED and upcoming since start time is in the future
  }

  console.log('Seed completed successfully!');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
