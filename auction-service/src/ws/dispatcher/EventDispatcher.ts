import { Socket } from 'socket.io';
import { EventHandlerRegistry } from './EventHandlerRegistry';
import { SocketErrorMapper } from '../gateway/SocketErrorMapper';
import { logger } from '../../shared/logger';
import { ConnectionManager } from '../gateway/ConnectionManager';

export class EventDispatcher {
  constructor(
    private registry: EventHandlerRegistry,
    private connectionManager: ConnectionManager
  ) {}

  bindSocket(socket: Socket): void {
    const events = this.registry.getAllEvents();
    
    for (const event of events) {
      const handler = this.registry.getHandler(event);
      if (!handler) continue;

      socket.on(event, async (payload: any, ack?: (res: any) => void) => {
        try {
          // Update latency if this was a ping/pong or regular event
          this.connectionManager.updateHeartbeat(socket.id);
          
          const result = await handler(socket, payload);
          
          if (typeof ack === 'function') {
            ack(SocketErrorMapper.createSuccessResponse(result));
          }
        } catch (error) {
          logger.error({ socketId: socket.id, event, err: error }, 'Socket event handler failed');
          if (typeof ack === 'function') {
            ack(SocketErrorMapper.createErrorResponse(error));
          }
        }
      });
    }
    
    socket.on('disconnect', (reason: string) => {
      this.connectionManager.removeConnection(socket.id, reason);
    });
  }
}
