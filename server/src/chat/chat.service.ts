import { Injectable } from '@nestjs/common';
import type * as Shared from 'shared';
import { RedisService } from '../redis/redis.service';

const REDIS_CHANNEL = 'chat:messages';

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  name?: string;
  participantIds: string[];
  lastMessage?: Message;
}

export interface MessageView {
  userId: string;
  messageId: string;
  viewedAt: string;
}

@Injectable()
export class ChatService {
  constructor(private readonly redisService: RedisService) {}

  private users: User[] = [
    { id: 'u1', name: 'John Doe', avatar: 'JD' },
    { id: 'u2', name: 'Alice Johnson', avatar: 'AJ' },
    { id: 'u3', name: 'Bob Smith', avatar: 'BS' },
    { id: 'u4', name: 'Charlie Davis', avatar: 'CD' },
    { id: 'u5', name: 'Diana Wilson', avatar: 'DW' },
  ];

  private messages: Message[] = [
    // Chat c1 messages (John <-> Alice)
    {
      id: 'm1',
      chatId: 'c1',
      content: 'Hey! How are you doing?',
      senderId: 'u2',
      timestamp: '2025-12-01T09:00:00Z',
    },
    {
      id: 'm2',
      chatId: 'c1',
      content: "I'm doing great! Just finished the project proposal.",
      senderId: 'u1',
      timestamp: '2025-12-01T09:05:00Z',
    },
    {
      id: 'm3',
      chatId: 'c1',
      content: "That's awesome! Can you send it over?",
      senderId: 'u2',
      timestamp: '2025-12-01T09:10:00Z',
    },
    {
      id: 'm4',
      chatId: 'c1',
      content: "Sure, I'll email it to you in a few minutes.",
      senderId: 'u1',
      timestamp: '2025-12-01T09:15:00Z',
    },

    // Chat c2 messages (John <-> Bob)
    {
      id: 'm5',
      chatId: 'c2',
      content: 'Meeting at 3 PM today?',
      senderId: 'u3',
      timestamp: '2025-12-01T08:30:00Z',
    },
    {
      id: 'm6',
      chatId: 'c2',
      content: "Yes, I'll be there!",
      senderId: 'u1',
      timestamp: '2025-12-01T08:35:00Z',
    },
    {
      id: 'm7',
      chatId: 'c2',
      content: 'Great! See you in the conference room.',
      senderId: 'u3',
      timestamp: '2025-12-01T08:40:00Z',
    },

    // Chat c3 messages (John <-> Charlie)
    {
      id: 'm8',
      chatId: 'c3',
      content: 'Thanks for your help yesterday!',
      senderId: 'u4',
      timestamp: '2025-11-30T16:20:00Z',
    },
    {
      id: 'm9',
      chatId: 'c3',
      content: 'No problem at all! Happy to help.',
      senderId: 'u1',
      timestamp: '2025-11-30T16:25:00Z',
    },

    // Chat c4 messages (Alice <-> Diana) - John is NOT a participant
    {
      id: 'm10',
      chatId: 'c4',
      content: 'Did you see the game last night?',
      senderId: 'u5',
      timestamp: '2025-11-30T22:00:00Z',
    },
    {
      id: 'm11',
      chatId: 'c4',
      content: 'Yes! What an incredible finish!',
      senderId: 'u2',
      timestamp: '2025-11-30T22:05:00Z',
    },
    {
      id: 'm12',
      chatId: 'c4',
      content: 'I know right! That last-minute goal was amazing.',
      senderId: 'u5',
      timestamp: '2025-11-30T22:08:00Z',
    },

    // Chat c5 messages (Group chat: John, Alice, Bob)
    {
      id: 'm13',
      chatId: 'c5',
      content: 'Team lunch on Friday?',
      senderId: 'u1',
      timestamp: '2025-11-29T14:00:00Z',
    },
    {
      id: 'm14',
      chatId: 'c5',
      content: "I'm in! Where are we going?",
      senderId: 'u2',
      timestamp: '2025-11-29T14:05:00Z',
    },
    {
      id: 'm15',
      chatId: 'c5',
      content: 'How about the new Italian place downtown?',
      senderId: 'u3',
      timestamp: '2025-11-29T14:10:00Z',
    },
  ];

  private chats: Chat[] = [
    {
      id: 'c1',
      participantIds: ['u1', 'u2'],
    },
    {
      id: 'c2',
      participantIds: ['u1', 'u3'],
    },
    {
      id: 'c3',
      participantIds: ['u1', 'u4'],
    },
    {
      id: 'c4',
      participantIds: ['u2', 'u5'],
    },
    {
      id: 'c5',
      name: 'Team Chat',
      participantIds: ['u1', 'u2', 'u3'],
    },
    {
      id: 'c6',
      participantIds: ['u1', 'u2', 'u3'],
    },
  ];

