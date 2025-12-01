import { Injectable } from '@nestjs/common';

export interface Message {
  id: string;
  chatId: string;
  content: string;
  sender: string;
  timestamp: string;
  isCurrentUser: boolean;
}

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: Message;
  unreadCount?: number;
}

@Injectable()
export class ChatService {
  private messages: Message[] = [
    // Chat c1 messages
    {
      id: 'm1',
      chatId: 'c1',
      content: 'Hey! How are you doing?',
      sender: 'Alice Johnson',
      timestamp: '2025-12-01T09:00:00Z',
      isCurrentUser: false,
    },
    {
      id: 'm2',
      chatId: 'c1',
      content: "I'm doing great! Just finished the project proposal.",
      sender: 'You',
      timestamp: '2025-12-01T09:05:00Z',
      isCurrentUser: true,
    },
    {
      id: 'm3',
      chatId: 'c1',
      content: "That's awesome! Can you send it over?",
      sender: 'Alice Johnson',
      timestamp: '2025-12-01T09:10:00Z',
      isCurrentUser: false,
    },
    {
      id: 'm4',
      chatId: 'c1',
      content: "Sure, I'll email it to you in a few minutes.",
      sender: 'You',
      timestamp: '2025-12-01T09:15:00Z',
      isCurrentUser: true,
    },

    // Chat c2 messages
    {
      id: 'm5',
      chatId: 'c2',
      content: 'Meeting at 3 PM today?',
      sender: 'Bob Smith',
      timestamp: '2025-12-01T08:30:00Z',
      isCurrentUser: false,
    },
    {
      id: 'm6',
      chatId: 'c2',
      content: "Yes, I'll be there!",
      sender: 'You',
      timestamp: '2025-12-01T08:35:00Z',
      isCurrentUser: true,
    },
    {
      id: 'm7',
      chatId: 'c2',
      content: 'Great! See you in the conference room.',
      sender: 'Bob Smith',
      timestamp: '2025-12-01T08:40:00Z',
      isCurrentUser: false,
    },

    // Chat c3 messages
    {
      id: 'm8',
      chatId: 'c3',
      content: 'Thanks for your help yesterday!',
      sender: 'Charlie Davis',
      timestamp: '2025-11-30T16:20:00Z',
      isCurrentUser: false,
    },
    {
      id: 'm9',
      chatId: 'c3',
      content: 'No problem at all! Happy to help.',
      sender: 'You',
      timestamp: '2025-11-30T16:25:00Z',
      isCurrentUser: true,
    },

    // Chat c4 messages
    {
      id: 'm10',
      chatId: 'c4',
      content: 'Did you see the game last night?',
      sender: 'Diana Wilson',
      timestamp: '2025-11-30T22:00:00Z',
      isCurrentUser: false,
    },
    {
      id: 'm11',
      chatId: 'c4',
      content: 'Yes! What an incredible finish!',
      sender: 'You',
      timestamp: '2025-11-30T22:05:00Z',
      isCurrentUser: true,
    },
    {
      id: 'm12',
      chatId: 'c4',
      content: 'I know right! That last-minute goal was amazing.',
      sender: 'Diana Wilson',
      timestamp: '2025-11-30T22:08:00Z',
      isCurrentUser: false,
    },

    // Chat c5 messages
    {
      id: 'm13',
      chatId: 'c5',
      content: 'Team lunch on Friday?',
      sender: 'You',
      timestamp: '2025-11-29T14:00:00Z',
      isCurrentUser: true,
    },
    {
      id: 'm14',
      chatId: 'c5',
      content: "I'm in! Where are we going?",
      sender: 'Team Chat',
      timestamp: '2025-11-29T14:05:00Z',
      isCurrentUser: false,
    },
  ];

  private getLastMessage(chatId: string): Message | undefined {
    const chatMessages = this.messages
      .filter((m) => m.chatId === chatId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    return chatMessages[0];
  }

  getAllChats(): Chat[] {
    const chats: Chat[] = [
      {
        id: 'c1',
        name: 'Alice Johnson',
        avatar: 'AJ',
        lastMessage: this.getLastMessage('c1'),
        unreadCount: 0,
      },
      {
        id: 'c2',
        name: 'Bob Smith',
        avatar: 'BS',
        lastMessage: this.getLastMessage('c2'),
        unreadCount: 2,
      },
      {
        id: 'c3',
        name: 'Charlie Davis',
        avatar: 'CD',
        lastMessage: this.getLastMessage('c3'),
        unreadCount: 0,
      },
      {
        id: 'c4',
        name: 'Diana Wilson',
        avatar: 'DW',
        lastMessage: this.getLastMessage('c4'),
        unreadCount: 1,
      },
      {
        id: 'c5',
        name: 'Team Chat',
        avatar: 'TC',
        lastMessage: this.getLastMessage('c5'),
        unreadCount: 0,
      },
    ];

    return chats;
  }

  getChatById(id: string): Chat | undefined {
    const chats = this.getAllChats();
    return chats.find((chat) => chat.id === id);
  }

  getChatMessages(id: string): Message[] {
    return this.messages
      .filter((m) => m.chatId === id)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }
}
