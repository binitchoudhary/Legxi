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
  status: z.enum(['DRAFT', 'SCHEDULED', 'PREPARING', 'LIVE', 'EXTENDED', 'ENDING', 'ENDED', 'SETTLED', 'ARCHIVED']).optional(),
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

export const UpdateAuctionConfigRequestSchema = z.object({
  reservePricePaise: z.string().regex(AMOUNT_REGEX).optional(),
  minIncrementPaise: z.string().regex(AMOUNT_REGEX).optional(),
  startingPricePaise: z.string().regex(AMOUNT_REGEX).optional(),
  extensionThresholdSec: z.number().int().min(1).optional(),
  extensionDurationSec: z.number().int().min(1).optional(),
  maxExtensions: z.number().int().min(0).optional(),
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
  extensionDurationSec: number;
  extensionThresholdSec: number;
  maxExtensions: number;
  createdAt: string;
  updatedAt: string;
}
