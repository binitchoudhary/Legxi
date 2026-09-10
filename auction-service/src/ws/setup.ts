import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { WebSocketGateway } from './gateway/WebSocketGateway';
import { ConnectionManager } from './gateway/ConnectionManager';
import { RoomManager } from './gateway/RoomManager';
import { EventDispatcher } from './dispatcher/EventDispatcher';
import { EventHandlerRegistry } from './dispatcher/EventHandlerRegistry';
import { IdentityContextProvider } from '../modules/auth/adapters/identityContext.provider';
import { IAuctionService } from '../api/services/IAuctionService';
import { IBidService } from '../api/services/IBidService';
import { IAdminService } from '../api/services/IAdminService';
import { JoinAuctionRoomEventSchema, LeaveAuctionRoomEventSchema } from './dto/events.dto';
import { logger } from '../shared/logger';

export interface WsDependencies {
  auctionService: IAuctionService;
  bidService: IBidService;
  adminService: IAdminService;
  redisPublisher: Redis;
  redisSubscriber: Redis;
}

export function setupWebSocket(httpServer: HttpServer, deps: WsDependencies): Server {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000,
    adapter: createAdapter(deps.redisPublisher, deps.redisSubscriber)
  });

  // Dedicated Redis subscriber for down-stream broadcast of auction events
  const broadcastSubscriber = deps.redisSubscriber.duplicate();
  broadcastSubscriber.psubscribe('auction:*:events', (err) => {
    if (err) {
      logger.error({ err }, 'Failed to psubscribe to auction:*:events');
    }
  });

  broadcastSubscriber.on('pmessage', (pattern, channel, message) => {
    try {
      const envelope = JSON.parse(message);
      const auctionId = envelope.auctionId;
      
      if (auctionId) {
        const type = envelope.type as string;

        if (type.startsWith('telemetry.admin.')) {
          io.local.to('admin:global').emit(type, envelope);
        } else if (type.startsWith('telemetry.')) {
          io.local.to(`operator:${auctionId}`).emit(type, envelope);
        } else {
          // Public auction events
          io.local.to(`auction:${auctionId}`).emit(type, envelope);
        }
      }
    } catch (e) {
      logger.error({ err: e, message }, 'Failed to parse incoming Redis broadcast message');
    }
  });

  const identityProvider = new IdentityContextProvider();
  const roomManager = new RoomManager(io);
  const connectionManager = new ConnectionManager(roomManager);
  const registry = new EventHandlerRegistry();
  
  // Add JWT Auth Middleware from frozen context
  io.use((socket, next) => {
    try {
      const contextHeader = socket.request.headers['x-user-context'];
      if (!contextHeader || typeof contextHeader !== 'string') {
        return next(new Error('Missing or malformed x-user-context header from upstream gateway'));
      }
      
      const userContext = identityProvider.provide(contextHeader);
      
      if (!userContext || !userContext.user || !userContext.user.id || !Array.isArray(userContext.user.roles)) {
        return next(new Error('Upstream user context is structurally invalid'));
      }
      
      socket.data.userContext = userContext;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // Register Room Join/Leave events (No application business logic, just transport)
  registry.register('join:auction', async (socket, payload) => {
    const data = JoinAuctionRoomEventSchema.parse(payload);
    roomManager.joinAuctionRoom(socket, data.auctionId);
    return { joined: true, auctionId: data.auctionId };
  });

  registry.register('leave:auction', async (socket, payload) => {
    const data = LeaveAuctionRoomEventSchema.parse(payload);
    roomManager.leaveAuctionRoom(socket, data.auctionId);
    return { left: true, auctionId: data.auctionId };
  });

  registry.register('join:admin', async (socket, payload) => {
    // Only allow if user has global admin role
    const roles = socket.data.userContext?.user?.roles || [];
    if (!roles.includes('admin')) {
      throw new Error('Forbidden: requires admin role');
    }
    socket.join('admin:global');
    return { joined: true, room: 'admin:global' };
  });

  registry.register('join:operator', async (socket, payload) => {
    const data = JoinAuctionRoomEventSchema.parse(payload); // re-use schema to get auctionId
    // In a real system, you might check if they have operator rights for THIS specific auction.
    // For now, we check for a generic operator/admin role.
    const roles = socket.data.userContext?.user?.roles || [];
    if (!roles.includes('operator') && !roles.includes('admin')) {
      throw new Error('Forbidden: requires operator role');
    }
    socket.join(`operator:${data.auctionId}`);
    return { joined: true, room: `operator:${data.auctionId}` };
  });

  // The 'bid:place' mutation has been explicitly removed.
  // All mutations must flow through REST to ensure pessimistic lock boundaries.

  const dispatcher = new EventDispatcher(registry, connectionManager);

  // Initialize the Gateway (which binds everything)
  const gateway = new WebSocketGateway(
    io,
    connectionManager,
    dispatcher,
    identityProvider
  );
  return io;
}
