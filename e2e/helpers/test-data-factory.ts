import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import type { User, Chat, Message } from 'shared';

/** Input for creating a chat in the database */
export interface ChatInput {
  id: string;
  name?: string;
  participantIds: string[];
}

/** Input for creating a message in the database */
export interface MessageInput {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  timestamp?: Date;
}

export interface TestDataSet {
  users: User[];
  chats: ChatInput[];
  messages?: MessageInput[];
}

/**
 * Factory for creating unique test data per test.
 * Each factory instance generates data with a unique prefix to avoid conflicts.
 */
export class TestDataFactory {
  private prisma: PrismaClient;
  private pool: Pool;
  private prefix: string;
  private userCounter = 0;
  private chatCounter = 0;
  private messageCounter = 0;

  constructor(databaseUrl: string, testId: string) {
    this.prefix = `test_${testId}_`;
    this.pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  generateUserId(): string {
    return `${this.prefix}u${++this.userCounter}`;
  }

  generateChatId(): string {
    return `${this.prefix}c${++this.chatCounter}`;
  }

  generateMessageId(): string {
    return `${this.prefix}m${++this.messageCounter}`;
  }

  createUser(overrides: Partial<User> = {}): User {
    const id = overrides.id ?? this.generateUserId();
    return {
      id,
      name: overrides.name ?? `Test User ${this.userCounter}`,
      avatar: overrides.avatar ?? id.slice(0, 2).toUpperCase(),
    };
  }

  createChat(participantIds: string[], overrides: Partial<ChatInput> = {}): ChatInput {
    return {
      id: overrides.id ?? this.generateChatId(),
      name: overrides.name,
      participantIds,
    };
  }

  createMessage(
    chatId: string,
    senderId: string,
    content: string,
    overrides: Partial<MessageInput> = {},
  ): MessageInput {
    return {
      id: overrides.id ?? this.generateMessageId(),
      chatId,
      senderId,
      content,
      timestamp: overrides.timestamp ?? new Date(),
    };
  }

  async provision(data: TestDataSet): Promise<void> {
    if (data.users.length > 0) {
      await this.prisma.user.createMany({
        data: data.users.map((u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
        })),
        skipDuplicates: true,
      });
    }

    for (const chat of data.chats) {
      await this.prisma.chat.create({
        data: {
          id: chat.id,
          name: chat.name,
          participants: {
            create: chat.participantIds.map((userId) => ({ userId })),
          },
        },
      });
    }

    if (data.messages && data.messages.length > 0) {
      await this.prisma.message.createMany({
        data: data.messages.map((m) => ({
          id: m.id,
          chatId: m.chatId,
          content: m.content,
          senderId: m.senderId,
          timestamp: m.timestamp ?? new Date(),
        })),
      });
    }
  }

  async cleanup(): Promise<void> {
    await this.prisma.messageView.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: this.prefix } },
          { messageId: { startsWith: this.prefix } },
        ],
      },
    });

    await this.prisma.message.deleteMany({
      where: {
        OR: [
          { id: { startsWith: this.prefix } },
          { chatId: { startsWith: this.prefix } },
        ],
      },
    });

    await this.prisma.chatParticipant.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: this.prefix } },
          { chatId: { startsWith: this.prefix } },
        ],
      },
    });

    await this.prisma.chat.deleteMany({
      where: { id: { startsWith: this.prefix } },
    });

    await this.prisma.user.deleteMany({
      where: { id: { startsWith: this.prefix } },
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    await this.pool.end();
  }

  getPrefix(): string {
    return this.prefix;
  }
}

export function generateTestId(testTitle: string, workerIndex: number): string {
  const timestamp = Date.now();
  const sanitizedTitle = testTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
  return `${sanitizedTitle}_${workerIndex}_${timestamp}`;
}
