const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 10,000 auctions...');
  const auctions = [];
  
  // We need to generate unique shopify_product_id for each to satisfy the unique constraint
  for (let i = 0; i < 10000; i++) {
    auctions.push({
      shopifyProductId: `gid://shopify/Product/10000${i}`,
      status: 'UPCOMING',
      startTime: new Date('2026-12-01T00:00:00Z'),
      endTime: new Date('2026-12-02T00:00:00Z'),
      startingPricePaise: 1000000n, // 10000 INR
      reservePricePaise: 2000000n,  // 20000 INR
      minIncrementPaise: 50000n,    // 500 INR
      currentPricePaise: 1000000n,
    });
  }

  // Insert in batches of 1000 to avoid memory issues
  const batchSize = 1000;
  for (let i = 0; i < auctions.length; i += batchSize) {
    const batch = auctions.slice(i, i + batchSize);
    await prisma.auction.createMany({
      data: batch,
      skipDuplicates: true
    });
    console.log(`Inserted batch ${i / batchSize + 1}/10`);
  }

  console.log('Seeding complete. Total rows:', await prisma.auction.count());
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
