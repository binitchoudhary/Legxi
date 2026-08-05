export type ConnectionState = 
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'AUTHENTICATING'
  | 'JOINING_ROOM'
  | 'LIVE'
  | 'RECONNECTING'
  | 'RECOVERING';

export interface Presence {
  watching: number;
  activeBidders: number;
  anonymousViewers: number;
}

export interface SocketEventBase {
  sequence: number;
  version: number;
  timestamp: string;
}

export interface AuctionUpdatedEvent extends SocketEventBase {
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED';
}

export interface BidAcceptedEvent extends SocketEventBase {
  bidId: string;
  auctionId: string;
  userId: string;
  amountPaise: string;
}

export interface HighestBidUpdatedEvent extends SocketEventBase {
  currentPricePaise: string;
  currentLeaderId: string | null;
}

export interface AuctionExtendedEvent extends SocketEventBase {
  newEndTime: string;
  reason: string;
}

export interface SnapshotResponse {
  snapshotVersion: number;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED';
  currentPricePaise: string;
  highestBidderId: string | null;
  endTime: string;
  presence: Presence;
  // Bids that occurred since the client was offline or missed a sequence
  bids: Array<{
    id: string;
    auctionId: string;
    userId: string;
    amountPaise: string;
    createdAt: string;
  }>;
}

export interface ServerToClientEvents {
  AuctionUpdated: (payload: AuctionUpdatedEvent) => void;
  BidAccepted: (payload: BidAcceptedEvent) => void;
  HighestBidUpdated: (payload: HighestBidUpdatedEvent) => void;
  AuctionExtended: (payload: AuctionExtendedEvent) => void;
  AuctionClosing: (payload: SocketEventBase) => void;
  AuctionClosed: (payload: SocketEventBase) => void;
  WinnerDeclared: (payload: SocketEventBase & { winningBidId: string }) => void;
  PresenceUpdated: (payload: SocketEventBase & { presence: Presence }) => void;
  ServerTime: (payload: { timestamp: number }) => void;
  SnapshotResponse: (payload: SnapshotResponse) => void;
  ConnectionLost: () => void;
}

export interface ClientToServerEvents {
  join_auction: (auctionId: string) => void;
  leave_auction: (auctionId: string) => void;
  request_snapshot: (auctionId: string) => void;
}
