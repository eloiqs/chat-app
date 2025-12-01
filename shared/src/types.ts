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

