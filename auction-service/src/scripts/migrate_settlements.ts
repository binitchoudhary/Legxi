import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulidx';

const prisma = new PrismaClient();

async function migrate() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log(`Starting Settlement Migration (Dry Run: ${isDryRun})`);

  // We find all closed auctions with a winner that don't have a settlement yet.
  // In our old model, payment state wasn't explicitly stored in the DB, it was inferred 
  // or stored in another way. Let's say we find all auctions where status = 'ENDED' or 'SETTLED' or 'ARCHIVED'
  const targetAuctions = await prisma.auction.findMany({
    where: {
      status: { in: ['ENDED', 'SETTLED', 'ARCHIVED'] },
      winningBidId: { not: null }
    },
    include: {
      bids: true // Just to get the winner's user ID
    }
  });

  console.log(`Found ${targetAuctions.length} auctions requiring settlement migration.`);

  let migratedCount = 0;

  for (const auction of targetAuctions) {
    const existingSettlement = await prisma.settlement.findUnique({
      where: { auctionId: auction.id }
    });

    if (existingSettlement) {
      console.log(`Auction ${auction.id} already has a settlement. Skipping.`);
      continue;
    }

    const winningBid = auction.bids.find(b => b.id === auction.winningBidId);
    if (!winningBid) {
      console.error(`ERROR: Auction ${auction.id} has winningBidId ${auction.winningBidId} but bid not found.`);
      continue;
    }

    // Infer state from auction status
    let paymentState = 'PENDING';
    let settlementStatus = 'INITIATED';
    
    if (auction.status === 'SETTLED') {
      paymentState = 'CAPTURED';
      settlementStatus = 'COMPLETED';
    }

    const settlementData = {
      id: ulid(),
      auctionId: auction.id,
      winnerId: winningBid.userId,
      paymentState,
      settlementStatus,
      paymentWindowOpenedAt: auction.updatedAt, // Approximation based on when it was closed
      paymentAttempts: 0,
      version: 1
    };

    if (isDryRun) {
      console.log(`[DRY RUN] Would create settlement for Auction ${auction.id}:`, settlementData);
      migratedCount++;
    } else {
      await prisma.settlement.create({ data: settlementData });
      console.log(`[EXECUTION] Created settlement ${settlementData.id} for Auction ${auction.id}`);
      migratedCount++;
    }
  }

  // Validation Report
  if (!isDryRun) {
    const totalTarget = targetAuctions.length;
    const totalSettlements = await prisma.settlement.count();
    console.log(`=== POST-MIGRATION VALIDATION ===`);
    console.log(`Target Auctions: ${totalTarget}`);
    console.log(`Total Settlements: ${totalSettlements}`);
    if (totalSettlements >= totalTarget) {
      console.log(`Validation SUCCESS. All applicable auctions have settlements.`);
    } else {
      console.error(`Validation FAILED. Expected at least ${totalTarget} settlements, found ${totalSettlements}.`);
    }
  }

  console.log(`Migration completed. Processed ${migratedCount} records.`);
}

migrate()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
