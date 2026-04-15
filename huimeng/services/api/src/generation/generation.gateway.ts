import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/generation',
})
export class GenerationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GenerationGateway.name);
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from userSockets
    for (const [userId, socketIds] of this.userSockets.entries()) {
      const index = socketIds.indexOf(client.id);
      if (index !== -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('auth')
  handleAuth(client: Socket, payload: { userId: string }) {
    const { userId } = payload;
    const socketIds = this.userSockets.get(userId) || [];
    socketIds.push(client.id);
    this.userSockets.set(userId, socketIds);
    client.join(`user:${userId}`);
    this.logger.log(`User ${userId} authenticated on socket ${client.id}`);
    return { success: true };
  }

  @SubscribeMessage('subscribe_project')
  handleSubscribeProject(
    client: Socket,
    payload: { projectId: string },
  ) {
    client.join(`project:${payload.projectId}`);
    return { success: true };
  }

  // Notify client of task updates
  notifyTaskUpdate(
    userId: string,
    data: {
      taskId: string;
      status: string;
      progress?: number;
      outputs?: Record<string, unknown>;
    },
  ) {
    this.server.to(`user:${userId}`).emit('task_update', data);
  }

  // Notify project room of generation progress
  notifyProjectProgress(
    projectId: string,
    data: {
      taskId: string;
      episodeId?: string;
      storyboardId?: string;
      status: string;
      progress: number;
    },
  ) {
    this.server.to(`project:${projectId}`).emit('generation_progress', data);
  }
}
