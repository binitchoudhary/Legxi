import * as fs from 'fs';
import * as path from 'path';

// A simple static analysis script to verify architecture layer purity
const DOMAIN_DIR = path.join(__dirname, '../src/domain');
const FORBIDDEN_IMPORTS = [
  'prisma',
  '@prisma/client',
  'redis',
  'ioredis',
  'bullmq',
  'fastify',
  'socket.io',
  'firebase',
  'shopify',
  'process.env'
];

let violations = 0;

function scanDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check forbidden imports
    if (line.includes('import ') || line.includes('require(')) {
      FORBIDDEN_IMPORTS.forEach(forbidden => {
        if (line.toLowerCase().includes(forbidden)) {
          console.error(`[VIOLATION] Forbidden import '${forbidden}' found in Domain Layer: ${filePath}:${index + 1}`);
          violations++;
        }
      });
    }

    // Check forbidden primitives
    if (line.includes('new Date()') || line.includes('Date.now()') || line.includes('Math.random()')) {
        // Exception for TimeProvider logic if any exists, but Domain shouldn't have it
        console.error(`[VIOLATION] Forbidden primitive (time/random) found in Domain Layer: ${filePath}:${index + 1}`);
        violations++;
    }
  });
}

console.log('Starting Architecture Verification Scan...');
scanDirectory(DOMAIN_DIR);

if (violations === 0) {
  console.log('✅ Architecture Scan Passed. Domain is pure.');
  process.exit(0);
} else {
  console.error(`❌ Architecture Scan Failed with ${violations} violations.`);
  process.exit(1);
}
