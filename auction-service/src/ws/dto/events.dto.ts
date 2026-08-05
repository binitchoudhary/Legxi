import { z } from 'zod';

// All events must include a version
export const BaseEventSchema = z.object({
  version: z.literal('v1'),
});

export const JoinAuctionRoomEventSchema = BaseEventSchema.extend({
  auctionId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid ULID'),
});

export const LeaveAuctionRoomEventSchema = BaseEventSchema.extend({
  auctionId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid ULID'),
});

export const PlaceBidEventSchema = BaseEventSchema.extend({
  auctionId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid ULID'),
  amountPaise: z.string().regex(/^[0-9]+$/, 'Must be a numeric string'),
  isProxy: z.boolean().default(false),
  idempotencyKey: z.string().uuid(),
});

export type JoinAuctionRoomEvent = z.infer<typeof JoinAuctionRoomEventSchema>;
export type LeaveAuctionRoomEvent = z.infer<typeof LeaveAuctionRoomEventSchema>;
export type PlaceBidEvent = z.infer<typeof PlaceBidEventSchema>;
