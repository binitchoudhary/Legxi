import { Socket } from 'socket.io';
import { ConnectionContext } from '../interfaces';
import { logger } from '../../shared/logger';
import { RoomManager } from './RoomManager';

export class ConnectionManager {
  private connections: Map<string, ConnectionContext> = new Map();

  constructor(private roomManager: RoomManager) {}

  addConnection(socket: Socket): void {
    const userContext = socket.data.userContext;
    if (!userContext) {
      socket.disconnect(true);
      return;
    }

    const context: ConnectionContext = {
      id: socket.id,
      socket,
      userContext,
      connectedAt: new Date(),
      lastSeen: new Date(),
      latency: 0,
    };

    this.connections.set(socket.id, context);
    
    // Automatically join user-specific room
    this.roomManager.joinUserRoom(socket, userContext.user.id);
    
    // Automatically join admin room if applicable
    if (userContext.user.roles.includes('ADMIN') || userContext.user.roles.includes('SUPER_ADMIN')) {
      this.roomManager.joinAdminRoom(socket);
    }

    logger.info({ 
      socketId: socket.id, 
      userId: userContext.user.id, 
      userContext 
    }, 'Client connected');
  }

  removeConnection(socketId: string, reason: string): void {
    const context = this.connections.get(socketId);
    if (context) {
      context.disconnectReason = reason;
      this.connections.delete(socketId);
      logger.info({ socketId, userId: context.userContext.user.id, reason }, 'Client disconnected');
    }
  }

  updateHeartbeat(socketId: string, latency: number = 0): void {
    const context = this.connections.get(socketId);
    if (context) {
      context.lastSeen = new Date();
      context.latency = latency;
    }
  }

  getConnection(socketId: string): ConnectionContext | undefined {
    return this.connections.get(socketId);
  }

  getAllConnections(): ConnectionContext[] {
    return Array.from(this.connections.values());
  }
}
