import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  
  DATABASE_URL: z.string().url(),
  
  REDIS_URL: z.string().url(),
  
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_PRIVATE_KEY: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string(),
  
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  throw new Error('Invalid environment variables: ' + JSON.stringify(_env.error.format()));
}

export const env = _env.data;
