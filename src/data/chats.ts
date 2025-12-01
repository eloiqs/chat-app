import type { Chat, Message } from '@/types/chat';

export const messages: Message[] = [
  // Chat 1 messages
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

  // Chat 2 messages
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

  // Chat 3 messages
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

  // Chat 4 messages
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

  // Chat 5 messages
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

export const chats: Chat[] = [
  {
    id: 'c1',
    name: 'Alice Johnson',
    avatar: 'AJ',
    lastMessage: messages.find(m => m.id === 'm4'),
    unreadCount: 0,
  },
  {
    id: 'c2',
    name: 'Bob Smith',
    avatar: 'BS',
    lastMessage: messages.find(m => m.id === 'm7'),
    unreadCount: 2,
  },
  {
    id: 'c3',
    name: 'Charlie Davis',
    avatar: 'CD',
    lastMessage: messages.find(m => m.id === 'm9'),
    unreadCount: 0,
  },
  {
    id: 'c4',
    name: 'Diana Wilson',
    avatar: 'DW',
    lastMessage: messages.find(m => m.id === 'm12'),
    unreadCount: 1,
  },
  {
    id: 'c5',
    name: 'Team Chat',
    avatar: 'TC',
    lastMessage: messages.find(m => m.id === 'm14'),
    unreadCount: 0,
  },
];

// Helper function to get messages for a specific chat
export const getMessagesByChatId = (chatId: string): Message[] => {
  return messages.filter(m => m.chatId === chatId).sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

// Helper function to get a specific chat by ID
export const getChatById = (chatId: string): Chat | undefined => {
  return chats.find(c => c.id === chatId);
};
