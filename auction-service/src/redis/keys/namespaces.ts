export const RedisKeys = {
  // Auction State
  auctionState: (auctionId: string) => `auction:${auctionId}:state`,
  auctionHighestBid: (auctionId: string) => `auction:${auctionId}:highest_bid`,
  auctionParticipantCount: (auctionId: string) => `auction:${auctionId}:participant_count`,
  
  // Distributed Locks
  lockAuction: (auctionId: string) => `lock:auction:${auctionId}`,
  lockBid: (bidId: string) => `lock:bid:${bidId}`,
  lockSettlement: (auctionId: string) => `lock:settlement:${auctionId}`,
  
  // Idempotency
  idempotency: (key: string) => `idempotency:${key}`,
  
  // Sequence Generation
  sequenceGlobal: (type: string) => `sequence:${type}`,
  
  // Pub/Sub Channels
  channelAuctionEvents: 'system:channels:auction_events',
  channelBidEvents: 'system:channels:bid_events',
  channelSystemEvents: 'system:channels:system_events',
  channelSettlementEvents: 'system:channels:settlement_events',
  
  // Streams
  streamEvents: (type: string) => `stream:${type}_events`,
  
  // Metrics (if we need to store them in redis, though mostly in-memory/logger)
  metricsHitCount: (namespace: string) => `system:metrics:${namespace}:hits`,
};
