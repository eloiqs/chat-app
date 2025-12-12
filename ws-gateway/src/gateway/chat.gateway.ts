import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import type * as Shared from 'shared';
import { RedisService, RedisMessage } from '../redis/redis.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

interface NewMessageRedisEvent extends RedisMessage {
  type: 'new_message';
  chatId: string;
  message: Shared.Message;
}

const REDIS_CHANNEL = 'chat:messages';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development, configure properly in production
      callback(null, true);
    },
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private typingUsers = new Map<string, Set<string>>(); // chatId -> Set of userIds
  private userNames = new Map<string, string>(); // userId -> userName

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async afterInit() {
    // Subscribe to Redis channel for new messages
    await this.redisService.subscribe(REDIS_CHANNEL, (message: RedisMessage) => {
      if (message.type === 'new_message') {
        const event = message as NewMessageRedisEvent;
        this.broadcastNewMessage(event.chatId, event.message);
      }
    });

    console.log('WebSocket Gateway initialized and subscribed to Redis');
  }

  handleConnection(client: AuthenticatedSocket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Client disconnected: ${client.id}`);

    // Clear typing indicators for this user
    if (client.userId) {
      const userName = this.userNames.get(client.userId) || 'Unknown';
      this.typingUsers.forEach((users, chatId) => {
        if (users.has(client.userId!)) {
          users.delete(client.userId!);
          // Notify other users that this user stopped typing
          this.server.to(chatId).emit('user_typing', {
            chatId,
            userId: client.userId,
            userName,
            isTyping: false,
          } satisfies Shared.TypingIndicator);
        }
      });
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @MessageBody() data: { userId: string; userName?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // Store user info on the socket
    // NOTE: In production, validate this against a session/JWT
    client.userId = data.userId;
    client.userName = data.userName || 'Unknown';
    this.userNames.set(data.userId, client.userName);

    console.log(`User authenticated: ${data.userId} (${client.userName})`);
    return { success: true };
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    client.join(data.chatId);
    console.log(`User ${client.userId} joined chat ${data.chatId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_chat')
  handleLeaveChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.leave(data.chatId);

    // Clear typing indicator for this user in this chat
    if (client.userId) {
      const typingSet = this.typingUsers.get(data.chatId);
      if (typingSet?.has(client.userId)) {
        typingSet.delete(client.userId);
        const userName = this.userNames.get(client.userId) || 'Unknown';
        this.server.to(data.chatId).emit('user_typing', {
          chatId: data.chatId,
          userId: client.userId,
          userName,
          isTyping: false,
        } satisfies Shared.TypingIndicator);
      }
    }

    console.log(`User ${client.userId} left chat ${data.chatId}`);
    return { success: true };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!this.typingUsers.has(data.chatId)) {
      this.typingUsers.set(data.chatId, new Set());
    }

    const typingSet = this.typingUsers.get(data.chatId)!;

    if (data.isTyping) {
      typingSet.add(client.userId);
    } else {
      typingSet.delete(client.userId);
    }

    const userName = this.userNames.get(client.userId) || 'Unknown';

    // Broadcast to all users in the chat except the sender
    client.to(data.chatId).emit('user_typing', {
      chatId: data.chatId,
      userId: client.userId,
      userName,
      isTyping: data.isTyping,
    } satisfies Shared.TypingIndicator);

    return { success: true };
  }

  // Called when receiving a message from Redis
  private broadcastNewMessage(chatId: string, message: Shared.Message) {
    console.log(`Broadcasting new message to chat ${chatId}`);
    this.server.to(chatId).emit('new_message', {
      chatId,
      message,
    } satisfies Shared.NewMessageEvent);
  }
}
