import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const now = new Date();
  await prisma.auction.createMany({
    data: [
      {
        id: '01J4B4VQZ4X1Y2Z3A4B5C6D7E8',
        shopifyProductId: 'gid://shopify/Product/8807307673774',
        startTime: new Date(now.getTime() - 86400000),
        endTime: new Date(now.getTime() + 86400000),
        status: 'ACTIVE',
        startingPricePaise: 10000n,
        minIncrementPaise: 500n,
        currentPricePaise: 10000n,
        version: 1
      },
      {
        id: '01J4B4VQZ4X1Y2Z3A4B5C6D7E9',
        shopifyProductId: 'gid://shopify/Product/8808125563054',
        startTime: new Date(now.getTime() + 86400000),
        endTime: new Date(now.getTime() + 172800000),
        status: 'PUBLISHED',
        startingPricePaise: 20000n,
        minIncrementPaise: 1000n,
        currentPricePaise: 20000n,
        version: 1
      },
      {
        id: '01J4B4VQZ4X1Y2Z3A4B5C6D7EA',
        shopifyProductId: 'gid://shopify/Product/8834316337326',
        startTime: new Date(now.getTime() - 172800000),
        endTime: new Date(now.getTime() - 86400000),
        status: 'ENDED',
        startingPricePaise: 30000n,
        minIncrementPaise: 1500n,
        currentPricePaise: 50000n,
        version: 1
      }
    ],
    skipDuplicates: true
  });
  console.log('Seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