  // Track which messages have been viewed by which users
  private messageViews: MessageView[] = [
    // Example: u1 has viewed some messages in c1
    { userId: 'u1', messageId: 'm1', viewedAt: '2025-12-01T09:01:00Z' },
    { userId: 'u1', messageId: 'm2', viewedAt: '2025-12-01T09:06:00Z' },
    { userId: 'u1', messageId: 'm3', viewedAt: '2025-12-01T09:11:00Z' },
    { userId: 'u1', messageId: 'm4', viewedAt: '2025-12-01T09:16:00Z' },
    // u1 has only viewed first message in c2
    { userId: 'u1', messageId: 'm5', viewedAt: '2025-12-01T08:31:00Z' },
    // u1 has viewed all messages in c3
    { userId: 'u1', messageId: 'm8', viewedAt: '2025-11-30T16:21:00Z' },
    { userId: 'u1', messageId: 'm9', viewedAt: '2025-11-30T16:26:00Z' },
  ];

  getAllUsers(): User[] {
    return this.users;
  }

  getUserById(id: string): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  /**
   * Compute the unread message count for a specific user in a specific chat.
   * A message is unread if:
   * 1. It was not sent by the user
   * 2. There is no MessageView record for this user and message
   */
  private computeUnreadCount(chatId: string, userId: string): number {
    const chatMessages = this.messages.filter((m) => m.chatId === chatId);

    const unreadMessages = chatMessages.filter((message) => {
      // Don't count messages sent by the user
      if (message.senderId === userId) {
        return false;
      }

      // Check if user has viewed this message
      const hasViewed = this.messageViews.some(
        (view) => view.userId === userId && view.messageId === message.id,
      );

      return !hasViewed;
    });

    return unreadMessages.length;
  }

  private getParticipants(participantIds: string[]): User[] {
    return participantIds
      .map((id) => this.users.find((user) => user.id === id))
      .filter((user): user is User => user !== undefined);
  }

  private getLastMessage(chatId: string): Shared.Message | undefined {
    const chatMessages = this.messages
      .filter((m) => m.chatId === chatId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

    const lastMessage = chatMessages[0];
    if (!lastMessage) return undefined;

    return {
      ...lastMessage,
      sender: this.users.find((u) => u.id === lastMessage.senderId),
    };
  }

  private toSharedChat(userId: string, chat: Chat): Shared.Chat {
    return {
      id: chat.id,
      name: chat.name,
      participants: this.getParticipants(
        chat.participantIds.filter((id) => id !== userId),
      ),
      lastMessage: this.getLastMessage(chat.id),
      unreadCount: this.computeUnreadCount(chat.id, userId),
    } satisfies Shared.Chat;
  }

  private toSharedMessage(message: Message) {
    return {
      id: message.id,
      chatId: message.chatId,
      content: message.content,
      timestamp: message.timestamp,
      sender: this.users.find((u) => u.id === message.senderId),
    } satisfies Shared.Message;
  }

  getAllChats(userId: string): Shared.Chat[] {
    return this.chats
      .filter((chat) => chat.participantIds.find((id) => id === userId))
      .map((chat) => this.toSharedChat(userId, chat));
  }

  getChatById(id: string, userId: string): Shared.Chat | undefined {
    const chat = this.chats.find((chat) => chat.id === id);
    if (!chat) return undefined;

    if (!chat.participantIds.includes(userId)) {
      return undefined;
    }

    return this.toSharedChat(userId, chat);
  }

  getChatMessages(id: string, userId: string): Shared.Message[] | undefined {
    const chat = this.chats.find((chat) => chat.id === id);
    if (!chat || !chat.participantIds.includes(userId)) {
      return undefined;
    }

    return this.messages
      .filter((m) => m.chatId === id)
      .map((m) => this.toSharedMessage(m))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }

  createMessage(
    chatId: string,
    content: string,
    senderId: string,
  ): Shared.Message | undefined {
    const chat = this.chats.find((chat) => chat.id === chatId);
    if (!chat || !chat.participantIds.includes(senderId)) {
      return undefined;
    }

    const newMessage: Message = {
      id: `m${Date.now()}`,
      chatId,
      content,
      senderId,
      timestamp: new Date().toISOString(),
    };

    this.messages.push(newMessage);

    const sharedMessage = this.toSharedMessage(newMessage);

    // Broadcast the new message to WebSocket gateway via Redis
    this.redisService.publish(REDIS_CHANNEL, {
      type: 'new_message',
      chatId,
      message: sharedMessage,
    });

    return sharedMessage;
  }

  /**
   * Mark all messages in a chat as read for a specific user.
   * Creates MessageView records for any unread messages.
   */
  markChatAsRead(chatId: string, userId: string): boolean {
    const chat = this.chats.find((chat) => chat.id === chatId);
    if (!chat || !chat.participantIds.includes(userId)) {
      return false;
    }

    const chatMessages = this.messages.filter((m) => m.chatId === chatId);
    const now = new Date().toISOString();

    chatMessages.forEach((message) => {
      // Skip messages sent by the user
      if (message.senderId === userId) {
        return;
      }

      // Check if already viewed
      const alreadyViewed = this.messageViews.some(
        (view) => view.userId === userId && view.messageId === message.id,
      );

      if (!alreadyViewed) {
        this.messageViews.push({
          userId,
          messageId: message.id,
          viewedAt: now,
        });
      }
    });

    return true;
  }
}
