export interface Message {
  id: string;
  chatId: string;
  content: string;
  sender: string;
  timestamp: string; // ISO 8601 format
  isCurrentUser: boolean;
}

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: Message;
  unreadCount?: number;
}
