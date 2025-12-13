import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Headers,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type * as Shared from 'shared';
import { ChatService } from './chat.service';

@Controller('api/chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('users')
  async getAllUsers(): Promise<Shared.User[]> {
    return this.chatService.getAllUsers();
  }

  @Get()
  async getAllChats(
    @Headers('x-user-id') userId: string,
  ): Promise<Shared.Chat[]> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }
    return this.chatService.getAllChats(userId);
  }

  @Get(':id')
  async getChatById(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ): Promise<Shared.Chat> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const chat = await this.chatService.getChatById(id, userId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    return chat;
  }

  @Get(':id/messages')
  async getChatMessages(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ): Promise<Shared.Message[]> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const messages = await this.chatService.getChatMessages(id, userId);
    if (!messages) {
      throw new NotFoundException('Chat not found');
    }
    return messages;
  }

  @Post(':id/messages')
  async createMessage(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { content: string },
  ): Promise<Shared.Message> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const message = await this.chatService.createMessage(
      id,
      body.content,
      userId,
    );
    if (!message) {
      throw new NotFoundException('Chat not found');
    }
    return message;
  }

  @Post(':id/read')
  async markChatAsRead(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ): Promise<{ success: boolean }> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const success = await this.chatService.markChatAsRead(id, userId);
    if (!success) {
      throw new NotFoundException('Chat not found');
    }
    return { success: true };
  }
}
