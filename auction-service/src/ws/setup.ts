import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { WebSocketGateway } from './gateway/WebSocketGateway';
import { ConnectionManager } from './gateway/ConnectionManager';
import { RoomManager } from './gateway/RoomManager';
import { EventDispatcher } from './dispatcher/EventDispatcher';
import { EventHandlerRegistry } from './dispatcher/EventHandlerRegistry';
import { IdentityContextProvider } from '../modules/auth/adapters/identityContext.provider';
import { IAuctionService } from '../api/services/IAuctionService';
import { IBidService } from '../api/services/IBidService';
import { IAdminService } from '../api/services/IAdminService';
import { JoinAuctionRoomEventSchema, LeaveAuctionRoomEventSchema, PlaceBidEventSchema } from './dto/events.dto';

export interface WsDependencies {
  auctionService: IAuctionService;
  bidService: IBidService;
  adminService: IAdminService;
}

export function setupWebSocket(httpServer: HttpServer, deps: WsDependencies): Server {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  const identityProvider = new IdentityContextProvider();
  const roomManager = new RoomManager(io);
  const connectionManager = new ConnectionManager(roomManager);
  const registry = new EventHandlerRegistry();
  
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

  // Register Bid Event (delegates to IBidService)
  registry.register('bid:place', async (socket, payload) => {
    const data = PlaceBidEventSchema.parse(payload);
    const userId = socket.data.userContext.user.id;
    
    const bid = await deps.bidService.placeBid(
      data.auctionId,
      userId,
      data.amountPaise,
      data.isProxy,
      data.idempotencyKey
    );
    
    // Broadcast is usually done by the service layer via pub/sub, but if we want to immediately return 
    // the result to the sender, we just return it here.
    return bid;
  });

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
