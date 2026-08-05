import { Socket } from 'socket.io';
import { UserContext } from '../modules/auth/interfaces';

export interface ConnectionContext {
  id: string;
  socket: Socket;
  userContext: UserContext;
  connectedAt: Date;
  lastSeen: Date;
  latency: number;
  disconnectReason?: string;
}

// Ensure the socket.io SocketData strongly types userContext
declare module 'socket.io' {
  interface SocketData {
    userContext: UserContext;
  }
}
