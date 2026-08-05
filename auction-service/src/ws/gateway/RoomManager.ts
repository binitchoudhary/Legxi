import { Server, Socket } from 'socket.io';
import { RoomNamingStrategy } from './RoomNamingStrategy';

export class RoomManager {
  constructor(private io: Server) {}

  joinAuctionRoom(socket: Socket, auctionId: string): void {
    const room = RoomNamingStrategy.getAuctionRoom(auctionId);
    socket.join(room);
  }

  leaveAuctionRoom(socket: Socket, auctionId: string): void {
    const room = RoomNamingStrategy.getAuctionRoom(auctionId);
    socket.leave(room);
  }

  joinUserRoom(socket: Socket, userId: string): void {
    const room = RoomNamingStrategy.getUserRoom(userId);
    socket.join(room);
  }

  joinAdminRoom(socket: Socket): void {
    const room = RoomNamingStrategy.getAdminRoom();
    socket.join(room);
  }

  broadcastToAuction(auctionId: string, event: string, payload: any): void {
    const room = RoomNamingStrategy.getAuctionRoom(auctionId);
    this.io.to(room).emit(event, payload);
  }

  broadcastToUser(userId: string, event: string, payload: any): void {
    const room = RoomNamingStrategy.getUserRoom(userId);
    this.io.to(room).emit(event, payload);
  }

  broadcastToAdmins(event: string, payload: any): void {
    const room = RoomNamingStrategy.getAdminRoom();
    this.io.to(room).emit(event, payload);
  }
}
