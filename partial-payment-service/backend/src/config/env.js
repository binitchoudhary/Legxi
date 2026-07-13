import dotenv from 'dotenv';

// Load .env file if present
dotenv.config();

/**
 * Validates and exports required environment variables.
 * Fails fast synchronously if any required variable is missing.
 */

const requiredVars = [
  'PORT',
  'DRY_RUN',
  'SHOPIFY_STORE',
  'SHOPIFY_ADMIN_TOKEN',
  'SHOPIFY_API_VERSION',
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET'
];

const missing = requiredVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

export const ENV = {
  PORT: parseInt(process.env.PORT, 10),
  DRY_RUN: process.env.DRY_RUN === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SHOPIFY_STORE: process.env.SHOPIFY_STORE,
  SHOPIFY_ADMIN_TOKEN: process.env.SHOPIFY_ADMIN_TOKEN,
  SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION,
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET
};
