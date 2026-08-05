import { z } from 'zod';
import { ULID_REGEX, AMOUNT_REGEX } from './auction.dto';

export const PlaceBidRequestSchema = z.object({
  auctionId: z.string().regex(ULID_REGEX, 'Invalid ULID format'),
  amountPaise: z.string().regex(AMOUNT_REGEX, 'Amount must be numeric string'),
  isProxy: z.boolean().default(false),
}).strict();

// Internal DTO structure mapped from DB schema for type safety
export interface BidDTO {
  id: string;
  auctionId: string;
  userId: string;
  amountPaise: string;
  isProxy: boolean;
  status: string;
  createdAt: string;
}
