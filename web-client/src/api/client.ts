import type { Message } from '@/types/types';
import type * as Shared from 'shared';
import { toMessage } from './utils';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api';

export interface ChatApiClient {
  getAllChats(): Promise<Shared.Chat[]>;
  getChatById(id: string): Promise<Shared.Chat>;
  getChatMessages(id: string): Promise<Shared.Message[]>;
  sendMessage(chatId: string, content: string): Promise<Message>;
  markChatAsRead(chatId: string): Promise<void>;
}

export async function getAllUsers(): Promise<Shared.User[]> {
  const response = await fetch(`${API_BASE_URL}/chats/users`);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

export function createChatApi(userId: string): ChatApiClient {
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
    async getAllChats(): Promise<Shared.Chat[]> {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      return response.json();
    },

    async getChatById(id: string): Promise<Shared.Chat> {
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
      return response
        .json()
        .then((messages: Shared.Message[]) =>
          messages.map((m) => toMessage(m, userId)),
        );
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
      return response.json().then((m) => toMessage(m, userId));
    },

    async markChatAsRead(chatId: string): Promise<void> {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/read`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to mark chat as read');
      }
    },
  };
}
