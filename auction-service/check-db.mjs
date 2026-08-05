import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const auctionsCount = await prisma.auction.count();
  
  const bidsCount = await prisma.bid.count();
  
  const settlementsCount = await prisma.settlement.count();
  
  const uniqueUsersInBids = await prisma.bid.groupBy({
    by: ['userId'],
  });
  
  const uniqueProducts = await prisma.auction.groupBy({
    by: ['shopifyProductId']
  });

  console.log('--- DATABASE COUNTS ---');
  console.log(`Auctions: ${auctionsCount}`);
  console.log(`Bids: ${bidsCount}`);
  console.log(`Settlements: ${settlementsCount}`);
  console.log(`Unique Users (from Bids): ${uniqueUsersInBids.length}`);
  console.log(`Linked Shopify Products: ${uniqueProducts.length}`);
  
  const allAuctions = await prisma.auction.findMany();
  console.log('\n--- AUCTIONS ---');
  console.dir(allAuctions, { depth: null });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
