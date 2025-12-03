export interface User {
    id: string;
    name: string;
    avatar?: string;
}
export interface Message {
    id: string;
    chatId: string;
    content: string;
    sender: User;
    timestamp: string;
    isCurrentUser: boolean;
}
export interface Chat {
    id: string;
    name?: string;
    participants: User[];
    lastMessage?: Message;
    unreadCount?: number;
}
export interface TypingIndicator {
    chatId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
}
export interface NewMessageEvent {
    chatId: string;
    message: Message;
}
