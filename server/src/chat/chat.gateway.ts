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
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

const configService = new ConfigService();
const corsOrigins = configService.get<string>('CORS_ORIGINS', '');
const corsCredentials =
  configService.get<string>('CORS_CREDENTIALS', 'true') === 'true';

@WebSocketGateway({
  cors: {
    origin: corsOrigins.split(',').map((origin) => origin.trim()),
    credentials: corsCredentials,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private typingUsers = new Map<string, Set<string>>(); // chatId -> Set of userIds

  constructor(private readonly chatService: ChatService) {}

  afterInit() {
    this.chatService.setChatGateway(this);
  }

  handleConnection(client: AuthenticatedSocket) {
    // Client connected
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // Clear typing indicators for this user
    if (client.userId) {
      const user = this.chatService.getUserById(client.userId);
      if (!user) {
        throw new Error('User not found');
      }
      this.typingUsers.forEach((users, chatId) => {
        if (users.has(client.userId!)) {
          users.delete(client.userId!);
          // Notify other users that this user stopped typing
          this.server.to(chatId).emit('user_typing', {
            chatId,
            userId: client.userId,
            userName: user.name,
            isTyping: false,
          } satisfies Shared.TypingIndicator);
        }
      });
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // NOTE: In a real application, this should validate the userId against
    // an authenticated session (e.g., JWT token, session cookie).
    // This is mock authentication for demonstration purposes only.
    const user = this.chatService.getUserById(data.userId);
    if (!user) {
      throw new Error('User not found');
    }
    client.userId = data.userId;
    return { success: true };
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      throw new Error('User not authenticated');
    }

    // Verify user is a participant in the chat
    const chat = this.chatService.getChatById(data.chatId, client.userId);
    if (!chat) {
      throw new Error('Chat not found or user is not a participant');
    }

    client.join(data.chatId);
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
        const user = this.chatService.getUserById(client.userId);
        if (!user) {
          throw new Error('User not found');
        }
        this.server.to(data.chatId).emit('user_typing', {
          chatId: data.chatId,
          userId: client.userId,
          userName: user.name,
          isTyping: false,
        } satisfies Shared.TypingIndicator);
      }
    }

    return { success: true };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      throw new Error('User not authenticated');
    }

    // Verify user is a participant in the chat
    const chat = this.chatService.getChatById(data.chatId, client.userId);
    if (!chat) {
      throw new Error('Chat not found');
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

    const user = this.chatService.getUserById(client.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Broadcast to all users in the chat except the sender
    client.to(data.chatId).emit('user_typing', {
      chatId: data.chatId,
      userId: client.userId,
      userName: user.name,
      isTyping: data.isTyping,
    } satisfies Shared.TypingIndicator);

    return { success: true };
  }

  // Method to be called by ChatService when a new message is created
  broadcastNewMessage(chatId: string, message: Shared.Message) {
    this.server.to(chatId).emit('new_message', {
      chatId,
      message,
    } satisfies Shared.NewMessageEvent);
  }
}
