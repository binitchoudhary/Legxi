'use client';

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/store/authStore';

export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

export const SocketContext = React.createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const authStatus = useAuthStore((state) => state.status);
  const refreshSession = useAuthStore((state) => state.refreshSession);

  React.useEffect(() => {
    // Only connect when user is explicitly authenticated
    if (authStatus !== 'AUTHENTICATED') {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect via Gateway proxy rewrite path with HttpOnly cookies
    const socketInstance = io(window.location.origin, {
      path: '/api/proxy/socket.io',
      transports: ['polling', 'websocket'],
      withCredentials: true, // Gateway validates cookie and injects identity upstream
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', async (err) => {
      setIsConnected(false);

      // If handshake was rejected due to auth error, attempt session refresh
      if (err.message.includes('auth') || err.message.includes('401') || err.message.includes('unauthorized')) {
        const refreshed = await refreshSession();
        if (refreshed) {
          socketInstance.connect();
        }
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [authStatus, refreshSession]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return React.useContext(SocketContext);
}
