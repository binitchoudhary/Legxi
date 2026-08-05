import { Server, Socket } from 'socket.io';
import { ConnectionManager } from './ConnectionManager';
import { EventDispatcher } from '../dispatcher/EventDispatcher';
import { socketAuthenticator } from '../middleware/SocketAuthenticator';
import { IdentityContextProvider } from '../../modules/auth/adapters/identityContext.provider';

export class WebSocketGateway {
  constructor(
    private io: Server,
    private connectionManager: ConnectionManager,
    private eventDispatcher: EventDispatcher,
    private identityProvider: IdentityContextProvider
  ) {
    this.initialize();
  }

  private initialize(): void {
    // 1. Authentication Handshake Middleware
    this.io.use(socketAuthenticator(this.identityProvider));

    // 2. Connection Lifecycle
    this.io.on('connection', (socket: Socket) => {
      // Register connection in the connection manager
      this.connectionManager.addConnection(socket);

      // Bind all registered event handlers via the dispatcher
      this.eventDispatcher.bindSocket(socket);
    });
  }

  getIo(): Server {
    return this.io;
  }
}
