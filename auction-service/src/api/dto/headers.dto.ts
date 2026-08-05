import { z } from 'zod';

export const RequestIdHeaderSchema = z.object({
  'x-request-id': z.string().uuid(),
  'x-correlation-id': z.string().uuid(),
  'x-trace-id': z.string().optional(),
});

export const IdempotencyHeaderSchema = z.object({
  'idempotency-key': z.string().uuid(),
});

export const UserContextSchema = z.object({
  userId: z.string(),
  roles: z.array(z.string()),
});
