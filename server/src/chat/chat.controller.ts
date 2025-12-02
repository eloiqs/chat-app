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
  constructor(private readonly chatService: ChatService) { }

  @Get('users')
  getAllUsers(): Shared.User[] {
    return this.chatService.getAllUsers();
  }

  @Get()
  getAllChats(@Headers('x-user-id') userId: string): Shared.Chat[] {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }
    return this.chatService.getAllChats(userId);
  }

  @Get(':id')
  getChatById(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ): Shared.Chat {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const chat = this.chatService.getChatById(id, userId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    return chat;
  }

  @Get(':id/messages')
  getChatMessages(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ): Shared.Message[] {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const messages = this.chatService.getChatMessages(id, userId);
    if (!messages) {
      throw new NotFoundException('Chat not found');
    }
    return messages;
  }

  @Post(':id/messages')
  createMessage(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { content: string },
  ): Shared.Message {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const message = this.chatService.createMessage(id, body.content, userId);
    if (!message) {
      throw new NotFoundException('Chat not found');
    }
    return message;
  }

  @Post(':id/read')
  markChatAsRead(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ): { success: boolean } {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    const success = this.chatService.markChatAsRead(id, userId);
    if (!success) {
      throw new NotFoundException('Chat not found');
    }
    return { success: true };
  }
}
