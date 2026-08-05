import { create } from 'zustand';
import { ConnectionState, Presence, BidAcceptedEvent, SnapshotResponse, SocketEventBase } from '@/socket/types';

export interface LiveAuctionState {
  // Connection State
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;

  // Metadata
  auctionId: string | null;
  lastSequence: number;
  aggregateVersion: number;
  timeOffset: number;
  
  // Auction State
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED' | null;
  endTime: string | null;
  currentPricePaise: string | null;
  currentLeader: string | null;
  presence: Presence;
  winnerDeclared: boolean;

  // Bids
  bidHistoryDelta: BidAcceptedEvent[];

  // Gap Recovery Buffer
  snapshotBuffer: any[]; // Temporary hold of events during recovery

  // Actions
  initialize: (auctionId: string) => void;
  setTimeOffset: (offset: number) => void;
  processEvent: (sequence: number, version: number, handler: () => void) => boolean;
  applySnapshot: (snapshot: SnapshotResponse) => void;
  clearBuffer: () => void;
  reset: () => void;
}

export const useLiveAuctionStore = create<LiveAuctionState>((set, get) => ({
  connectionState: 'DISCONNECTED',
  setConnectionState: (state) => set({ connectionState: state }),

  auctionId: null,
  lastSequence: 0,
  aggregateVersion: 0,
  timeOffset: 0,
  
  status: null,
  endTime: null,
  currentPricePaise: null,
  currentLeader: null,
  presence: { watching: 0, activeBidders: 0, anonymousViewers: 0 },
  winnerDeclared: false,

  bidHistoryDelta: [],
  snapshotBuffer: [],

  initialize: (auctionId) => set({ 
    auctionId, 
    connectionState: 'CONNECTING',
    lastSequence: 0,
    aggregateVersion: 0,
    bidHistoryDelta: [],
    snapshotBuffer: [],
    winnerDeclared: false
  }),

  setTimeOffset: (offset) => set({ timeOffset: offset }),

  processEvent: (sequence, version, handler) => {
    const { lastSequence, connectionState, snapshotBuffer } = get();

    // Recovering state buffering
    if (connectionState === 'RECOVERING' || connectionState === 'RECONNECTING') {
      set({ snapshotBuffer: [...snapshotBuffer, { sequence, version, handler }] });
      return false; 
    }

    // Gap Detection
    if (sequence > lastSequence + 1) {
      // Gap detected. Transition to recovering state to trigger snapshot.
      set({ connectionState: 'RECOVERING', snapshotBuffer: [{ sequence, version, handler }] });
      return false; // Tells the event listener to trigger request_snapshot
    }

    // Duplicate/Out-of-order detection
    if (sequence <= lastSequence && lastSequence !== 0) {
      return true; // Ignored safely
    }

    // Accept and apply
    handler();
    set({ lastSequence: sequence, aggregateVersion: Math.max(get().aggregateVersion, version) });
    return true;
  },

  applySnapshot: (snapshot) => {
    const { aggregateVersion, snapshotBuffer } = get();
    
    // Only apply if the snapshot is newer
    if (snapshot.snapshotVersion > aggregateVersion || aggregateVersion === 0) {
      set((state) => {
        // Map snapshot bids to BidAcceptedEvent format for the UI delta
        const mappedBids: BidAcceptedEvent[] = snapshot.bids.map(b => ({
          sequence: state.lastSequence, // Mock sequence for snapshot bids
          version: snapshot.snapshotVersion,
          timestamp: b.createdAt,
          bidId: b.id,
          auctionId: b.auctionId,
          userId: b.userId,
          amountPaise: b.amountPaise
        }));

        // Deduplicate bids
        const newDelta = [...mappedBids, ...state.bidHistoryDelta];
        const uniqueBids = Array.from(new Map(newDelta.map(b => [b.bidId, b])).values());
        // Sort descending by amount
        uniqueBids.sort((a, b) => BigInt(b.amountPaise) > BigInt(a.amountPaise) ? 1 : -1);

        return {
          aggregateVersion: snapshot.snapshotVersion,
          status: snapshot.status,
          currentPricePaise: snapshot.currentPricePaise,
          currentLeader: snapshot.highestBidderId,
          endTime: snapshot.endTime,
          presence: snapshot.presence,
          bidHistoryDelta: uniqueBids,
        };
      });
    }

    // Replay valid events from buffer
    set({ connectionState: 'LIVE' });
    const buffer = [...get().snapshotBuffer];
    set({ snapshotBuffer: [] });
    
    buffer.sort((a, b) => a.sequence - b.sequence).forEach(event => {
      get().processEvent(event.sequence, event.version, event.handler);
    });
  },

  clearBuffer: () => set({ snapshotBuffer: [] }),

  reset: () => set({
    connectionState: 'DISCONNECTED',
    auctionId: null,
    lastSequence: 0,
    aggregateVersion: 0,
    status: null,
    endTime: null,
    currentPricePaise: null,
    currentLeader: null,
    presence: { watching: 0, activeBidders: 0, anonymousViewers: 0 },
    winnerDeclared: false,
    bidHistoryDelta: [],
    snapshotBuffer: []
  })
}));
