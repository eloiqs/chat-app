import { Injectable } from '@nestjs/common';
import type * as Shared from 'shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const REDIS_CHANNEL = 'chat:messages';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getAllUsers(): Promise<Shared.User[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar ?? undefined,
    }));
  }

  async getUserById(id: string): Promise<Shared.User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) return undefined;
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar ?? undefined,
    };
  }

  private async computeUnreadCount(
    chatId: string,
    userId: string,
  ): Promise<number> {
    const count = await this.prisma.message.count({
      where: {
        chatId,
        senderId: { not: userId },
        views: {
          none: { userId },
        },
      },
    });
    return count;
  }

  private async getLastMessage(
    chatId: string,
  ): Promise<Shared.Message | undefined> {
    const message = await this.prisma.message.findFirst({
      where: { chatId },
      orderBy: { timestamp: 'desc' },
      include: { sender: true },
    });

    if (!message) return undefined;

    return {
      id: message.id,
      chatId: message.chatId,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatar: message.sender.avatar ?? undefined,
      },
    };
  }

  async getAllChats(userId: string): Promise<Shared.Chat[]> {
    const chats = await this.prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    const result: Shared.Chat[] = [];

    for (const chat of chats) {
      const participants = chat.participants
        .filter((p) => p.userId !== userId)
        .map((p) => ({
          id: p.user.id,
          name: p.user.name,
          avatar: p.user.avatar ?? undefined,
        }));

      const [lastMessage, unreadCount] = await Promise.all([
        this.getLastMessage(chat.id),
        this.computeUnreadCount(chat.id, userId),
      ]);

      result.push({
        id: chat.id,
        name: chat.name ?? undefined,
        participants,
        lastMessage,
        unreadCount,
      });
    }

    return result;
  }

  async getChatById(
    id: string,
    userId: string,
  ): Promise<Shared.Chat | undefined> {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id,
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    if (!chat) return undefined;

    const participants = chat.participants
      .filter((p) => p.userId !== userId)
      .map((p) => ({
        id: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar ?? undefined,
      }));

    const [lastMessage, unreadCount] = await Promise.all([
      this.getLastMessage(chat.id),
      this.computeUnreadCount(chat.id, userId),
    ]);

    return {
      id: chat.id,
      name: chat.name ?? undefined,
      participants,
      lastMessage,
      unreadCount,
    };
  }

  async getChatMessages(
    id: string,
    userId: string,
  ): Promise<Shared.Message[] | undefined> {
    // Verify user is participant
    const chat = await this.prisma.chat.findFirst({
      where: {
        id,
        participants: {
          some: { userId },
        },
      },
    });

    if (!chat) return undefined;

    const messages = await this.prisma.message.findMany({
      where: { chatId: id },
      orderBy: { timestamp: 'asc' },
      include: { sender: true },
    });

    return messages.map((m) => ({
      id: m.id,
      chatId: m.chatId,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      sender: {
        id: m.sender.id,
        name: m.sender.name,
        avatar: m.sender.avatar ?? undefined,
      },
    }));
  }

  async createMessage(
    chatId: string,
    content: string,
    senderId: string,
  ): Promise<Shared.Message | undefined> {
    // Verify user is participant
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          some: { userId: senderId },
        },
      },
    });

    if (!chat) return undefined;

    const message = await this.prisma.message.create({
      data: {
        id: `m${Date.now()}`,
        chatId,
        content,
        senderId,
      },
      include: { sender: true },
    });

    const sharedMessage: Shared.Message = {
      id: message.id,
      chatId: message.chatId,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatar: message.sender.avatar ?? undefined,
      },
    };

    // Broadcast the new message to WebSocket gateway via Redis
    this.redisService.publish(REDIS_CHANNEL, {
      type: 'new_message',
      chatId,
      message: sharedMessage,
    });

    return sharedMessage;
  }

  async markChatAsRead(chatId: string, userId: string): Promise<boolean> {
    // Verify user is participant
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          some: { userId },
        },
      },
    });

    if (!chat) return false;

    // Get unread messages
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        chatId,
        senderId: { not: userId },
        views: {
          none: { userId },
        },
      },
      select: { id: true },
    });

    // Create view records for unread messages
    if (unreadMessages.length > 0) {
      await this.prisma.messageView.createMany({
        data: unreadMessages.map((m) => ({
          userId,
          messageId: m.id,
        })),
        skipDuplicates: true,
      });
    }

    return true;
  }
}
