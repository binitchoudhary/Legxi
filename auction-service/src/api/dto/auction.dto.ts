import { z } from 'zod';

export const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;
export const AMOUNT_REGEX = /^[0-9]+$/;

export const AuctionIdParamSchema = z.object({
  id: z.string().regex(ULID_REGEX, 'Invalid ULID format'),
}).strict();

export const CursorQuerySchema = z.object({
  cursor: z.string().regex(ULID_REGEX, 'Invalid ULID format').optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
}).strict();

export const AuctionListQuerySchema = CursorQuerySchema.extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'ENDED', 'SETTLED', 'CANCELLED']).optional(),
  shopifyProductId: z.string().optional(),
}).strict();

export const CreateAuctionRequestSchema = z.object({
  shopifyProductId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  startingPricePaise: z.string().regex(AMOUNT_REGEX),
  minIncrementPaise: z.string().regex(AMOUNT_REGEX),
  reservePricePaise: z.string().regex(AMOUNT_REGEX).optional(),
}).strict();

// Internal DTO structure mapped from DB schema for type safety
export interface AuctionDTO {
  id: string;
  shopifyProductId: string;
  startTime: string;
  endTime: string;
  status: string;
  startingPricePaise: string;
  reservePricePaise: string | null;
  minIncrementPaise: string;
  currentPricePaise: string;
  winningBidId: string | null;
  version: number;
  extensionCount: number;
  createdAt: string;
  updatedAt: string;
}
