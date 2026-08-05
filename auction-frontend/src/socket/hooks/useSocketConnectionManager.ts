import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLiveAuctionStore } from '@/features/auctions/store/useLiveAuctionStore';
import { ServerToClientEvents, ClientToServerEvents } from '../types';
import { toast } from 'sonner';

export const useSocketConnectionManager = (auctionId: string | null) => {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  
  // Stores
  const auth = useAuthStore((s) => s.user);
  const { 
    setConnectionState, 
    setTimeOffset, 
    processEvent, 
    applySnapshot,
    initialize,
    reset,
    connectionState
  } = useLiveAuctionStore();

  useEffect(() => {
    if (!auctionId) return;

    initialize(auctionId);

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    
    // Connect
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
      path: '/socket.io',
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: {
        token: auth?.id ? `Bearer ${auth.id}` : undefined // Using user ID as mock JWT payload for auth
      }
    });

    socketRef.current = socket;
    setConnectionState('CONNECTING');

    socket.on('connect', () => {
      setConnectionState('AUTHENTICATING');
      socket.emit('join_auction', auctionId);
      
      // Calculate server time offset
      const start = Date.now();
      socket.once('ServerTime', (payload) => {
        const latency = (Date.now() - start) / 2;
        setTimeOffset(payload.timestamp - Date.now() + latency);
        setConnectionState('LIVE');
      });
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setConnectionState('DISCONNECTED');
      } else {
        setConnectionState('RECONNECTING');
      }
    });

    // Handle reconnect logic mapping
    socket.io.on('reconnect', () => {
      setConnectionState('RECOVERING');
      socket.emit('request_snapshot', auctionId);
    });

    socket.io.on('reconnect_error', () => {
      toast.error('Connection lost. Attempting to reconnect...', { id: 'ws-reconnect' });
    });

    // Snapshot
    socket.on('SnapshotResponse', (payload) => {
      applySnapshot(payload);
      toast.success('Live connection synchronized.', { id: 'ws-reconnect' });
    });

    // Domain Events
    socket.on('BidAccepted', (payload) => {
      const accepted = processEvent(payload.sequence, payload.version, () => {
        useLiveAuctionStore.setState((state) => ({
          bidHistoryDelta: [payload, ...state.bidHistoryDelta],
          currentPricePaise: payload.amountPaise,
          currentLeader: payload.userId
        }));
      });
      if (!accepted && connectionState === 'LIVE') socket.emit('request_snapshot', auctionId);
    });

    socket.on('AuctionExtended', (payload) => {
      const accepted = processEvent(payload.sequence, payload.version, () => {
        useLiveAuctionStore.setState({ endTime: payload.newEndTime });
        toast.info(`Auction extended by anti-sniping: ${payload.reason}`);
      });
      if (!accepted && connectionState === 'LIVE') socket.emit('request_snapshot', auctionId);
    });

    socket.on('HighestBidUpdated', (payload) => {
      processEvent(payload.sequence, payload.version, () => {
        useLiveAuctionStore.setState({ 
          currentPricePaise: payload.currentPricePaise,
          currentLeader: payload.currentLeaderId 
        });
      });
    });

    socket.on('AuctionUpdated', (payload) => {
      processEvent(payload.sequence, payload.version, () => {
        useLiveAuctionStore.setState({ status: payload.status });
      });
    });

    socket.on('PresenceUpdated', (payload) => {
      processEvent(payload.sequence, payload.version, () => {
        useLiveAuctionStore.setState({ presence: payload.presence });
      });
    });

    socket.on('WinnerDeclared', (payload) => {
      processEvent(payload.sequence, payload.version, () => {
        useLiveAuctionStore.setState({ winnerDeclared: true });
        if (payload.winningBidId === auth?.id) { // Mock logic for winner determination
          toast.success('🎉 You won the auction!', { duration: 10000 });
        }
      });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && useLiveAuctionStore.getState().connectionState === 'LIVE') {
        // Optimistically request a snapshot to cover any sleep gaps
        socket.emit('request_snapshot', auctionId);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.emit('leave_auction', auctionId);
      socket.disconnect();
      reset();
    };
  }, [auctionId, auth]); // Deliberately omit store functions to prevent reconnection loops

  return socketRef;
};
