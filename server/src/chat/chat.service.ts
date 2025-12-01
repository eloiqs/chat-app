import { Injectable } from '@nestjs/common';
import type * as Shared from 'shared';

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
  unreadCount?: number;
}

@Injectable()
export class ChatService {
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
      name: 'Alice Johnson',
      participantIds: ['u1', 'u2'],
      unreadCount: 0,
    },
    {
      id: 'c2',
      name: 'Bob Smith',
      participantIds: ['u1', 'u3'],
      unreadCount: 2,
    },
    {
      id: 'c3',
      name: 'Charlie Davis',
      participantIds: ['u1', 'u4'],
      unreadCount: 0,
    },
    {
      id: 'c4',
      name: 'Diana Wilson',
      participantIds: ['u2', 'u5'],
      unreadCount: 1,
    },
    {
      id: 'c5',
      name: 'Team Chat',
      participantIds: ['u1', 'u2', 'u3'],
      unreadCount: 0,
    },
    {
      id: 'c6',
      participantIds: ['u1', 'u2', 'u3'],
      unreadCount: 0,
    },
  ];

  getAllUsers(): User[] {
    return this.users;
  }

  private getParticipants(participantIds: string[]): User[] {
    return participantIds
      .map((id) => this.users.find((user) => user.id === id))
      .filter((user): user is User => user !== undefined);
  }

  private getLastMessage(
    chatId: string,
    currentUserId: string,
  ): Shared.Message | undefined {
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
      isCurrentUser: lastMessage.senderId === currentUserId,
    };
  }

  private toSharedChat(userId: string, chat: Chat): Shared.Chat {
    return {
      id: chat.id,
      name: chat.name,
      participants: this.getParticipants(
        chat.participantIds.filter((id) => id !== userId),
      ),
      lastMessage: this.getLastMessage(chat.id, chat.participantIds[0]),
      unreadCount: chat.unreadCount,
    } satisfies Shared.Chat;
  }

  private toSharedMessage(userId: string, message: Message) {
    return {
      id: message.id,
      chatId: message.chatId,
      content: message.content,
      timestamp: message.timestamp,
      sender: this.users.find((u) => u.id === message.senderId),
      isCurrentUser: message.senderId === userId,
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
      .map((m) => this.toSharedMessage(userId, m))
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

    return this.toSharedMessage(senderId, newMessage);
  }
}
