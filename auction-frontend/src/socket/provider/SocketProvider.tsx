'use client';

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/store/authStore';

export const SocketContext = React.createContext<{ socket: Socket | null }>({ socket: null });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const authStatus = useAuthStore((state) => state.status);

  React.useEffect(() => {
    if (authStatus !== 'AUTHENTICATED') {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Next.js rewriting proxy interceptor path
    const socketInstance = io(window.location.origin, {
      path: '/api/proxy/socket.io',
      transports: ['polling', 'websocket'], // Allow fallback for initial cookie passing if websocket drops
      withCredentials: true // Extremely important to pass Gateway cookies
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [authStatus]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
}

