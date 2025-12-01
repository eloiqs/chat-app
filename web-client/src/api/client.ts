import type { Chat, Message } from 'shared';

const API_BASE_URL = 'http://localhost:3000/api';

export const chatApi = {
  async getAllChats(): Promise<Chat[]> {
    const response = await fetch(`${API_BASE_URL}/chats`);
    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }
    return response.json();
  },

  async getChatById(id: string): Promise<Chat> {
    const response = await fetch(`${API_BASE_URL}/chats/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch chat');
    }
    return response.json();
  },

  async getChatMessages(id: string): Promise<Message[]> {
    const response = await fetch(`${API_BASE_URL}/chats/${id}/messages`);
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    return response.json();
  },
};
