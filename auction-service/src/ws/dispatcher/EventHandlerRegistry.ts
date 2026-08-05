import { Socket } from 'socket.io';

export type SocketEventHandler = (socket: Socket, payload: any) => Promise<any> | any;

export class EventHandlerRegistry {
  private handlers: Map<string, SocketEventHandler> = new Map();

  register(event: string, handler: SocketEventHandler): void {
    if (this.handlers.has(event)) {
      throw new Error(`Handler for event ${event} is already registered`);
    }
    this.handlers.set(event, handler);
  }

  getHandler(event: string): SocketEventHandler | undefined {
    return this.handlers.get(event);
  }

  getAllEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}
