import type { Chat, Message, User } from 'shared';

const API_BASE_URL = 'http://localhost:3000/api';

export interface ChatApiClient {
  getAllChats(): Promise<Chat[]>;
  getChatById(id: string): Promise<Chat>;
  getChatMessages(id: string): Promise<Message[]>;
  sendMessage(chatId: string, content: string): Promise<Message>;
}

export function createChatApi(userId: string | null): ChatApiClient {
  const getHeaders = () => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (userId) {
      headers['x-user-id'] = userId;
    }
    return headers;
  };

  return {
    async getAllChats(): Promise<Chat[]> {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      return response.json();
    },

    async getChatById(id: string): Promise<Chat> {
      const response = await fetch(`${API_BASE_URL}/chats/${id}`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch chat');
      }
      return response.json();
    },

    async getChatMessages(id: string): Promise<Message[]> {
      const response = await fetch(`${API_BASE_URL}/chats/${id}/messages`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },

    async sendMessage(chatId: string, content: string): Promise<Message> {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      return response.json();
    },
  };
}

export async function getAllUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/chats/users`);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}
