import { prisma } from '../src/database';
import * as argon2 from 'argon2';

const DEMO_USERS = [
  { id: 'usr_admin', email: 'admin@legxi.com', name: 'System Admin', roles: ['ADMIN'], phone: '+1234567890' },
  { id: 'usr_collector', email: 'collector@legxi.com', name: 'Demo Collector', roles: ['USER'], phone: '+1234567891' },
  { id: 'usr_vip', email: 'vip@legxi.com', name: 'VIP Collector', roles: ['USER'], phone: '+1234567892' },
  { id: 'usr_operator', email: 'operator@legxi.com', name: 'System Operator', roles: ['OPERATOR'], phone: '+1234567893' },
  { id: 'usr_guest', email: 'guest@legxi.com', name: 'Guest User', roles: ['USER'], phone: '+1234567894' },
];

async function main() {
  console.log('Seeding authentication demo users...');

  // Use a deterministic password for demo environments
  const defaultPassword = 'Password123!';
  
  // Hash once to save time if we just reuse it, 
  // but for strictness let's hash individually.
  for (const user of DEMO_USERS) {
    const passwordHash = await argon2.hash(defaultPassword, {
      type: argon2.argon2id
    });

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        name: user.name,
        roles: user.roles
      },
      create: {
        id: user.id,
        email: user.email,
        passwordHash,
        name: user.name,
        roles: user.roles
      }
    });

    console.log(`Upserted user: ${user.email}`);
  }

  console.log('Auth seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
